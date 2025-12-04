use std::sync::{Arc, Mutex};
use std::process::{Child, Command, Stdio};
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tauri::{
    AppHandle, Manager,
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::TrayIconBuilder,
    Emitter,
};

mod commands;
mod database;

use database::PostgresManager;

/// API secrets configuration stored in the app data directory
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Secrets {
    pub openai_api_key: Option<String>,
    pub anthropic_api_key: Option<String>,
    pub gemini_api_key: Option<String>,
    pub xai_api_key: Option<String>,
    pub ollama_base_url: Option<String>,
    pub pinecone_api_key: Option<String>,
    pub pinecone_environment: Option<String>,
    pub pinecone_index_name: Option<String>,
}

/// Load secrets from the app data directory
fn load_secrets(app_data_dir: &PathBuf) -> Secrets {
    let secrets_path = app_data_dir.join("secrets.json");
    
    if secrets_path.exists() {
        match std::fs::read_to_string(&secrets_path) {
            Ok(contents) => {
                match serde_json::from_str::<Secrets>(&contents) {
                    Ok(secrets) => {
                        log::info!("Loaded API secrets from {:?}", secrets_path);
                        return secrets;
                    }
                    Err(e) => {
                        log::warn!("Failed to parse secrets.json: {}", e);
                    }
                }
            }
            Err(e) => {
                log::warn!("Failed to read secrets.json: {}", e);
            }
        }
    } else {
        log::info!("No secrets.json found at {:?}, using defaults", secrets_path);
    }
    
    Secrets::default()
}

/// Save secrets to the app data directory
fn save_secrets(app_data_dir: &PathBuf, secrets: &Secrets) -> Result<(), String> {
    let secrets_path = app_data_dir.join("secrets.json");
    
    // Ensure the directory exists
    std::fs::create_dir_all(app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;
    
    let json = serde_json::to_string_pretty(secrets)
        .map_err(|e| format!("Failed to serialize secrets: {}", e))?;
    
    std::fs::write(&secrets_path, json)
        .map_err(|e| format!("Failed to write secrets.json: {}", e))?;
    
    log::info!("Saved API secrets to {:?}", secrets_path);
    Ok(())
}

// Application state
pub struct AppState {
    pub backend_process: Mutex<Option<Child>>,
    pub backend_port: Mutex<u16>,
    pub postgres_port: Mutex<u16>,
    pub is_backend_ready: Mutex<bool>,
    pub is_postgres_ready: Mutex<bool>,
    pub postgres_manager: Mutex<Option<Arc<PostgresManager>>>,
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

/// Get API secrets (returns masked values for security)
#[tauri::command]
async fn get_secrets(app: AppHandle) -> Result<Secrets, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    
    Ok(load_secrets(&app_data_dir))
}

/// Save API secrets and optionally restart the backend
#[tauri::command]
async fn save_secrets_cmd(app: AppHandle, secrets: Secrets, restart: bool) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    
    save_secrets(&app_data_dir, &secrets)?;
    
    // Optionally restart backend to apply new secrets
    if restart {
        restart_backend(app).await?;
    }
    
    Ok(())
}

/// Get the path to the secrets file
#[tauri::command]
async fn get_secrets_path(app: AppHandle) -> Result<String, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    
    Ok(app_data_dir.join("secrets.json").to_string_lossy().to_string())
}

/// Start PostgreSQL and the backend
async fn start_services_internal(app: &AppHandle) -> Result<(), String> {
    // Start PostgreSQL first
    start_postgres_internal(app)?;
    
    // Then start the backend
    start_backend_internal(app).await
}

/// Start the embedded PostgreSQL instance
fn start_postgres_internal(app: &AppHandle) -> Result<(), String> {
    let state = app.state::<AppState>();
    let port = *state.postgres_port.lock().unwrap();
    
    // Get app data directory
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    
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
        app.path()
            .resource_dir()
            .map_err(|e| e.to_string())?
    };
    
    log::info!("App data directory: {:?}", app_data_dir);
    log::info!("Resource directory: {:?}", resource_dir);
    
    // Create PostgreSQL manager
    let manager = Arc::new(PostgresManager::new(
        app_data_dir.clone(),
        resource_dir,
        port,
    ));
    
    // Initialize and start PostgreSQL
    log::info!("Initializing PostgreSQL database...");
    manager.init_database()?;
    
    log::info!("Starting PostgreSQL server...");
    manager.start()?;
    
    // Store manager in state
    *state.postgres_manager.lock().unwrap() = Some(manager);
    *state.is_postgres_ready.lock().unwrap() = true;
    
    log::info!("PostgreSQL is ready on port {}", port);
    Ok(())
}

async fn start_backend_internal(app: &AppHandle) -> Result<(), String> {
    let state = app.state::<AppState>();
    let backend_port = *state.backend_port.lock().unwrap();
    let postgres_port = *state.postgres_port.lock().unwrap();
    
    // Get app data directory for logs
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    
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
        .env("ASPNETCORE_URLS", format!("http://localhost:{}", backend_port))
        .env("ASPNETCORE_ENVIRONMENT", "Production")
        .env("Logging__LogLevel__Default", "Information")
        .env("ConnectionStrings__DefaultConnection", connection_string)
        .env("SecondBrain__LogPath", log_path.to_string_lossy().to_string())
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
    
    command
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    
    let mut child = command.spawn().map_err(|e| format!("Failed to spawn backend: {}", e))?;
    
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
            resource_dir.join("resources").join("backend").join("secondbrain-api"),
            resource_dir.join("backend").join("secondbrain-api"),
        ]
    };
    
    for path in &possible_paths {
        log::info!("Checking backend path: {:?}", path);
        if path.exists() {
            return Ok(path.clone());
        }
    }
    
    Err(format!("Backend executable not found. Tried: {:?}", possible_paths))
}

async fn wait_for_backend_ready(app: &AppHandle, port: u16) -> Result<(), String> {
    let health_url = format!("http://localhost:{}/api/health", port);
    let client = reqwest::Client::new();
    
    let max_attempts = 60; // Longer timeout for first start with migrations
    let mut attempts = 0;
    
    log::info!("Waiting for backend to be ready...");
    
    loop {
        attempts += 1;
        
        match client.get(&health_url).send().await {
            Ok(response) if response.status().is_success() => {
                log::info!("Backend is ready!");
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
        
        if attempts >= max_attempts {
            return Err("Backend failed to start within timeout".to_string());
        }
        
        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
    }
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
    let show = MenuItem::with_id(app, "show", "Show Second Brain", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
    let separator1 = PredefinedMenuItem::separator(app)?;
    let separator2 = PredefinedMenuItem::separator(app)?;
    let separator3 = PredefinedMenuItem::separator(app)?;
    let settings = MenuItem::with_id(app, "settings", "Settings...", true, None::<&str>)?;
    let restart_backend_item = MenuItem::with_id(app, "restart_backend", "Restart Backend", true, None::<&str>)?;
    let restart_db_item = MenuItem::with_id(app, "restart_database", "Restart Database", true, None::<&str>)?;
    let open_logs = MenuItem::with_id(app, "open_logs", "Open Logs Folder", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Second Brain", true, None::<&str>)?;
    
    Menu::with_items(app, &[
        &show, 
        &hide, 
        &separator1,
        &settings,
        &separator2,
        &restart_backend_item, 
        &restart_db_item, 
        &open_logs,
        &separator3, 
        &quit
    ])
}

fn create_app_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    // App menu (Second Brain)
    let about = MenuItem::with_id(app, "about", "About Second Brain", true, None::<&str>)?;
    let preferences = MenuItem::with_id(app, "preferences", "Preferences...", true, Some("CmdOrCtrl+,"))?;
    let separator = PredefinedMenuItem::separator(app)?;
    let hide = PredefinedMenuItem::hide(app, Some("Hide Second Brain"))?;
    let hide_others = PredefinedMenuItem::hide_others(app, Some("Hide Others"))?;
    let show_all = PredefinedMenuItem::show_all(app, Some("Show All"))?;
    let quit = PredefinedMenuItem::quit(app, Some("Quit Second Brain"))?;
    
    let app_menu = Submenu::with_items(
        app,
        "Second Brain",
        true,
        &[&about, &separator, &preferences, &separator, &hide, &hide_others, &show_all, &separator, &quit]
    )?;
    
    // File menu
    let new_note = MenuItem::with_id(app, "new_note", "New Note", true, Some("CmdOrCtrl+N"))?;
    let new_chat = MenuItem::with_id(app, "new_chat", "New Chat", true, Some("CmdOrCtrl+Shift+N"))?;
    
    let file_menu = Submenu::with_items(
        app,
        "File",
        true,
        &[&new_note, &new_chat]
    )?;
    
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
        &[&undo, &redo, &separator, &cut, &copy, &paste, &separator, &select_all]
    )?;
    
    // View menu
    let reload = MenuItem::with_id(app, "reload", "Reload", true, Some("CmdOrCtrl+R"))?;
    let toggle_fullscreen = PredefinedMenuItem::fullscreen(app, Some("Toggle Full Screen"))?;
    let zoom_in = MenuItem::with_id(app, "zoom_in", "Zoom In", true, Some("CmdOrCtrl+Plus"))?;
    let zoom_out = MenuItem::with_id(app, "zoom_out", "Zoom Out", true, Some("CmdOrCtrl+Minus"))?;
    let actual_size = MenuItem::with_id(app, "actual_size", "Actual Size", true, Some("CmdOrCtrl+0"))?;
    
    let view_menu = Submenu::with_items(
        app,
        "View",
        true,
        &[&reload, &separator, &toggle_fullscreen, &separator, &zoom_in, &zoom_out, &actual_size]
    )?;
    
    // Window menu
    let minimize = PredefinedMenuItem::minimize(app, None)?;
    let close = PredefinedMenuItem::close_window(app, Some("Close"))?;
    
    let window_menu = Submenu::with_items(
        app,
        "Window",
        true,
        &[&minimize, &separator, &close]
    )?;
    
    // Help menu
    let documentation = MenuItem::with_id(app, "documentation", "Documentation", true, None::<&str>)?;
    let report_issue = MenuItem::with_id(app, "report_issue", "Report Issue", true, None::<&str>)?;
    
    let help_menu = Submenu::with_items(
        app,
        "Help",
        true,
        &[&documentation, &separator, &report_issue]
    )?;
    
    Menu::with_items(
        app,
        &[&app_menu, &file_menu, &edit_menu, &view_menu, &window_menu, &help_menu]
    )
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build())
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
                let icon_path = app.path().resource_dir()
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
                .icon_as_template(true)  // Important for macOS menu bar
                .menu(&tray_menu)
                .show_menu_on_left_click(true)  // Show menu on left-click (standard macOS behavior)
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
                        "settings" => {
                            // Show the app and navigate to settings
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                                // Emit event to navigate to settings
                                let _ = app.emit("navigate-to-settings", ());
                            }
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
                                if log_path.exists() {
                                    #[cfg(target_os = "macos")]
                                    {
                                        let _ = std::process::Command::new("open")
                                            .arg(&log_path)
                                            .spawn();
                                    }
                                    #[cfg(target_os = "windows")]
                                    {
                                        let _ = std::process::Command::new("explorer")
                                            .arg(&log_path)
                                            .spawn();
                                    }
                                    #[cfg(target_os = "linux")]
                                    {
                                        let _ = std::process::Command::new("xdg-open")
                                            .arg(&log_path)
                                            .spawn();
                                    }
                                }
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
