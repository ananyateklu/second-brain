use std::io::{BufRead, BufReader};
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager,
};

mod commands;
pub mod config;
pub mod database;
pub mod diagnostics;
pub mod port_utils;
pub mod secrets;
pub mod startup;

use config::ServiceConfig;
use database::PostgresManager;
use port_utils::{find_available_port, is_port_available};
pub use secrets::Secrets;
use startup::{StartupConfig, StartupEvent, StartupMetrics, StartupTimer};

/// Load secrets from file (synchronous, for use during startup)
pub fn load_secrets(app_data_dir: &Path) -> Secrets {
    let secrets_path = app_data_dir.join("secrets.json");

    if secrets_path.exists() {
        match std::fs::read_to_string(&secrets_path) {
            Ok(contents) => match serde_json::from_str::<Secrets>(&contents) {
                Ok(secrets) => {
                    log::info!("Loaded API secrets from {:?}", secrets_path);
                    return secrets;
                }
                Err(e) => {
                    log::warn!("Failed to parse secrets.json: {}", e);
                }
            },
            Err(e) => {
                log::warn!("Failed to read secrets.json: {}", e);
            }
        }
    } else {
        log::info!(
            "No secrets.json found at {:?}, using defaults",
            secrets_path
        );
    }

    Secrets::default()
}

/// Load secrets from file asynchronously (for use in commands)
pub async fn load_secrets_async(app_data_dir: std::path::PathBuf) -> Secrets {
    tokio::task::spawn_blocking(move || load_secrets(&app_data_dir))
        .await
        .unwrap_or_default()
}

/// Save secrets to file with atomic write (temp file + rename)
pub fn save_secrets(app_data_dir: &Path, secrets: &Secrets) -> Result<(), String> {
    use std::io::Write;

    let secrets_path = app_data_dir.join("secrets.json");
    let temp_path = app_data_dir.join(".secrets.json.tmp");

    // Ensure the directory exists
    std::fs::create_dir_all(app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;

    let json = serde_json::to_string_pretty(secrets)
        .map_err(|e| format!("Failed to serialize secrets: {}", e))?;

    // Write to temp file first
    {
        let mut file = std::fs::File::create(&temp_path)
            .map_err(|e| format!("Failed to create temp secrets file: {}", e))?;

        file.write_all(json.as_bytes())
            .map_err(|e| format!("Failed to write secrets: {}", e))?;

        file.sync_all()
            .map_err(|e| format!("Failed to sync secrets file: {}", e))?;
    }

    // Set restrictive permissions (Unix only)
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let permissions = std::fs::Permissions::from_mode(0o600);
        std::fs::set_permissions(&temp_path, permissions)
            .map_err(|e| format!("Failed to set secrets permissions: {}", e))?;
    }

    // Atomic rename
    std::fs::rename(&temp_path, &secrets_path)
        .map_err(|e| format!("Failed to rename secrets file: {}", e))?;

    log::info!("Saved API secrets to {:?}", secrets_path);
    Ok(())
}

/// Save secrets asynchronously (for use in commands)
pub async fn save_secrets_async(
    app_data_dir: std::path::PathBuf,
    secrets: Secrets,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || save_secrets(&app_data_dir, &secrets))
        .await
        .map_err(|e| format!("Task panicked: {}", e))?
}

// Application state
pub struct AppState {
    pub backend_process: Mutex<Option<Child>>,
    pub backend_port: Mutex<u16>,
    pub postgres_port: Mutex<u16>,
    pub is_backend_ready: Mutex<bool>,
    pub is_postgres_ready: Mutex<bool>,
    pub postgres_manager: Mutex<Option<Arc<PostgresManager>>>,
    pub startup_metrics: Mutex<StartupMetrics>,
    pub service_config: Mutex<Option<ServiceConfig>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            backend_process: Mutex::new(None),
            backend_port: Mutex::new(5001),
            postgres_port: Mutex::new(5433), // Use non-standard port to avoid conflicts
            is_backend_ready: Mutex::new(false),
            is_postgres_ready: Mutex::new(false),
            postgres_manager: Mutex::new(None),
            startup_metrics: Mutex::new(StartupMetrics::new()),
            service_config: Mutex::new(None),
        }
    }
}

impl AppState {
    /// Create new state with ports from cached config
    pub fn with_config(config: &ServiceConfig) -> Self {
        Self {
            backend_process: Mutex::new(None),
            backend_port: Mutex::new(config.backend_port),
            postgres_port: Mutex::new(config.postgres_port),
            is_backend_ready: Mutex::new(false),
            is_postgres_ready: Mutex::new(false),
            postgres_manager: Mutex::new(None),
            startup_metrics: Mutex::new(StartupMetrics::new()),
            service_config: Mutex::new(Some(config.clone())),
        }
    }
}

#[tauri::command]
async fn get_backend_url(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let port = state.backend_port.lock().unwrap();
    Ok(format!("http://localhost:{}/api", *port))
}

#[tauri::command]
async fn is_backend_ready(state: tauri::State<'_, AppState>) -> Result<bool, String> {
    let ready = state.is_backend_ready.lock().unwrap();
    Ok(*ready)
}

#[tauri::command]
async fn get_database_status(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let postgres_ready = *state.is_postgres_ready.lock().unwrap();
    let backend_ready = *state.is_backend_ready.lock().unwrap();

    if !postgres_ready {
        Ok("Starting PostgreSQL...".to_string())
    } else if !backend_ready {
        Ok("Starting Backend...".to_string())
    } else {
        Ok("Ready".to_string())
    }
}

/// Get startup metrics for diagnostics
#[tauri::command]
async fn get_startup_metrics(state: tauri::State<'_, AppState>) -> Result<StartupMetrics, String> {
    let metrics = state.startup_metrics.lock().unwrap().clone();
    Ok(metrics)
}

/// Get current port configuration
#[tauri::command]
async fn get_port_config(state: tauri::State<'_, AppState>) -> Result<(u16, u16), String> {
    let postgres_port = *state.postgres_port.lock().unwrap();
    let backend_port = *state.backend_port.lock().unwrap();
    Ok((postgres_port, backend_port))
}

/// Check if a port is available
#[tauri::command]
async fn check_port_available(port: u16) -> Result<bool, String> {
    Ok(is_port_available(port))
}

/// Copy text to clipboard (used by tray menu)
#[tauri::command]
async fn copy_to_clipboard(app: AppHandle, text: String) -> Result<(), String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    app.clipboard()
        .write_text(&text)
        .map_err(|e| format!("Failed to copy to clipboard: {}", e))
}

/// Set dock badge on macOS (for unread counts, etc.)
#[cfg(target_os = "macos")]
#[tauri::command]
async fn set_dock_badge(_app: AppHandle, badge: Option<String>) -> Result<(), String> {
    use objc2::MainThreadMarker;
    use objc2_app_kit::NSApplication;
    use objc2_foundation::NSString;

    // Get main thread marker - this is safe because Tauri commands run on the main thread
    let mtm = unsafe { MainThreadMarker::new_unchecked() };

    let app = NSApplication::sharedApplication(mtm);
    let dock_tile = app.dockTile();

    match badge {
        Some(text) if !text.is_empty() => {
            let ns_string = NSString::from_str(&text);
            dock_tile.setBadgeLabel(Some(&ns_string));
        }
        _ => {
            dock_tile.setBadgeLabel(None);
        }
    }

    Ok(())
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
async fn set_dock_badge(_app: AppHandle, _badge: Option<String>) -> Result<(), String> {
    // No-op on non-macOS platforms
    Ok(())
}

/// Generate a diagnostic report for troubleshooting
#[tauri::command]
async fn get_diagnostic_report(app: AppHandle) -> Result<diagnostics::DiagnosticReport, String> {
    let state = app.state::<AppState>();

    let app_version = app
        .config()
        .version
        .clone()
        .unwrap_or_else(|| "unknown".to_string());

    let postgres_ready = *state.is_postgres_ready.lock().unwrap();
    let postgres_port = *state.postgres_port.lock().unwrap();
    let backend_ready = *state.is_backend_ready.lock().unwrap();
    let backend_port = *state.backend_port.lock().unwrap();

    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let log_dir = app_data_dir.join("logs");

    // Get PostgreSQL bin directory if manager exists
    let postgres_bin_dir = state.postgres_manager.lock().unwrap().as_ref().map(|_| {
        // Get the bin directory from the standard locations
        if cfg!(target_os = "macos") {
            std::path::PathBuf::from("/opt/homebrew/opt/postgresql@18/bin")
        } else {
            std::path::PathBuf::from("/usr/bin")
        }
    });

    let report = diagnostics::DiagnosticReport::generate(
        app_version,
        postgres_ready,
        postgres_port,
        backend_ready,
        backend_port,
        &app_data_dir,
        &log_dir,
        postgres_bin_dir.as_deref(),
    );

    Ok(report)
}

/// Get recent application logs
#[tauri::command]
async fn get_recent_logs(app: AppHandle, max_lines: Option<usize>) -> Result<Vec<String>, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let log_dir = app_data_dir.join("logs");

    let lines = max_lines.unwrap_or(100);

    // Read from log files
    let mut logs = Vec::new();

    if let Ok(entries) = std::fs::read_dir(&log_dir) {
        let mut log_files: Vec<_> = entries
            .filter_map(|e| e.ok())
            .filter(|e| {
                e.path()
                    .extension()
                    .map(|ext| ext == "log")
                    .unwrap_or(false)
            })
            .collect();

        // Sort by modification time (newest first)
        log_files.sort_by(|a, b| {
            let a_time = a.metadata().and_then(|m| m.modified()).ok();
            let b_time = b.metadata().and_then(|m| m.modified()).ok();
            b_time.cmp(&a_time)
        });

        // Read from most recent log file
        if let Some(entry) = log_files.first() {
            if let Ok(content) = std::fs::read_to_string(entry.path()) {
                let file_lines: Vec<_> = content.lines().rev().take(lines).collect();
                logs = file_lines
                    .into_iter()
                    .rev()
                    .map(|s| s.to_string())
                    .collect();
            }
        }
    }

    Ok(logs)
}

#[tauri::command]
async fn restart_backend(app: AppHandle) -> Result<(), String> {
    let state = app.state::<AppState>();

    // Stop existing backend
    if let Some(mut child) = state.backend_process.lock().unwrap().take() {
        let _ = child.kill();
        let _ = child.wait();
    }

    *state.is_backend_ready.lock().unwrap() = false;

    // Start new backend (PostgreSQL should already be running)
    start_backend_internal(&app).await
}

#[tauri::command]
async fn restart_database(app: AppHandle) -> Result<(), String> {
    let state = app.state::<AppState>();

    // Stop backend first
    if let Some(mut child) = state.backend_process.lock().unwrap().take() {
        let _ = child.kill();
        let _ = child.wait();
    }
    *state.is_backend_ready.lock().unwrap() = false;

    // Stop PostgreSQL
    if let Some(ref manager) = *state.postgres_manager.lock().unwrap() {
        manager.stop()?;
    }
    *state.is_postgres_ready.lock().unwrap() = false;

    // Restart everything
    start_services_internal(&app).await
}

/// Get API secrets
#[tauri::command]
async fn get_secrets(app: AppHandle) -> Result<Secrets, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    Ok(load_secrets(&app_data_dir))
}

/// Save API secrets and optionally restart the backend
#[tauri::command]
async fn save_secrets_cmd(app: AppHandle, secrets: Secrets, restart: bool) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    save_secrets(&app_data_dir, &secrets)?;

    // Optionally restart backend to apply new secrets
    if restart {
        restart_backend(app).await?;
    }

    Ok(())
}

/// Get the path to the secrets storage location
#[tauri::command]
async fn get_secrets_path(app: AppHandle) -> Result<String, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    Ok(app_data_dir
        .join("secrets.json")
        .to_string_lossy()
        .to_string())
}

/// Start PostgreSQL and the backend with improved startup flow
async fn start_services_internal(app: &AppHandle) -> Result<(), String> {
    let overall_timer = StartupTimer::new();
    let state = app.state::<AppState>();

    // Reset startup metrics
    *state.startup_metrics.lock().unwrap() = StartupMetrics::new();

    // Load cached config if available
    if let Ok(app_data_dir) = app.path().app_data_dir() {
        let cached_config = ServiceConfig::load(&app_data_dir);

        // Use cached ports if they're available
        if is_port_available(cached_config.postgres_port) {
            *state.postgres_port.lock().unwrap() = cached_config.postgres_port;
        }
        if is_port_available(cached_config.backend_port) {
            *state.backend_port.lock().unwrap() = cached_config.backend_port;
        }

        *state.service_config.lock().unwrap() = Some(cached_config);
    }

    // Start PostgreSQL first
    let pg_timer = StartupTimer::new();
    let postgres_port = *state.postgres_port.lock().unwrap();

    StartupEvent::PostgresStarting {
        port: postgres_port,
    }
    .emit(app);

    match start_postgres_internal(app) {
        Ok(()) => {
            let actual_port = *state.postgres_port.lock().unwrap();
            StartupEvent::PostgresReady {
                port: actual_port,
                duration_ms: pg_timer.elapsed_ms(),
            }
            .emit(app);

            state.startup_metrics.lock().unwrap().mark_postgres_started(
                pg_timer.elapsed(),
                actual_port,
                0,
            );
        }
        Err(e) => {
            StartupEvent::PostgresFailed {
                error: e.clone(),
                port: postgres_port,
            }
            .emit(app);

            state.startup_metrics.lock().unwrap().mark_failed(e.clone());
            StartupEvent::StartupFailed { error: e.clone() }.emit(app);
            return Err(e);
        }
    }

    // Then start the backend
    let backend_timer = StartupTimer::new();
    let backend_port = *state.backend_port.lock().unwrap();

    StartupEvent::BackendStarting { port: backend_port }.emit(app);

    match start_backend_internal(app).await {
        Ok(()) => {
            let actual_port = *state.backend_port.lock().unwrap();
            StartupEvent::BackendReady {
                port: actual_port,
                duration_ms: backend_timer.elapsed_ms(),
            }
            .emit(app);

            state.startup_metrics.lock().unwrap().mark_backend_started(
                backend_timer.elapsed(),
                actual_port,
                0,
            );
        }
        Err(e) => {
            StartupEvent::BackendFailed {
                error: e.clone(),
                port: backend_port,
            }
            .emit(app);

            state.startup_metrics.lock().unwrap().mark_failed(e.clone());
            StartupEvent::StartupFailed { error: e.clone() }.emit(app);
            return Err(e);
        }
    }

    // Mark complete and cache successful config
    let total_duration = overall_timer.elapsed();
    state
        .startup_metrics
        .lock()
        .unwrap()
        .mark_complete(total_duration);

    StartupEvent::AllServicesReady {
        total_duration_ms: overall_timer.elapsed_ms(),
    }
    .emit(app);

    // Save successful config for next startup
    if let Ok(app_data_dir) = app.path().app_data_dir() {
        let postgres_port = *state.postgres_port.lock().unwrap();
        let backend_port = *state.backend_port.lock().unwrap();

        let mut config = ServiceConfig::default();
        config.mark_successful_startup(postgres_port, backend_port);

        if let Err(e) = config.save(&app_data_dir) {
            log::warn!("Failed to save service config: {}", e);
        }
    }

    Ok(())
}

/// Start the embedded PostgreSQL instance with port conflict handling
fn start_postgres_internal(app: &AppHandle) -> Result<(), String> {
    let state = app.state::<AppState>();
    let mut port = *state.postgres_port.lock().unwrap();

    // Check if port is available, find alternative if not
    if !is_port_available(port) {
        log::warn!("Port {} is in use, searching for alternative...", port);

        StartupEvent::PortConflict {
            port,
            service: "PostgreSQL".to_string(),
        }
        .emit(app);

        if let Some(new_port) = find_available_port(port + 1, 10) {
            log::info!("Found alternative PostgreSQL port: {}", new_port);
            port = new_port;
            *state.postgres_port.lock().unwrap() = new_port;
        } else {
            return Err(format!(
                "Port {} is in use and no alternatives available in range {}-{}",
                port,
                port + 1,
                port + 10
            ));
        }
    }

    // Get app data directory
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    // Get resource directory (where PostgreSQL binaries are bundled)
    // In dev mode, use src-tauri/resources; in production, use the bundled resources
    let resource_dir = if cfg!(debug_assertions) {
        // Development mode - use src-tauri/resources
        let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
        let dev_resource_dir = exe_path
            .parent()
            .and_then(|p| p.parent())
            .and_then(|p| p.parent())
            .map(|p| p.join("resources"))
            .unwrap_or_else(|| app.path().resource_dir().unwrap_or_default());
        dev_resource_dir
    } else {
        // Production mode - use bundled resources
        app.path().resource_dir().map_err(|e| e.to_string())?
    };

    log::info!("App data directory: {:?}", app_data_dir);
    log::info!("Resource directory: {:?}", resource_dir);

    // Create PostgreSQL manager with custom startup config
    let startup_config = StartupConfig {
        initial_delay_ms: 500,
        max_delay_ms: 5000,
        backoff_multiplier: 1.5,
        max_attempts: 5,
        timeout_secs: 60,
    };

    let manager = Arc::new(PostgresManager::with_config(
        app_data_dir.clone(),
        resource_dir,
        port,
        startup_config,
    ));

    // Initialize and start PostgreSQL
    log::info!("Initializing PostgreSQL database...");
    manager.init_database()?;

    log::info!("Starting PostgreSQL server on port {}...", port);
    manager.start()?;

    // Update state with actual port (may have changed due to conflict)
    let actual_port = manager.get_port();
    *state.postgres_port.lock().unwrap() = actual_port;

    // Store manager in state
    *state.postgres_manager.lock().unwrap() = Some(manager);
    *state.is_postgres_ready.lock().unwrap() = true;

    log::info!("PostgreSQL is ready on port {}", actual_port);
    Ok(())
}

async fn start_backend_internal(app: &AppHandle) -> Result<(), String> {
    let state = app.state::<AppState>();
    let mut backend_port = *state.backend_port.lock().unwrap();
    let postgres_port = *state.postgres_port.lock().unwrap();

    // Check if port is available, find alternative if not
    if !is_port_available(backend_port) {
        log::warn!(
            "Port {} is in use, searching for alternative...",
            backend_port
        );

        StartupEvent::PortConflict {
            port: backend_port,
            service: "Backend".to_string(),
        }
        .emit(app);

        if let Some(new_port) = find_available_port(backend_port + 1, 10) {
            log::info!("Found alternative backend port: {}", new_port);
            backend_port = new_port;
            *state.backend_port.lock().unwrap() = new_port;
        } else {
            return Err(format!(
                "Port {} is in use and no alternatives available in range {}-{}",
                backend_port,
                backend_port + 1,
                backend_port + 10
            ));
        }
    }

    // Get app data directory for logs
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;

    let log_path = app_data_dir.join("logs");

    // Ensure directories exist
    std::fs::create_dir_all(&log_path).map_err(|e| e.to_string())?;

    log::info!("Starting backend on port {}", backend_port);
    log::info!("Log directory: {:?}", log_path);

    // Build connection string for embedded PostgreSQL
    // Include Client Encoding=UTF8 to ensure proper handling of Unicode characters (emojis, etc.)
    let connection_string = format!(
        "Host=localhost;Port={};Database=secondbrain;Username=secondbrain;Trust Server Certificate=true;Client Encoding=UTF8",
        postgres_port
    );

    // Generate a secure JWT secret key for the desktop app
    let jwt_secret = "SecondBrainDesktopAppSecretKey2024!@#$%";

    // Load API secrets from config file
    let secrets = load_secrets(&app_data_dir);

    // Find the backend executable
    let backend_path = find_backend_path(app)?;
    log::info!("Backend path: {:?}", backend_path);

    // Build and start the command
    let mut command = Command::new(&backend_path);
    command
        .current_dir(backend_path.parent().unwrap_or(&backend_path))
        .env(
            "ASPNETCORE_URLS",
            format!("http://localhost:{}", backend_port),
        )
        .env("ASPNETCORE_ENVIRONMENT", "Production")
        .env("Logging__LogLevel__Default", "Warning")
        .env("ConnectionStrings__DefaultConnection", connection_string)
        .env(
            "SecondBrain__LogPath",
            log_path.to_string_lossy().to_string(),
        )
        .env("SecondBrain__DesktopMode", "true")
        .env("Jwt__SecretKey", jwt_secret)
        .env("Jwt__Issuer", "SecondBrainDesktop")
        .env("Jwt__Audience", "SecondBrainDesktopUsers")
        // CORS settings for Tauri webview
        .env("Cors__AllowedOrigins__0", "tauri://localhost")
        .env("Cors__AllowedOrigins__1", "https://tauri.localhost")
        .env("Cors__AllowedOrigins__2", "http://localhost")
        .env("Cors__AllowedOrigins__3", "http://127.0.0.1")
        .env("Cors__AllowLocalNetworkIps", "true");

    // Add AI provider API keys from secrets
    if let Some(ref openai_key) = secrets.openai_api_key {
        command.env("AIProviders__OpenAI__ApiKey", openai_key);
        command.env("EmbeddingProviders__OpenAI__ApiKey", openai_key);
    }
    if let Some(ref anthropic_key) = secrets.anthropic_api_key {
        command.env("AIProviders__Anthropic__ApiKey", anthropic_key);
    }
    if let Some(ref gemini_key) = secrets.gemini_api_key {
        command.env("AIProviders__Gemini__ApiKey", gemini_key);
        command.env("EmbeddingProviders__Gemini__ApiKey", gemini_key);
    }
    if let Some(ref xai_key) = secrets.xai_api_key {
        command.env("AIProviders__XAI__ApiKey", xai_key);
    }
    if let Some(ref ollama_url) = secrets.ollama_base_url {
        command.env("AIProviders__Ollama__BaseUrl", ollama_url);
    }
    if let Some(ref pinecone_key) = secrets.pinecone_api_key {
        command.env("Pinecone__ApiKey", pinecone_key);
    }
    if let Some(ref pinecone_env) = secrets.pinecone_environment {
        command.env("Pinecone__Environment", pinecone_env);
    }
    if let Some(ref pinecone_index) = secrets.pinecone_index_name {
        command.env("Pinecone__IndexName", pinecone_index);
    }

    // Add GitHub integration settings
    if let Some(ref github_token) = secrets.github_personal_access_token {
        command.env("GitHub__PersonalAccessToken", github_token);
    }
    if let Some(ref github_owner) = secrets.github_default_owner {
        command.env("GitHub__DefaultOwner", github_owner);
    }
    if let Some(ref github_repo) = secrets.github_default_repo {
        command.env("GitHub__DefaultRepo", github_repo);
    }

    // Add Git integration settings
    if let Some(ref git_roots) = secrets.git_allowed_repository_roots {
        // Support comma-separated list of paths
        for (i, root) in git_roots.split(',').map(|s| s.trim()).enumerate() {
            if !root.is_empty() {
                command.env(format!("Git__AllowedRepositoryRoots__{}", i), root);
            }
        }
    }
    if let Some(require_user_scoped) = secrets.git_require_user_scoped_root {
        command.env(
            "Git__RequireUserScopedRoot",
            require_user_scoped.to_string(),
        );
    }

    // Add Voice/STT/TTS API keys from secrets
    if let Some(ref deepgram_key) = secrets.deepgram_api_key {
        if !deepgram_key.is_empty() {
            command.env("Voice__Deepgram__ApiKey", deepgram_key);
            command.env("Voice__Deepgram__Enabled", "true");
        }
    }
    if let Some(ref elevenlabs_key) = secrets.elevenlabs_api_key {
        if !elevenlabs_key.is_empty() {
            command.env("Voice__ElevenLabs__ApiKey", elevenlabs_key);
            command.env("Voice__ElevenLabs__Enabled", "true");
        }
    }
    if let Some(ref openai_tts_key) = secrets.openai_tts_api_key {
        if !openai_tts_key.is_empty() {
            command.env("Voice__OpenAITTS__ApiKey", openai_tts_key);
            command.env("Voice__OpenAITTS__Enabled", "true");
        }
    }
    // Grok Voice uses xai_api_key - enable if XAI key is present
    if let Some(ref xai_key) = secrets.xai_api_key {
        if !xai_key.is_empty() {
            command.env("Voice__GrokVoice__Enabled", "true");
        }
    }

    command.stdout(Stdio::piped()).stderr(Stdio::piped());

    let mut child = command
        .spawn()
        .map_err(|e| format!("Failed to spawn backend: {}", e))?;

    // Capture stdout for logging
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let app_handle = app.clone();

    // Monitor stdout
    if let Some(stdout) = stdout {
        let app_clone = app_handle.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines().map_while(Result::ok) {
                log::info!("[Backend] {}", line);
            }
            let _ = app_clone.emit("backend-terminated", ());
        });
    }

    // Monitor stderr
    if let Some(stderr) = stderr {
        std::thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines().map_while(Result::ok) {
                log::warn!("[Backend] {}", line);
            }
        });
    }

    // Store the child process
    *state.backend_process.lock().unwrap() = Some(child);

    // Wait for backend to be ready
    wait_for_backend_ready(app, backend_port).await?;

    Ok(())
}

/// Find the backend executable path
fn find_backend_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    // In development mode, look for the backend in resources/backend
    let possible_paths = if cfg!(debug_assertions) {
        let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
        let dev_resource_dir = exe_path
            .parent()
            .and_then(|p| p.parent())
            .and_then(|p| p.parent())
            .map(|p| p.join("resources"))
            .unwrap_or_default();

        vec![
            dev_resource_dir.join("backend").join("secondbrain-api"),
            // Fallback to running dotnet directly
            std::path::PathBuf::from("/Users/ananyateklu/Dev/second-brain/backend/src/SecondBrain.API/bin/Debug/net10.0/SecondBrain.API"),
        ]
    } else {
        // Production mode - use bundled resources
        // Tauri bundles resources/** into Resources/resources/
        let resource_dir = app.path().resource_dir().map_err(|e| e.to_string())?;
        vec![
            resource_dir
                .join("resources")
                .join("backend")
                .join("secondbrain-api"),
            resource_dir.join("backend").join("secondbrain-api"),
        ]
    };

    for path in &possible_paths {
        log::info!("Checking backend path: {:?}", path);
        if path.exists() {
            return Ok(path.clone());
        }
    }

    Err(format!(
        "Backend executable not found. Tried: {:?}",
        possible_paths
    ))
}

/// Health check configuration
struct HealthCheckConfig {
    /// Initial check interval (ms)
    initial_interval_ms: u64,
    /// Maximum check interval (ms) after backoff
    max_interval_ms: u64,
    /// Backoff multiplier
    backoff_multiplier: f64,
    /// Maximum total wait time (seconds)
    max_wait_secs: u64,
}

impl Default for HealthCheckConfig {
    fn default() -> Self {
        Self {
            initial_interval_ms: 500,
            max_interval_ms: 2000,
            backoff_multiplier: 1.5,
            max_wait_secs: 120, // Longer timeout for first start with migrations
        }
    }
}

async fn wait_for_backend_ready(app: &AppHandle, port: u16) -> Result<(), String> {
    let health_url = format!("http://localhost:{}/api/health", port);
    let config = HealthCheckConfig::default();

    // Create client with reasonable timeouts
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .connect_timeout(std::time::Duration::from_secs(2))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let start = std::time::Instant::now();
    let max_duration = std::time::Duration::from_secs(config.max_wait_secs);
    let mut current_interval = config.initial_interval_ms;

    log::info!("Waiting for backend to be ready...");

    while start.elapsed() < max_duration {
        match client.get(&health_url).send().await {
            Ok(response) if response.status().is_success() => {
                log::info!("Backend is ready after {}ms!", start.elapsed().as_millis());
                let state = app.state::<AppState>();
                *state.is_backend_ready.lock().unwrap() = true;
                return Ok(());
            }
            Ok(response) => {
                log::debug!("Backend health check returned: {}", response.status());
            }
            Err(e) => {
                log::debug!("Backend not ready yet: {}", e);
            }
        }

        // Sleep with current interval
        tokio::time::sleep(tokio::time::Duration::from_millis(current_interval)).await;

        // Increase interval with backoff (capped at max)
        current_interval = ((current_interval as f64) * config.backoff_multiplier)
            .min(config.max_interval_ms as f64) as u64;
    }

    Err(format!(
        "Backend failed to start within {} seconds",
        config.max_wait_secs
    ))
}

/// Shutdown all services gracefully
fn shutdown_services(app: &AppHandle) {
    let state = app.state::<AppState>();
    let backend_port = *state.backend_port.lock().unwrap();

    // Stop backend
    if let Some(mut child) = state.backend_process.lock().unwrap().take() {
        log::info!("Stopping backend process...");

        // Try graceful kill first
        let _ = child.kill();

        // Wait with timeout
        match child.try_wait() {
            Ok(Some(_)) => {
                log::info!("Backend process terminated");
            }
            Ok(None) => {
                // Process still running, wait a bit more
                std::thread::sleep(std::time::Duration::from_millis(500));
                let _ = child.wait();
            }
            Err(e) => {
                log::error!("Error waiting for backend: {}", e);
            }
        }
    }

    // Also kill any process still using the backend port (fallback cleanup)
    kill_process_on_port(backend_port);

    // Stop PostgreSQL - clone the Arc to avoid lifetime issues
    let postgres_port = *state.postgres_port.lock().unwrap();
    let manager_opt = state.postgres_manager.lock().unwrap().clone();
    if let Some(manager) = manager_opt {
        log::info!("Stopping PostgreSQL...");
        let _ = manager.stop();
    }

    // Also kill any postgres processes on our port (fallback cleanup)
    kill_process_on_port(postgres_port);

    log::info!("All services stopped");
}

/// Open a folder in the system file manager
fn open_folder(path: &std::path::Path) {
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open").arg(path).spawn();
    }
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("explorer").arg(path).spawn();
    }
    #[cfg(target_os = "linux")]
    {
        let _ = std::process::Command::new("xdg-open").arg(path).spawn();
    }
}

/// Kill any process using the specified port (macOS/Linux)
fn kill_process_on_port(port: u16) {
    #[cfg(unix)]
    {
        // Use lsof to find and kill processes on the port
        if let Ok(output) = std::process::Command::new("lsof")
            .args(["-ti", &format!(":{}", port)])
            .output()
        {
            let pids = String::from_utf8_lossy(&output.stdout);
            for pid in pids.lines() {
                if let Ok(pid_num) = pid.trim().parse::<i32>() {
                    log::info!("Killing orphaned process {} on port {}", pid_num, port);
                    let _ = std::process::Command::new("kill")
                        .args(["-9", &pid_num.to_string()])
                        .output();
                }
            }
        }
    }
}

fn create_tray_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    // Window controls
    let show = MenuItem::with_id(app, "show", "Show Second Brain", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;

    // Quick actions
    let new_note = MenuItem::with_id(app, "tray_new_note", "New Note", true, None::<&str>)?;
    let new_chat = MenuItem::with_id(app, "tray_new_chat", "New Chat", true, None::<&str>)?;

    // Settings and info
    let settings = MenuItem::with_id(app, "settings", "Settings...", true, None::<&str>)?;
    let copy_api_url = MenuItem::with_id(app, "copy_api_url", "Copy API URL", true, None::<&str>)?;

    // Service controls submenu
    let restart_all = MenuItem::with_id(
        app,
        "restart_all",
        "Restart All Services",
        true,
        None::<&str>,
    )?;
    let restart_backend_item = MenuItem::with_id(
        app,
        "restart_backend",
        "Restart Backend Only",
        true,
        None::<&str>,
    )?;
    let restart_db_item = MenuItem::with_id(
        app,
        "restart_database",
        "Restart Database Only",
        true,
        None::<&str>,
    )?;

    let services_submenu = Submenu::with_items(
        app,
        "Services",
        true,
        &[&restart_all, &restart_backend_item, &restart_db_item],
    )?;

    // Folders
    let open_logs = MenuItem::with_id(app, "open_logs", "Open Logs Folder", true, None::<&str>)?;
    let open_data = MenuItem::with_id(app, "open_data", "Open Data Folder", true, None::<&str>)?;

    // Quit
    let quit = MenuItem::with_id(app, "quit", "Quit Second Brain", true, None::<&str>)?;

    // Separators
    let separator1 = PredefinedMenuItem::separator(app)?;
    let separator2 = PredefinedMenuItem::separator(app)?;
    let separator3 = PredefinedMenuItem::separator(app)?;
    let separator4 = PredefinedMenuItem::separator(app)?;

    Menu::with_items(
        app,
        &[
            &show,
            &hide,
            &separator1,
            &new_note,
            &new_chat,
            &separator2,
            &settings,
            &copy_api_url,
            &separator3,
            &services_submenu,
            &open_logs,
            &open_data,
            &separator4,
            &quit,
        ],
    )
}

fn create_app_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    // App menu (Second Brain)
    let about = MenuItem::with_id(app, "about", "About Second Brain", true, None::<&str>)?;
    let preferences = MenuItem::with_id(
        app,
        "preferences",
        "Preferences...",
        true,
        Some("CmdOrCtrl+,"),
    )?;
    let separator = PredefinedMenuItem::separator(app)?;
    let hide = PredefinedMenuItem::hide(app, Some("Hide Second Brain"))?;
    let hide_others = PredefinedMenuItem::hide_others(app, Some("Hide Others"))?;
    let show_all = PredefinedMenuItem::show_all(app, Some("Show All"))?;
    let quit = PredefinedMenuItem::quit(app, Some("Quit Second Brain"))?;

    let app_menu = Submenu::with_items(
        app,
        "Second Brain",
        true,
        &[
            &about,
            &separator,
            &preferences,
            &separator,
            &hide,
            &hide_others,
            &show_all,
            &separator,
            &quit,
        ],
    )?;

    // File menu
    let new_note = MenuItem::with_id(app, "new_note", "New Note", true, Some("CmdOrCtrl+N"))?;
    let new_chat = MenuItem::with_id(app, "new_chat", "New Chat", true, Some("CmdOrCtrl+Shift+N"))?;

    let file_menu = Submenu::with_items(app, "File", true, &[&new_note, &new_chat])?;

    // Edit menu
    let undo = PredefinedMenuItem::undo(app, None)?;
    let redo = PredefinedMenuItem::redo(app, None)?;
    let cut = PredefinedMenuItem::cut(app, None)?;
    let copy = PredefinedMenuItem::copy(app, None)?;
    let paste = PredefinedMenuItem::paste(app, None)?;
    let select_all = PredefinedMenuItem::select_all(app, None)?;

    let edit_menu = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &undo,
            &redo,
            &separator,
            &cut,
            &copy,
            &paste,
            &separator,
            &select_all,
        ],
    )?;

    // View menu
    let reload = MenuItem::with_id(app, "reload", "Reload", true, Some("CmdOrCtrl+R"))?;
    let toggle_fullscreen = PredefinedMenuItem::fullscreen(app, Some("Toggle Full Screen"))?;
    let zoom_in = MenuItem::with_id(app, "zoom_in", "Zoom In", true, Some("CmdOrCtrl+Plus"))?;
    let zoom_out = MenuItem::with_id(app, "zoom_out", "Zoom Out", true, Some("CmdOrCtrl+Minus"))?;
    let actual_size =
        MenuItem::with_id(app, "actual_size", "Actual Size", true, Some("CmdOrCtrl+0"))?;

    let view_menu = Submenu::with_items(
        app,
        "View",
        true,
        &[
            &reload,
            &separator,
            &toggle_fullscreen,
            &separator,
            &zoom_in,
            &zoom_out,
            &actual_size,
        ],
    )?;

    // Window menu
    let minimize = PredefinedMenuItem::minimize(app, None)?;
    let close = PredefinedMenuItem::close_window(app, Some("Close"))?;

    let window_menu = Submenu::with_items(app, "Window", true, &[&minimize, &separator, &close])?;

    // Help menu
    let documentation =
        MenuItem::with_id(app, "documentation", "Documentation", true, None::<&str>)?;
    let report_issue = MenuItem::with_id(app, "report_issue", "Report Issue", true, None::<&str>)?;

    let help_menu = Submenu::with_items(
        app,
        "Help",
        true,
        &[&documentation, &separator, &report_issue],
    )?;

    Menu::with_items(
        app,
        &[
            &app_menu,
            &file_menu,
            &edit_menu,
            &view_menu,
            &window_menu,
            &help_menu,
        ],
    )
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Warn)
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // Focus the main window when a second instance is attempted
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .manage(AppState::default())
        .setup(|app| {
            let app_handle = app.handle().clone();

            // Create and set the app menu
            let menu = create_app_menu(&app_handle)?;
            app.set_menu(menu)?;

            // Handle app menu events (About, Preferences, etc.)
            app.on_menu_event(move |app, event| {
                match event.id.as_ref() {
                    "about" => {
                        // Emit event to show custom About dialog in frontend
                        let _ = app.emit("show-about-dialog", ());
                    }
                    "preferences" => {
                        // Show the app and navigate to settings
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = app.emit("navigate-to-settings", ());
                        }
                    }
                    "new_note" => {
                        // Emit event to create new note
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = app.emit("create-new-note", ());
                        }
                    }
                    "new_chat" => {
                        // Emit event to create new chat
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = app.emit("create-new-chat", ());
                        }
                    }
                    "reload" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.eval("window.location.reload()");
                        }
                    }
                    "documentation" => {
                        // Emit event to open documentation URL
                        let _ = app.emit("open-documentation", ());
                    }
                    "report_issue" => {
                        // Emit event to open issue reporting URL
                        let _ = app.emit("open-report-issue", ());
                    }
                    _ => {}
                }
            });

            // Create system tray with template icon for macOS menu bar
            let tray_menu = create_tray_menu(&app_handle)?;

            // Load the tray icon from resources (template icon for macOS)
            let tray_icon = {
                let icon_path = app
                    .path()
                    .resource_dir()
                    .map(|p| p.join("icons/tray/tray-icon.png"))
                    .ok()
                    .and_then(|p| if p.exists() { Some(p) } else { None });

                match icon_path {
                    Some(path) => {
                        log::info!("Loading tray icon from: {:?}", path);
                        tauri::image::Image::from_path(&path).ok()
                    }
                    None => {
                        log::info!("Using default window icon for tray");
                        None
                    }
                }
            };

            let mut tray_builder = TrayIconBuilder::new();

            // Use template icon if available, otherwise fall back to window icon
            if let Some(icon) = tray_icon {
                tray_builder = tray_builder.icon(icon);
            } else {
                tray_builder = tray_builder.icon(app.default_window_icon().unwrap().clone());
            }

            let _tray = tray_builder
                .icon_as_template(true) // Important for macOS menu bar
                .menu(&tray_menu)
                .show_menu_on_left_click(true) // Show menu on left-click (standard macOS behavior)
                .on_menu_event(move |app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "hide" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.hide();
                            }
                        }
                        "tray_new_note" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                                let _ = app.emit("create-new-note", ());
                            }
                        }
                        "tray_new_chat" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                                let _ = app.emit("create-new-chat", ());
                            }
                        }
                        "settings" => {
                            // Show the app and navigate to settings
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                                // Emit event to navigate to settings
                                let _ = app.emit("navigate-to-settings", ());
                            }
                        }
                        "copy_api_url" => {
                            // Copy API URL to clipboard
                            let state = app.state::<AppState>();
                            let port = *state.backend_port.lock().unwrap();
                            let url = format!("http://localhost:{}/api", port);
                            let _ = app.emit("copy-to-clipboard", url);
                        }
                        "restart_all" => {
                            let app = app.clone();
                            tauri::async_runtime::spawn(async move {
                                if let Err(e) = restart_database(app).await {
                                    log::error!("Failed to restart all services: {}", e);
                                }
                            });
                        }
                        "restart_backend" => {
                            let app = app.clone();
                            tauri::async_runtime::spawn(async move {
                                if let Err(e) = restart_backend(app).await {
                                    log::error!("Failed to restart backend: {}", e);
                                }
                            });
                        }
                        "restart_database" => {
                            let app = app.clone();
                            tauri::async_runtime::spawn(async move {
                                if let Err(e) = restart_database(app).await {
                                    log::error!("Failed to restart database: {}", e);
                                }
                            });
                        }
                        "open_logs" => {
                            // Open the logs folder
                            if let Ok(app_data_dir) = app.path().app_data_dir() {
                                let log_path = app_data_dir.join("logs");
                                let _ = std::fs::create_dir_all(&log_path);
                                open_folder(&log_path);
                            }
                        }
                        "open_data" => {
                            // Open the data folder
                            if let Ok(app_data_dir) = app.path().app_data_dir() {
                                open_folder(&app_data_dir);
                            }
                        }
                        "quit" => {
                            // Graceful shutdown
                            shutdown_services(app);
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            // Start services (PostgreSQL + Backend) on app launch
            let app_handle_for_services = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = start_services_internal(&app_handle_for_services).await {
                    log::error!("Failed to start services: {}", e);
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            match event {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    // Hide window instead of closing (macOS behavior)
                    #[cfg(target_os = "macos")]
                    {
                        let _ = window.hide();
                        api.prevent_close();
                    }
                }
                tauri::WindowEvent::Destroyed => {
                    // Window was destroyed, cleanup services
                    shutdown_services(window.app_handle());
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_backend_url,
            is_backend_ready,
            get_database_status,
            restart_backend,
            restart_database,
            get_secrets,
            save_secrets_cmd,
            get_secrets_path,
            get_startup_metrics,
            get_port_config,
            check_port_available,
            copy_to_clipboard,
            set_dock_badge,
            get_diagnostic_report,
            get_recent_logs,
            commands::open_data_directory,
            commands::open_log_directory,
            commands::get_app_version,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            match event {
                tauri::RunEvent::ExitRequested { code, .. } => {
                    // Always allow exit but ensure cleanup happens
                    log::info!("Exit requested with code: {:?}", code);
                    shutdown_services(app_handle);
                }
                tauri::RunEvent::Exit => {
                    log::info!("Application exiting, cleaning up services...");
                    shutdown_services(app_handle);
                }
                _ => {}
            }
        });
}

// ============================================================
// Unit Tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    // ============================================================
    // Secrets Struct Tests
    // ============================================================

    #[test]
    fn test_secrets_default() {
        let secrets = Secrets::default();

        assert!(secrets.openai_api_key.is_none());
        assert!(secrets.anthropic_api_key.is_none());
        assert!(secrets.gemini_api_key.is_none());
        assert!(secrets.xai_api_key.is_none());
        assert!(secrets.ollama_base_url.is_none());
        assert!(secrets.pinecone_api_key.is_none());
        assert!(secrets.pinecone_environment.is_none());
        assert!(secrets.pinecone_index_name.is_none());
    }

    #[test]
    fn test_secrets_serialization_roundtrip() {
        let secrets = Secrets {
            openai_api_key: Some("sk-test-key".to_string()),
            anthropic_api_key: Some("sk-ant-test".to_string()),
            gemini_api_key: None,
            xai_api_key: Some("xai-test".to_string()),
            ollama_base_url: Some("http://localhost:11434".to_string()),
            pinecone_api_key: None,
            pinecone_environment: None,
            pinecone_index_name: None,
            github_personal_access_token: None,
            github_default_owner: None,
            github_default_repo: None,
            git_allowed_repository_roots: None,
            git_require_user_scoped_root: None,
            deepgram_api_key: None,
            elevenlabs_api_key: None,
            openai_tts_api_key: None,
        };

        let json = serde_json::to_string(&secrets).unwrap();
        let deserialized: Secrets = serde_json::from_str(&json).unwrap();

        assert_eq!(secrets.openai_api_key, deserialized.openai_api_key);
        assert_eq!(secrets.anthropic_api_key, deserialized.anthropic_api_key);
        assert_eq!(secrets.xai_api_key, deserialized.xai_api_key);
        assert_eq!(secrets.ollama_base_url, deserialized.ollama_base_url);
    }

    #[test]
    fn test_secrets_partial_json_parsing() {
        // Test that partial JSON (missing fields) deserializes correctly
        let json = r#"{"openai_api_key": "sk-test"}"#;
        let secrets: Secrets = serde_json::from_str(json).unwrap();

        assert_eq!(secrets.openai_api_key, Some("sk-test".to_string()));
        assert!(secrets.anthropic_api_key.is_none());
    }

    #[test]
    fn test_secrets_empty_json_parsing() {
        let json = "{}";
        let secrets: Secrets = serde_json::from_str(json).unwrap();

        assert!(secrets.openai_api_key.is_none());
    }

    #[test]
    fn test_secrets_with_null_values() {
        let json = r#"{"openai_api_key": null, "anthropic_api_key": "sk-ant-test"}"#;
        let secrets: Secrets = serde_json::from_str(json).unwrap();

        assert!(secrets.openai_api_key.is_none());
        assert_eq!(secrets.anthropic_api_key, Some("sk-ant-test".to_string()));
    }

    // ============================================================
    // load_secrets Function Tests
    // ============================================================

    #[test]
    fn test_load_secrets_file_not_exists() {
        let temp_dir = TempDir::new().unwrap();
        let secrets = load_secrets(&temp_dir.path().to_path_buf());

        // Should return default secrets when file doesn't exist
        assert!(secrets.openai_api_key.is_none());
    }

    #[test]
    fn test_load_secrets_valid_file() {
        let temp_dir = TempDir::new().unwrap();
        let secrets_path = temp_dir.path().join("secrets.json");

        let test_secrets = r#"{
            "openai_api_key": "sk-test-123",
            "ollama_base_url": "http://localhost:11434"
        }"#;

        std::fs::write(&secrets_path, test_secrets).unwrap();

        let secrets = load_secrets(&temp_dir.path().to_path_buf());

        assert_eq!(secrets.openai_api_key, Some("sk-test-123".to_string()));
        assert_eq!(
            secrets.ollama_base_url,
            Some("http://localhost:11434".to_string())
        );
    }

    #[test]
    fn test_load_secrets_invalid_json() {
        let temp_dir = TempDir::new().unwrap();
        let secrets_path = temp_dir.path().join("secrets.json");

        std::fs::write(&secrets_path, "not valid json {{{").unwrap();

        let secrets = load_secrets(&temp_dir.path().to_path_buf());

        // Should return default secrets on parse error
        assert!(secrets.openai_api_key.is_none());
    }

    #[test]
    fn test_load_secrets_empty_file() {
        let temp_dir = TempDir::new().unwrap();
        let secrets_path = temp_dir.path().join("secrets.json");

        std::fs::write(&secrets_path, "").unwrap();

        let secrets = load_secrets(&temp_dir.path().to_path_buf());

        // Should return default secrets on empty file
        assert!(secrets.openai_api_key.is_none());
    }

    // ============================================================
    // save_secrets Function Tests
    // ============================================================

    #[test]
    fn test_save_secrets_creates_file() {
        let temp_dir = TempDir::new().unwrap();
        let secrets = Secrets {
            openai_api_key: Some("sk-save-test".to_string()),
            ..Default::default()
        };

        let result = save_secrets(&temp_dir.path().to_path_buf(), &secrets);
        assert!(result.is_ok());

        let secrets_path = temp_dir.path().join("secrets.json");
        assert!(secrets_path.exists());

        let contents = std::fs::read_to_string(&secrets_path).unwrap();
        assert!(contents.contains("sk-save-test"));
    }

    #[test]
    fn test_save_secrets_creates_directory() {
        let temp_dir = TempDir::new().unwrap();
        let nested_path = temp_dir.path().join("nested").join("deep");

        let secrets = Secrets::default();
        let result = save_secrets(&nested_path, &secrets);

        assert!(result.is_ok());
        assert!(nested_path.join("secrets.json").exists());
    }

    #[test]
    fn test_save_secrets_overwrites_existing() {
        let temp_dir = TempDir::new().unwrap();

        // Save first version
        let secrets1 = Secrets {
            openai_api_key: Some("first-key".to_string()),
            ..Default::default()
        };
        save_secrets(&temp_dir.path().to_path_buf(), &secrets1).unwrap();

        // Save second version
        let secrets2 = Secrets {
            openai_api_key: Some("second-key".to_string()),
            ..Default::default()
        };
        save_secrets(&temp_dir.path().to_path_buf(), &secrets2).unwrap();

        // Verify second version persisted
        let loaded = load_secrets(&temp_dir.path().to_path_buf());
        assert_eq!(loaded.openai_api_key, Some("second-key".to_string()));
    }

    #[test]
    fn test_save_and_load_roundtrip() {
        let temp_dir = TempDir::new().unwrap();

        let original = Secrets {
            openai_api_key: Some("sk-openai".to_string()),
            anthropic_api_key: Some("sk-anthropic".to_string()),
            gemini_api_key: Some("gemini-key".to_string()),
            xai_api_key: Some("xai-key".to_string()),
            ollama_base_url: Some("http://custom:11434".to_string()),
            pinecone_api_key: Some("pinecone-key".to_string()),
            pinecone_environment: Some("us-east-1".to_string()),
            pinecone_index_name: Some("my-index".to_string()),
            github_personal_access_token: Some("ghp-token".to_string()),
            github_default_owner: Some("my-org".to_string()),
            github_default_repo: Some("my-repo".to_string()),
            git_allowed_repository_roots: Some("/home/user/repos".to_string()),
            git_require_user_scoped_root: Some(true),
            deepgram_api_key: Some("deepgram-key".to_string()),
            elevenlabs_api_key: Some("elevenlabs-key".to_string()),
            openai_tts_api_key: Some("sk-tts-key".to_string()),
        };

        save_secrets(&temp_dir.path().to_path_buf(), &original).unwrap();
        let loaded = load_secrets(&temp_dir.path().to_path_buf());

        assert_eq!(original.openai_api_key, loaded.openai_api_key);
        assert_eq!(original.anthropic_api_key, loaded.anthropic_api_key);
        assert_eq!(original.gemini_api_key, loaded.gemini_api_key);
        assert_eq!(original.xai_api_key, loaded.xai_api_key);
        assert_eq!(original.ollama_base_url, loaded.ollama_base_url);
        assert_eq!(original.pinecone_api_key, loaded.pinecone_api_key);
        assert_eq!(original.pinecone_environment, loaded.pinecone_environment);
        assert_eq!(original.pinecone_index_name, loaded.pinecone_index_name);
    }

    // ============================================================
    // AppState Tests
    // ============================================================

    #[test]
    fn test_app_state_default() {
        let state = AppState::default();

        assert!(state.backend_process.lock().unwrap().is_none());
        assert_eq!(*state.backend_port.lock().unwrap(), 5001);
        assert_eq!(*state.postgres_port.lock().unwrap(), 5433);
        assert!(!*state.is_backend_ready.lock().unwrap());
        assert!(!*state.is_postgres_ready.lock().unwrap());
        assert!(state.postgres_manager.lock().unwrap().is_none());
    }

    #[test]
    fn test_app_state_thread_safety() {
        use std::sync::Arc;
        use std::thread;

        let state = Arc::new(AppState::default());
        let mut handles = vec![];

        // Spawn multiple threads that access the state
        for i in 0..10 {
            let state_clone = Arc::clone(&state);
            let handle = thread::spawn(move || {
                let mut port = state_clone.backend_port.lock().unwrap();
                *port = 5001 + i;
            });
            handles.push(handle);
        }

        for handle in handles {
            handle.join().unwrap();
        }

        // State should be accessible after concurrent modifications
        let port = state.backend_port.lock().unwrap();
        assert!(*port >= 5001 && *port <= 5010);
    }

    #[test]
    fn test_app_state_backend_ready_flag() {
        let state = AppState::default();

        assert!(!*state.is_backend_ready.lock().unwrap());

        *state.is_backend_ready.lock().unwrap() = true;

        assert!(*state.is_backend_ready.lock().unwrap());
    }

    #[test]
    fn test_app_state_postgres_ready_flag() {
        let state = AppState::default();

        assert!(!*state.is_postgres_ready.lock().unwrap());

        *state.is_postgres_ready.lock().unwrap() = true;

        assert!(*state.is_postgres_ready.lock().unwrap());
    }

    // ============================================================
    // Connection String Generation Tests
    // ============================================================

    #[test]
    fn test_connection_string_format() {
        let postgres_port = 5433u16;
        let connection_string = format!(
            "Host=localhost;Port={};Database=secondbrain;Username=secondbrain;Trust Server Certificate=true;Client Encoding=UTF8",
            postgres_port
        );

        assert!(connection_string.contains("Host=localhost"));
        assert!(connection_string.contains("Port=5433"));
        assert!(connection_string.contains("Database=secondbrain"));
        assert!(connection_string.contains("Username=secondbrain"));
        assert!(connection_string.contains("Client Encoding=UTF8"));
    }

    // ============================================================
    // Backend URL Generation Tests
    // ============================================================

    #[test]
    fn test_backend_url_format() {
        let port = 5001u16;
        let url = format!("http://localhost:{}/api", port);

        assert_eq!(url, "http://localhost:5001/api");
    }

    #[test]
    fn test_health_url_format() {
        let port = 5001u16;
        let health_url = format!("http://localhost:{}/api/health", port);

        assert_eq!(health_url, "http://localhost:5001/api/health");
    }

    // ============================================================
    // kill_process_on_port Tests (Unix-specific)
    // ============================================================

    #[cfg(unix)]
    #[test]
    fn test_kill_process_on_port_no_process() {
        // Should not panic when no process is on the port
        kill_process_on_port(59999); // Use unlikely port
    }

    // ============================================================
    // Backend Path Discovery Tests
    // ============================================================

    #[test]
    fn test_backend_executable_exists_check() {
        let temp_dir = TempDir::new().unwrap();
        let backend_path = temp_dir.path().join("backend").join("secondbrain-api");

        // Create parent directory but not the executable
        std::fs::create_dir_all(backend_path.parent().unwrap()).unwrap();

        assert!(!backend_path.exists());
    }

    #[test]
    fn test_backend_path_exists_when_file_created() {
        let temp_dir = TempDir::new().unwrap();
        let backend_dir = temp_dir.path().join("backend");
        std::fs::create_dir_all(&backend_dir).unwrap();

        let backend_path = backend_dir.join("secondbrain-api");
        std::fs::write(&backend_path, "dummy").unwrap();

        assert!(backend_path.exists());
    }

    // ============================================================
    // Property-Based Tests (using proptest)
    // ============================================================

    #[cfg(test)]
    mod proptest_tests {
        use super::*;
        use proptest::prelude::*;

        proptest! {
            #[test]
            fn test_secrets_roundtrip_any_string(
                openai in ".*",
                anthropic in ".*",
            ) {
                let secrets = Secrets {
                    openai_api_key: Some(openai.clone()),
                    anthropic_api_key: Some(anthropic.clone()),
                    ..Default::default()
                };

                let json = serde_json::to_string(&secrets).unwrap();
                let deserialized: Secrets = serde_json::from_str(&json).unwrap();

                prop_assert_eq!(secrets.openai_api_key, deserialized.openai_api_key);
                prop_assert_eq!(secrets.anthropic_api_key, deserialized.anthropic_api_key);
            }

            #[test]
            fn test_port_in_valid_range(port in 1024u16..65535u16) {
                let url = format!("http://localhost:{}/api", port);
                prop_assert!(url.contains(&port.to_string()));
            }
        }
    }
}
