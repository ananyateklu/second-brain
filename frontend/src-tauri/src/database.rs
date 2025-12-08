use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::Duration;

use crate::port_utils::{find_available_port, validate_port, PortStatus};
use crate::startup::{ExponentialBackoff, StartupConfig, StartupTimer};

/// Error types for PostgreSQL operations
#[derive(Debug)]
pub enum PostgresError {
    NotInitialized,
    BinaryNotFound(String),
    InitFailed(String),
    StartFailed(String),
    PortConflict { port: u16, message: String },
    Timeout(String),
    ConfigError(String),
}

impl std::fmt::Display for PostgresError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PostgresError::NotInitialized => {
                write!(f, "Database not initialized. Call init_database() first.")
            }
            PostgresError::BinaryNotFound(path) => {
                write!(f, "PostgreSQL binary not found at {}. Please install PostgreSQL 18: brew install postgresql@18", path)
            }
            PostgresError::InitFailed(msg) => write!(f, "Database initialization failed: {}", msg),
            PostgresError::StartFailed(msg) => write!(f, "Failed to start PostgreSQL: {}", msg),
            PostgresError::PortConflict { port, message } => {
                write!(f, "Port {} conflict: {}", port, message)
            }
            PostgresError::Timeout(msg) => write!(f, "Timeout: {}", msg),
            PostgresError::ConfigError(msg) => write!(f, "Configuration error: {}", msg),
        }
    }
}

impl std::error::Error for PostgresError {}

impl From<PostgresError> for String {
    fn from(err: PostgresError) -> String {
        err.to_string()
    }
}

/// Manages an embedded PostgreSQL instance for the desktop app
pub struct PostgresManager {
    process: Mutex<Option<Child>>,
    data_dir: PathBuf,
    bin_dir: PathBuf,
    port: Mutex<u16>,
    initialized: Mutex<bool>,
    startup_config: StartupConfig,
}

impl PostgresManager {
    /// Create a new PostgreSQL manager
    /// In development mode, tries to use system PostgreSQL if bundled binaries don't work
    pub fn new(app_data_dir: PathBuf, resource_dir: PathBuf, port: u16) -> Self {
        Self::with_config(app_data_dir, resource_dir, port, StartupConfig::default())
    }

    /// Create a new PostgreSQL manager with custom startup config
    pub fn with_config(
        app_data_dir: PathBuf,
        resource_dir: PathBuf,
        port: u16,
        startup_config: StartupConfig,
    ) -> Self {
        // Try bundled PostgreSQL first, then fall back to system installations
        let bin_dir = Self::find_postgres_bin_dir(&resource_dir);

        log::info!("Using PostgreSQL bin directory: {:?}", bin_dir);

        Self {
            process: Mutex::new(None),
            data_dir: app_data_dir.join("postgresql"),
            bin_dir,
            port: Mutex::new(port),
            initialized: Mutex::new(false),
            startup_config,
        }
    }

    /// Check if the configured port is available, find alternative if not
    pub fn ensure_port_available(&self) -> Result<u16, PostgresError> {
        let current_port = *self.port.lock().unwrap();

        match validate_port(current_port) {
            PortStatus::Available => {
                log::info!("Port {} is available for PostgreSQL", current_port);
                Ok(current_port)
            }
            PortStatus::InUse { process } => {
                let process_info = process
                    .map(|p| format!(" (PID: {}, name: {})", p.pid, p.name.unwrap_or_default()))
                    .unwrap_or_default();

                log::warn!(
                    "Port {} is in use{}, searching for alternative...",
                    current_port,
                    process_info
                );

                // Try to find an alternative port
                if let Some(new_port) = find_available_port(current_port + 1, 10) {
                    log::info!("Found alternative port: {}", new_port);
                    *self.port.lock().unwrap() = new_port;
                    Ok(new_port)
                } else {
                    Err(PostgresError::PortConflict {
                        port: current_port,
                        message: format!(
                            "Port {} is in use{} and no alternatives available in range {}-{}",
                            current_port,
                            process_info,
                            current_port + 1,
                            current_port + 10
                        ),
                    })
                }
            }
            PortStatus::Reserved => Err(PostgresError::PortConflict {
                port: current_port,
                message: format!(
                    "Port {} is reserved (ports < 1024 require root)",
                    current_port
                ),
            }),
            PortStatus::Invalid => Err(PostgresError::PortConflict {
                port: current_port,
                message: "Invalid port number".to_string(),
            }),
        }
    }

    /// Update the port (useful when resolving conflicts)
    pub fn set_port(&self, port: u16) {
        *self.port.lock().unwrap() = port;
    }

    /// Find PostgreSQL 18 bin directory from system installations
    /// Requires PostgreSQL 18 with pgvector extension
    fn find_postgres_bin_dir(_resource_dir: &PathBuf) -> PathBuf {
        let possible_paths = vec![
            // Homebrew PostgreSQL 18 (Apple Silicon)
            PathBuf::from("/opt/homebrew/opt/postgresql@18/bin"),
            // Homebrew PostgreSQL 18 (Intel)
            PathBuf::from("/usr/local/opt/postgresql@18/bin"),
        ];

        for path in &possible_paths {
            let initdb = path.join("initdb");
            let postgres = path.join("postgres");

            if initdb.exists() && postgres.exists() {
                log::info!("Found PostgreSQL 18 at {:?}", path);
                return path.clone();
            }
        }

        // Return the first path as fallback (will fail later with helpful error)
        log::warn!("PostgreSQL 18 not found. Please install: brew install postgresql@18 pgvector");
        possible_paths
            .first()
            .cloned()
            .unwrap_or_else(|| PathBuf::from("/opt/homebrew/opt/postgresql@18/bin"))
    }

    /// Initialize the database directory if it doesn't exist
    pub fn init_database(&self) -> Result<(), String> {
        if self.data_dir.exists() && self.data_dir.join("PG_VERSION").exists() {
            log::info!("PostgreSQL data directory already exists");
            *self.initialized.lock().unwrap() = true;
            return Ok(());
        }

        log::info!("Initializing PostgreSQL database at {:?}", self.data_dir);

        // Create data directory
        std::fs::create_dir_all(&self.data_dir)
            .map_err(|e| format!("Failed to create data directory: {}", e))?;

        // Get initdb path
        let initdb_path = self.bin_dir.join("initdb");

        if !initdb_path.exists() {
            return Err(format!("initdb not found at {:?}. Please install PostgreSQL 18: brew install postgresql@18", initdb_path));
        }

        log::info!("Running initdb from {:?}", initdb_path);

        // Initialize PostgreSQL database
        // Use C.UTF-8 locale to support Unicode characters (emojis, etc.)
        // while maintaining C collation for performance
        let output = Command::new(&initdb_path)
            .arg("-D")
            .arg(&self.data_dir)
            .arg("-U")
            .arg("secondbrain")
            .arg("--encoding=UTF8")
            .arg("--locale=C")
            .arg("--lc-ctype=C.UTF-8")
            .arg("--auth=trust")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .map_err(|e| format!("Failed to run initdb: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let stdout = String::from_utf8_lossy(&output.stdout);
            return Err(format!(
                "initdb failed.\nstdout: {}\nstderr: {}",
                stdout, stderr
            ));
        }

        log::info!("PostgreSQL database initialized successfully");

        // Configure PostgreSQL for localhost-only connections
        self.configure_postgresql()?;

        *self.initialized.lock().unwrap() = true;
        Ok(())
    }

    /// Configure PostgreSQL settings
    fn configure_postgresql(&self) -> Result<(), String> {
        let conf_file = self.data_dir.join("postgresql.conf");
        let hba_file = self.data_dir.join("pg_hba.conf");
        let port = *self.port.lock().unwrap();

        // Update postgresql.conf
        // Use UTF-8 compatible locale settings to support Unicode characters (emojis, etc.)
        let conf_content = format!(
            r#"# Second Brain PostgreSQL Configuration
listen_addresses = 'localhost'
port = {}
max_connections = 20
shared_buffers = 128MB
work_mem = 4MB
maintenance_work_mem = 64MB
effective_cache_size = 256MB
log_destination = 'stderr'
logging_collector = off
log_line_prefix = '%t [%p] '
log_timezone = 'UTC'
datestyle = 'iso, mdy'
timezone = 'UTC'
lc_messages = 'C'
lc_monetary = 'C'
lc_numeric = 'C'
lc_time = 'C'
client_encoding = 'UTF8'
default_text_search_config = 'pg_catalog.english'
"#,
            port
        );

        std::fs::write(&conf_file, conf_content)
            .map_err(|e| format!("Failed to write postgresql.conf: {}", e))?;

        // Update pg_hba.conf for local trust authentication
        let hba_content = r#"# PostgreSQL Client Authentication Configuration File
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             all                                     trust
host    all             all             127.0.0.1/32            trust
host    all             all             ::1/128                 trust
"#;

        std::fs::write(&hba_file, hba_content)
            .map_err(|e| format!("Failed to write pg_hba.conf: {}", e))?;

        Ok(())
    }

    /// Update postgresql.conf port setting (needed when port changes after init)
    pub fn update_port_config(&self) -> Result<(), String> {
        let conf_file = self.data_dir.join("postgresql.conf");
        let port = *self.port.lock().unwrap();

        if !conf_file.exists() {
            return Err("postgresql.conf not found".to_string());
        }

        let content = std::fs::read_to_string(&conf_file)
            .map_err(|e| format!("Failed to read postgresql.conf: {}", e))?;

        // Replace the port line
        let updated = content
            .lines()
            .map(|line| {
                if line.starts_with("port = ") {
                    format!("port = {}", port)
                } else {
                    line.to_string()
                }
            })
            .collect::<Vec<_>>()
            .join("\n");

        std::fs::write(&conf_file, updated)
            .map_err(|e| format!("Failed to write postgresql.conf: {}", e))?;

        log::info!("Updated postgresql.conf port to {}", port);
        Ok(())
    }

    /// Start the PostgreSQL server with port conflict detection
    pub fn start(&self) -> Result<(), String> {
        self.start_with_retry()
            .map(|_| ())
            .map_err(|e| e.to_string())
    }

    /// Start the PostgreSQL server with retry logic and port conflict handling
    pub fn start_with_retry(&self) -> Result<u16, PostgresError> {
        if !*self.initialized.lock().unwrap() {
            return Err(PostgresError::NotInitialized);
        }

        let timer = StartupTimer::new();
        let mut backoff = ExponentialBackoff::new(self.startup_config.clone());

        // First, ensure port is available (may update port)
        let port = self.ensure_port_available()?;

        // Check if already running
        if self.is_running() {
            log::info!("PostgreSQL is already running on port {}", port);
            return Ok(port);
        }

        log::info!("Starting PostgreSQL on port {}...", port);

        let postgres_path = self.bin_dir.join("postgres");

        if !postgres_path.exists() {
            return Err(PostgresError::BinaryNotFound(
                postgres_path.to_string_lossy().to_string(),
            ));
        }

        // Attempt to start with retries
        loop {
            match self.attempt_start(&postgres_path, port) {
                Ok(()) => {
                    // Wait for PostgreSQL to be ready with backoff
                    match self.wait_for_ready_with_backoff() {
                        Ok(()) => {
                            // Create database and enable extensions
                            self.setup_database()
                                .map_err(|e| PostgresError::StartFailed(e))?;

                            log::info!(
                                "PostgreSQL started successfully on port {} in {}ms",
                                port,
                                timer.elapsed_ms()
                            );
                            return Ok(port);
                        }
                        Err(e) => {
                            log::warn!("PostgreSQL not ready: {}", e);
                            // Kill the process and retry
                            self.kill_process();
                        }
                    }
                }
                Err(e) => {
                    log::warn!("Failed to start PostgreSQL: {}", e);
                }
            }

            // Check if we should retry
            if let Some(delay) = backoff.next_delay() {
                log::info!(
                    "Retrying PostgreSQL startup (attempt {}/{}) after {}ms...",
                    backoff.current_attempt(),
                    backoff.max_attempts(),
                    delay.as_millis()
                );
                std::thread::sleep(delay);
            } else {
                return Err(PostgresError::Timeout(format!(
                    "PostgreSQL failed to start after {} attempts",
                    backoff.max_attempts()
                )));
            }
        }
    }

    /// Single attempt to start PostgreSQL
    fn attempt_start(
        &self,
        postgres_path: &std::path::Path,
        port: u16,
    ) -> Result<(), PostgresError> {
        // Start PostgreSQL
        // Note: We use Stdio::null() for stdout/stderr to prevent the process from
        // blocking when pipe buffers fill up. PostgreSQL logs to stderr by default,
        // but we're using the Tauri logging system instead. If you need PostgreSQL
        // logs, configure logging_collector = on in postgresql.conf.
        //
        // LC_ALL=C is required to prevent "postmaster became multithreaded during startup"
        // error on macOS when spawning threads (like the stderr reader) early in the process.
        let mut child = Command::new(postgres_path)
            .arg("-D")
            .arg(&self.data_dir)
            .arg("-p")
            .arg(port.to_string())
            .arg("-k")
            .arg(&self.data_dir) // Socket directory
            .env("LC_ALL", "C")
            .env("LANG", "C")
            .stdout(Stdio::null())
            .stderr(Stdio::piped()) // Keep stderr to capture startup errors
            .spawn()
            .map_err(|e| PostgresError::StartFailed(e.to_string()))?;

        // Spawn a thread to consume stderr to prevent blocking
        // This also logs any PostgreSQL errors
        if let Some(stderr) = child.stderr.take() {
            std::thread::spawn(move || {
                let reader = BufReader::new(stderr);
                for line in reader.lines().map_while(Result::ok) {
                    log::info!("[PostgreSQL] {}", line);
                }
            });
        }

        *self.process.lock().unwrap() = Some(child);
        Ok(())
    }

    /// Kill the current PostgreSQL process
    fn kill_process(&self) {
        if let Some(mut child) = self.process.lock().unwrap().take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }

    /// Wait for PostgreSQL to be ready with exponential backoff
    fn wait_for_ready_with_backoff(&self) -> Result<(), PostgresError> {
        let pg_isready = self.bin_dir.join("pg_isready");
        let port = *self.port.lock().unwrap();

        if !pg_isready.exists() {
            // If pg_isready doesn't exist, use a simple sleep and hope for the best
            log::warn!("pg_isready not found, waiting 5 seconds for PostgreSQL to start");
            std::thread::sleep(Duration::from_secs(5));
            return Ok(());
        }

        log::info!("Waiting for PostgreSQL to be ready...");

        let timeout = Duration::from_secs(self.startup_config.timeout_secs);
        let start = std::time::Instant::now();
        let check_interval = Duration::from_millis(500);

        while start.elapsed() < timeout {
            let result = Command::new(&pg_isready)
                .arg("-h")
                .arg("localhost")
                .arg("-p")
                .arg(port.to_string())
                .arg("-U")
                .arg("secondbrain")
                .output();

            if let Ok(output) = result {
                if output.status.success() {
                    log::info!(
                        "PostgreSQL is ready after {}ms",
                        start.elapsed().as_millis()
                    );
                    return Ok(());
                }
            }

            std::thread::sleep(check_interval);
        }

        Err(PostgresError::Timeout(
            "PostgreSQL failed to become ready within timeout".to_string(),
        ))
    }

    /// Stop the PostgreSQL server
    pub fn stop(&self) -> Result<(), String> {
        log::info!("Stopping PostgreSQL...");

        // Try graceful shutdown first using pg_ctl
        let pg_ctl_path = self.bin_dir.join("pg_ctl");

        if pg_ctl_path.exists() {
            let result = Command::new(&pg_ctl_path)
                .arg("stop")
                .arg("-D")
                .arg(&self.data_dir)
                .arg("-m")
                .arg("fast")
                .arg("-w")
                .output();

            if let Ok(output) = result {
                if output.status.success() {
                    log::info!("PostgreSQL stopped gracefully");
                    *self.process.lock().unwrap() = None;
                    return Ok(());
                }
            }
        }

        // Fallback: kill the process directly
        if let Some(mut child) = self.process.lock().unwrap().take() {
            child
                .kill()
                .map_err(|e| format!("Failed to kill PostgreSQL: {}", e))?;
            log::info!("PostgreSQL process killed");
        }

        Ok(())
    }

    /// Check if PostgreSQL is running and accepting connections
    pub fn is_running(&self) -> bool {
        let pg_isready = self.bin_dir.join("pg_isready");
        let port = *self.port.lock().unwrap();

        if !pg_isready.exists() {
            return false;
        }

        let result = Command::new(&pg_isready)
            .arg("-h")
            .arg("localhost")
            .arg("-p")
            .arg(port.to_string())
            .arg("-U")
            .arg("secondbrain")
            .output();

        result
            .map(|output| output.status.success())
            .unwrap_or(false)
    }

    /// Set up the database and extensions
    fn setup_database(&self) -> Result<(), String> {
        let psql = self.bin_dir.join("psql");
        let port = *self.port.lock().unwrap();

        if !psql.exists() {
            return Err(format!("psql not found at {:?}", psql));
        }

        // Create the secondbrain database if it doesn't exist
        let create_db_output = Command::new(&psql)
            .arg("-h")
            .arg("localhost")
            .arg("-p")
            .arg(port.to_string())
            .arg("-U")
            .arg("secondbrain")
            .arg("-d")
            .arg("postgres")
            .arg("-tc")
            .arg("SELECT 1 FROM pg_database WHERE datname = 'secondbrain'")
            .output()
            .map_err(|e| format!("Failed to check database: {}", e))?;

        let db_exists = String::from_utf8_lossy(&create_db_output.stdout)
            .trim()
            .contains("1");

        if !db_exists {
            log::info!("Creating secondbrain database...");

            let output = Command::new(&psql)
                .arg("-h")
                .arg("localhost")
                .arg("-p")
                .arg(port.to_string())
                .arg("-U")
                .arg("secondbrain")
                .arg("-d")
                .arg("postgres")
                .arg("-c")
                .arg("CREATE DATABASE secondbrain")
                .output()
                .map_err(|e| format!("Failed to create database: {}", e))?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                log::warn!("Create database output: {}", stderr);
            }
        }

        // Enable pgvector extension
        log::info!("Enabling pgvector extension...");
        let output = Command::new(&psql)
            .arg("-h")
            .arg("localhost")
            .arg("-p")
            .arg(port.to_string())
            .arg("-U")
            .arg("secondbrain")
            .arg("-d")
            .arg("secondbrain")
            .arg("-c")
            .arg("CREATE EXTENSION IF NOT EXISTS vector")
            .output()
            .map_err(|e| format!("Failed to enable pgvector: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            log::warn!("pgvector extension output: {}", stderr);
            // Don't fail - pgvector might not be installed in development
        }

        Ok(())
    }

    /// Get the connection string for the embedded database
    pub fn get_connection_string(&self) -> String {
        let port = *self.port.lock().unwrap();
        format!(
            "Host=localhost;Port={};Database=secondbrain;Username=secondbrain;Trust Server Certificate=true;Client Encoding=UTF8",
            port
        )
    }

    /// Get the PostgreSQL port
    pub fn get_port(&self) -> u16 {
        *self.port.lock().unwrap()
    }

    /// Get startup metrics
    pub fn get_startup_config(&self) -> &StartupConfig {
        &self.startup_config
    }
}

impl Drop for PostgresManager {
    fn drop(&mut self) {
        let _ = self.stop();
    }
}

// ============================================================
// Unit Tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    // ============================================================
    // PostgresManager Construction Tests
    // ============================================================

    #[test]
    fn test_postgres_manager_new() {
        let temp_dir = TempDir::new().unwrap();
        let app_data = temp_dir.path().to_path_buf();
        let resource_dir = temp_dir.path().join("resources");

        let manager = PostgresManager::new(app_data.clone(), resource_dir, 5433);

        assert_eq!(*manager.port.lock().unwrap(), 5433);
        assert_eq!(manager.data_dir, app_data.join("postgresql"));
        assert!(!*manager.initialized.lock().unwrap());
    }

    #[test]
    fn test_postgres_manager_custom_port() {
        let temp_dir = TempDir::new().unwrap();
        let manager = PostgresManager::new(
            temp_dir.path().to_path_buf(),
            temp_dir.path().to_path_buf(),
            5555,
        );

        assert_eq!(manager.get_port(), 5555);
    }

    #[test]
    fn test_postgres_manager_data_dir_path() {
        let temp_dir = TempDir::new().unwrap();
        let app_data = temp_dir.path().join("custom_app_data");

        let manager = PostgresManager::new(app_data.clone(), temp_dir.path().to_path_buf(), 5433);

        assert_eq!(manager.data_dir, app_data.join("postgresql"));
    }

    // ============================================================
    // find_postgres_bin_dir Tests
    // ============================================================

    #[test]
    fn test_find_postgres_bin_dir_returns_path() {
        let temp_dir = TempDir::new().unwrap();
        let bin_dir = PostgresManager::find_postgres_bin_dir(&temp_dir.path().to_path_buf());

        // Should return a path (even if PostgreSQL isn't installed)
        assert!(!bin_dir.as_os_str().is_empty());
    }

    #[test]
    fn test_find_postgres_bin_dir_checks_known_paths() {
        // This test verifies the function checks expected paths
        let temp_dir = TempDir::new().unwrap();
        let bin_dir = PostgresManager::find_postgres_bin_dir(&temp_dir.path().to_path_buf());

        let path_str = bin_dir.to_string_lossy();

        // Should be one of the expected paths or a fallback
        let valid_prefixes = [
            "/opt/homebrew/opt/postgresql",
            "/usr/local/opt/postgresql",
            "/usr/local/pgsql/bin",
            "/Applications/Postgres.app",
        ];

        // Either found a valid path or returned the fallback
        let is_valid = valid_prefixes
            .iter()
            .any(|prefix| path_str.contains(prefix));
        // Even if not found, it should return a fallback path
        assert!(is_valid || path_str.contains("postgresql"));
    }

    // ============================================================
    // Connection String Tests
    // ============================================================

    #[test]
    fn test_get_connection_string_format() {
        let temp_dir = TempDir::new().unwrap();
        let manager = PostgresManager::new(
            temp_dir.path().to_path_buf(),
            temp_dir.path().to_path_buf(),
            5433,
        );

        let conn_str = manager.get_connection_string();

        assert!(conn_str.contains("Host=localhost"));
        assert!(conn_str.contains("Port=5433"));
        assert!(conn_str.contains("Database=secondbrain"));
        assert!(conn_str.contains("Username=secondbrain"));
        assert!(conn_str.contains("Client Encoding=UTF8"));
    }

    #[test]
    fn test_get_connection_string_with_different_ports() {
        let temp_dir = TempDir::new().unwrap();

        for port in [5432, 5433, 5434, 6543] {
            let manager = PostgresManager::new(
                temp_dir.path().to_path_buf(),
                temp_dir.path().to_path_buf(),
                port,
            );

            let conn_str = manager.get_connection_string();
            assert!(conn_str.contains(&format!("Port={}", port)));
        }
    }

    // ============================================================
    // Database Initialization Tests
    // ============================================================

    #[test]
    fn test_init_database_skips_if_exists() {
        let temp_dir = TempDir::new().unwrap();
        let data_dir = temp_dir.path().join("postgresql");

        // Create data directory with PG_VERSION file
        std::fs::create_dir_all(&data_dir).unwrap();
        std::fs::write(data_dir.join("PG_VERSION"), "18").unwrap();

        let manager = PostgresManager::new(
            temp_dir.path().to_path_buf(),
            temp_dir.path().to_path_buf(),
            5433,
        );

        // Should succeed without running initdb
        let result = manager.init_database();
        assert!(result.is_ok());
        assert!(*manager.initialized.lock().unwrap());
    }

    #[test]
    fn test_init_database_returns_error_without_initdb() {
        let temp_dir = TempDir::new().unwrap();

        // Create a manager with a fake bin directory without initdb
        let fake_bin = temp_dir.path().join("fake_bin");
        std::fs::create_dir_all(&fake_bin).unwrap();

        let manager = PostgresManager {
            process: Mutex::new(None),
            data_dir: temp_dir.path().join("postgresql"),
            bin_dir: fake_bin,
            port: Mutex::new(5433),
            initialized: Mutex::new(false),
            startup_config: StartupConfig::default(),
        };

        let result = manager.init_database();

        // Should fail because initdb doesn't exist
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("initdb not found"));
    }

    // ============================================================
    // PostgreSQL Configuration Tests
    // ============================================================

    #[test]
    fn test_configure_postgresql_creates_files() {
        let temp_dir = TempDir::new().unwrap();
        let data_dir = temp_dir.path().join("postgresql");
        std::fs::create_dir_all(&data_dir).unwrap();

        let manager = PostgresManager {
            process: Mutex::new(None),
            data_dir: data_dir.clone(),
            bin_dir: temp_dir.path().to_path_buf(),
            port: Mutex::new(5433),
            initialized: Mutex::new(false),
            startup_config: StartupConfig::default(),
        };

        let result = manager.configure_postgresql();
        assert!(result.is_ok());

        // Verify postgresql.conf was created
        let conf_path = data_dir.join("postgresql.conf");
        assert!(conf_path.exists());

        let conf_content = std::fs::read_to_string(&conf_path).unwrap();
        assert!(conf_content.contains("listen_addresses = 'localhost'"));
        assert!(conf_content.contains("port = 5433"));
        assert!(conf_content.contains("client_encoding = 'UTF8'"));

        // Verify pg_hba.conf was created
        let hba_path = data_dir.join("pg_hba.conf");
        assert!(hba_path.exists());

        let hba_content = std::fs::read_to_string(&hba_path).unwrap();
        assert!(hba_content.contains("127.0.0.1/32"));
        assert!(hba_content.contains("trust"));
    }

    #[test]
    fn test_configure_postgresql_port_substitution() {
        let temp_dir = TempDir::new().unwrap();
        let data_dir = temp_dir.path().join("postgresql");
        std::fs::create_dir_all(&data_dir).unwrap();

        let manager = PostgresManager {
            process: Mutex::new(None),
            data_dir: data_dir.clone(),
            bin_dir: temp_dir.path().to_path_buf(),
            port: Mutex::new(9999),
            initialized: Mutex::new(false),
            startup_config: StartupConfig::default(),
        };

        manager.configure_postgresql().unwrap();

        let conf_content = std::fs::read_to_string(data_dir.join("postgresql.conf")).unwrap();
        assert!(conf_content.contains("port = 9999"));
    }

    // ============================================================
    // is_running Tests
    // ============================================================

    #[test]
    fn test_is_running_returns_false_without_pg_isready() {
        let temp_dir = TempDir::new().unwrap();

        let manager = PostgresManager {
            process: Mutex::new(None),
            data_dir: temp_dir.path().to_path_buf(),
            bin_dir: temp_dir.path().join("nonexistent"),
            port: Mutex::new(5433),
            initialized: Mutex::new(false),
            startup_config: StartupConfig::default(),
        };

        assert!(!manager.is_running());
    }

    // ============================================================
    // Start/Stop Lifecycle Tests
    // ============================================================

    #[test]
    fn test_start_requires_initialization() {
        let temp_dir = TempDir::new().unwrap();

        let manager = PostgresManager {
            process: Mutex::new(None),
            data_dir: temp_dir.path().to_path_buf(),
            bin_dir: temp_dir.path().to_path_buf(),
            port: Mutex::new(5433),
            initialized: Mutex::new(false),
            startup_config: StartupConfig::default(),
        };

        let result = manager.start();

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Database not initialized"));
    }

    #[test]
    fn test_stop_handles_no_process() {
        let temp_dir = TempDir::new().unwrap();

        let manager = PostgresManager {
            process: Mutex::new(None),
            data_dir: temp_dir.path().to_path_buf(),
            bin_dir: temp_dir.path().to_path_buf(),
            port: Mutex::new(5433),
            initialized: Mutex::new(false),
            startup_config: StartupConfig::default(),
        };

        // Should not panic when no process exists
        let result = manager.stop();
        assert!(result.is_ok());
    }

    // ============================================================
    // Drop Implementation Tests
    // ============================================================

    #[test]
    fn test_drop_calls_stop() {
        let temp_dir = TempDir::new().unwrap();

        {
            let _manager = PostgresManager {
                process: Mutex::new(None),
                data_dir: temp_dir.path().to_path_buf(),
                bin_dir: temp_dir.path().to_path_buf(),
                port: Mutex::new(5433),
                initialized: Mutex::new(false),
                startup_config: StartupConfig::default(),
            };
            // Manager will be dropped here
        }

        // Test passes if no panic occurs during drop
    }

    // ============================================================
    // Port Conflict Tests
    // ============================================================

    #[test]
    fn test_set_port() {
        let temp_dir = TempDir::new().unwrap();
        let manager = PostgresManager::new(
            temp_dir.path().to_path_buf(),
            temp_dir.path().to_path_buf(),
            5433,
        );

        assert_eq!(manager.get_port(), 5433);

        manager.set_port(5500);
        assert_eq!(manager.get_port(), 5500);
    }

    #[test]
    fn test_ensure_port_available_on_free_port() {
        let temp_dir = TempDir::new().unwrap();
        // Use a high port unlikely to be in use
        let manager = PostgresManager::new(
            temp_dir.path().to_path_buf(),
            temp_dir.path().to_path_buf(),
            59990,
        );

        let result = manager.ensure_port_available();
        assert!(result.is_ok());
    }

    // ============================================================
    // Port Getter Tests
    // ============================================================

    #[test]
    fn test_get_port() {
        let temp_dir = TempDir::new().unwrap();

        let manager = PostgresManager::new(
            temp_dir.path().to_path_buf(),
            temp_dir.path().to_path_buf(),
            5555,
        );

        assert_eq!(manager.get_port(), 5555);
    }

    #[test]
    fn test_get_port_different_values() {
        let temp_dir = TempDir::new().unwrap();

        for expected_port in [5432, 5433, 5434, 6543, 65535] {
            let manager = PostgresManager::new(
                temp_dir.path().to_path_buf(),
                temp_dir.path().to_path_buf(),
                expected_port,
            );

            assert_eq!(manager.get_port(), expected_port);
        }
    }

    // ============================================================
    // Process State Tests
    // ============================================================

    #[test]
    fn test_process_starts_as_none() {
        let temp_dir = TempDir::new().unwrap();

        let manager = PostgresManager::new(
            temp_dir.path().to_path_buf(),
            temp_dir.path().to_path_buf(),
            5433,
        );

        assert!(manager.process.lock().unwrap().is_none());
    }

    #[test]
    fn test_initialized_starts_as_false() {
        let temp_dir = TempDir::new().unwrap();

        let manager = PostgresManager::new(
            temp_dir.path().to_path_buf(),
            temp_dir.path().to_path_buf(),
            5433,
        );

        assert!(!*manager.initialized.lock().unwrap());
    }
}
