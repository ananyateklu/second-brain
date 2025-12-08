//! Diagnostics module for system information and troubleshooting.
//!
//! This module provides:
//! - System information collection
//! - Service status reporting
//! - Log tail retrieval
//! - Diagnostic report generation

use serde::{Deserialize, Serialize};
use std::path::Path;

/// System information for diagnostics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    /// Operating system name
    pub os_name: String,
    /// Operating system version
    pub os_version: String,
    /// CPU architecture
    pub arch: String,
    /// App version
    pub app_version: String,
    /// Tauri version
    pub tauri_version: String,
    /// Rust version (compile-time)
    pub rust_version: String,
}

impl SystemInfo {
    pub fn collect(app_version: String) -> Self {
        Self {
            os_name: std::env::consts::OS.to_string(),
            os_version: get_os_version(),
            arch: std::env::consts::ARCH.to_string(),
            app_version,
            tauri_version: tauri::VERSION.to_string(),
            rust_version: env!("CARGO_PKG_RUST_VERSION").to_string(),
        }
    }
}

/// Service status information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceStatus {
    /// PostgreSQL status
    pub postgres: ServiceState,
    /// Backend status
    pub backend: ServiceState,
}

/// State of a single service
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceState {
    /// Whether the service is running
    pub running: bool,
    /// Port the service is listening on
    pub port: Option<u16>,
    /// Process ID if available
    pub pid: Option<u32>,
    /// Additional status message
    pub message: Option<String>,
}

impl ServiceState {
    pub fn running(port: u16) -> Self {
        Self {
            running: true,
            port: Some(port),
            pid: None,
            message: None,
        }
    }

    pub fn stopped() -> Self {
        Self {
            running: false,
            port: None,
            pid: None,
            message: None,
        }
    }

    pub fn with_message(mut self, message: impl Into<String>) -> Self {
        self.message = Some(message.into());
        self
    }
}

/// PostgreSQL binary information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostgresInfo {
    /// Path to PostgreSQL binaries
    pub bin_path: String,
    /// PostgreSQL version if available
    pub version: Option<String>,
    /// Whether pgvector extension is available
    pub pgvector_available: bool,
}

impl PostgresInfo {
    pub fn detect(bin_dir: &Path) -> Self {
        let postgres_path = bin_dir.join("postgres");
        let version = if postgres_path.exists() {
            get_postgres_version(&postgres_path)
        } else {
            None
        };

        Self {
            bin_path: bin_dir.to_string_lossy().to_string(),
            version,
            pgvector_available: check_pgvector_available(bin_dir),
        }
    }
}

/// Full diagnostic report
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiagnosticReport {
    /// System information
    pub system: SystemInfo,
    /// Service status
    pub services: ServiceStatus,
    /// PostgreSQL information
    pub postgres_info: Option<PostgresInfo>,
    /// Recent log entries
    pub recent_logs: Vec<String>,
    /// Data directory path
    pub data_dir: String,
    /// Log directory path
    pub log_dir: String,
    /// Report timestamp (ISO 8601)
    pub timestamp: String,
}

impl DiagnosticReport {
    /// Generate a diagnostic report
    pub fn generate(
        app_version: String,
        postgres_ready: bool,
        postgres_port: u16,
        backend_ready: bool,
        backend_port: u16,
        data_dir: &Path,
        log_dir: &Path,
        postgres_bin_dir: Option<&Path>,
    ) -> Self {
        let system = SystemInfo::collect(app_version);

        let services = ServiceStatus {
            postgres: if postgres_ready {
                ServiceState::running(postgres_port)
            } else {
                ServiceState::stopped().with_message("Not started or failed to start")
            },
            backend: if backend_ready {
                ServiceState::running(backend_port)
            } else {
                ServiceState::stopped().with_message("Not started or failed to start")
            },
        };

        let postgres_info = postgres_bin_dir.map(PostgresInfo::detect);

        let recent_logs = read_recent_logs(log_dir, 50);

        Self {
            system,
            services,
            postgres_info,
            recent_logs,
            data_dir: data_dir.to_string_lossy().to_string(),
            log_dir: log_dir.to_string_lossy().to_string(),
            timestamp: chrono_lite_timestamp(),
        }
    }
}

/// Get OS version string
fn get_os_version() -> String {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("sw_vers")
            .arg("-productVersion")
            .output()
            .ok()
            .and_then(|o| String::from_utf8(o.stdout).ok())
            .map(|s| s.trim().to_string())
            .unwrap_or_else(|| "unknown".to_string())
    }

    #[cfg(target_os = "linux")]
    {
        std::fs::read_to_string("/etc/os-release")
            .ok()
            .and_then(|content| {
                content
                    .lines()
                    .find(|line| line.starts_with("VERSION="))
                    .map(|line| line.trim_start_matches("VERSION=").trim_matches('"').to_string())
            })
            .unwrap_or_else(|| "unknown".to_string())
    }

    #[cfg(target_os = "windows")]
    {
        "Windows".to_string()
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    {
        "unknown".to_string()
    }
}

/// Get PostgreSQL version from binary
fn get_postgres_version(postgres_path: &Path) -> Option<String> {
    std::process::Command::new(postgres_path)
        .arg("--version")
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().to_string())
}

/// Check if pgvector extension is available
fn check_pgvector_available(bin_dir: &Path) -> bool {
    // Check common extension directories relative to bin
    let lib_dir = bin_dir.parent().map(|p| p.join("share/postgresql/extension"));

    if let Some(ref ext_dir) = lib_dir {
        if ext_dir.join("vector.control").exists() {
            return true;
        }
    }

    // Also check Homebrew locations
    let homebrew_paths = [
        "/opt/homebrew/share/postgresql@18/extension/vector.control",
        "/usr/local/share/postgresql@18/extension/vector.control",
    ];

    for path in &homebrew_paths {
        if Path::new(path).exists() {
            return true;
        }
    }

    false
}

/// Read recent log entries from log files
fn read_recent_logs(log_dir: &Path, max_lines: usize) -> Vec<String> {
    let mut logs = Vec::new();

    // Look for log files in the directory
    if let Ok(entries) = std::fs::read_dir(log_dir) {
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
                let lines: Vec<_> = content.lines().rev().take(max_lines).collect();
                logs = lines.into_iter().rev().map(|s| s.to_string()).collect();
            }
        }
    }

    logs
}

/// Generate a simple ISO 8601 timestamp without external dependencies
fn chrono_lite_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};

    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();

    let secs = duration.as_secs();

    // Simple UTC timestamp calculation
    let days_since_epoch = secs / 86400;
    let time_of_day = secs % 86400;

    let hours = time_of_day / 3600;
    let minutes = (time_of_day % 3600) / 60;
    let seconds = time_of_day % 60;

    // Calculate year, month, day from days since epoch
    let (year, month, day) = days_to_ymd(days_since_epoch);

    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        year, month, day, hours, minutes, seconds
    )
}

/// Convert days since Unix epoch to year/month/day
fn days_to_ymd(days: u64) -> (u32, u32, u32) {
    // Simplified calculation (doesn't handle all edge cases perfectly but good enough for diagnostics)
    let mut remaining_days = days as i64;
    let mut year = 1970;

    loop {
        let days_in_year = if is_leap_year(year) { 366 } else { 365 };
        if remaining_days < days_in_year {
            break;
        }
        remaining_days -= days_in_year;
        year += 1;
    }

    let is_leap = is_leap_year(year);
    let days_in_months: [i64; 12] = if is_leap {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };

    let mut month = 1;
    for days_in_month in days_in_months.iter() {
        if remaining_days < *days_in_month {
            break;
        }
        remaining_days -= days_in_month;
        month += 1;
    }

    let day = remaining_days as u32 + 1;

    (year, month, day)
}

fn is_leap_year(year: u32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
}

// ============================================================
// Unit Tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_system_info_collect() {
        let info = SystemInfo::collect("2.0.0".to_string());
        assert!(!info.os_name.is_empty());
        assert!(!info.arch.is_empty());
        assert_eq!(info.app_version, "2.0.0");
    }

    #[test]
    fn test_service_state_running() {
        let state = ServiceState::running(5433);
        assert!(state.running);
        assert_eq!(state.port, Some(5433));
    }

    #[test]
    fn test_service_state_stopped() {
        let state = ServiceState::stopped();
        assert!(!state.running);
        assert!(state.port.is_none());
    }

    #[test]
    fn test_service_state_with_message() {
        let state = ServiceState::stopped().with_message("Test message");
        assert_eq!(state.message, Some("Test message".to_string()));
    }

    #[test]
    fn test_chrono_lite_timestamp_format() {
        let timestamp = chrono_lite_timestamp();
        // Should match ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ
        assert!(timestamp.len() == 20);
        assert!(timestamp.contains('T'));
        assert!(timestamp.ends_with('Z'));
    }

    #[test]
    fn test_days_to_ymd_epoch() {
        let (year, month, day) = days_to_ymd(0);
        assert_eq!(year, 1970);
        assert_eq!(month, 1);
        assert_eq!(day, 1);
    }

    #[test]
    fn test_is_leap_year() {
        assert!(is_leap_year(2000)); // Divisible by 400
        assert!(!is_leap_year(1900)); // Divisible by 100 but not 400
        assert!(is_leap_year(2024)); // Divisible by 4
        assert!(!is_leap_year(2023)); // Not divisible by 4
    }

    #[test]
    fn test_read_recent_logs_empty_dir() {
        let temp_dir = TempDir::new().unwrap();
        let logs = read_recent_logs(temp_dir.path(), 10);
        assert!(logs.is_empty());
    }

    #[test]
    fn test_read_recent_logs_with_file() {
        let temp_dir = TempDir::new().unwrap();
        let log_path = temp_dir.path().join("test.log");

        std::fs::write(&log_path, "Line 1\nLine 2\nLine 3").unwrap();

        let logs = read_recent_logs(temp_dir.path(), 2);
        assert_eq!(logs.len(), 2);
        assert_eq!(logs[0], "Line 2");
        assert_eq!(logs[1], "Line 3");
    }

    #[test]
    fn test_postgres_info_detect_nonexistent() {
        let temp_dir = TempDir::new().unwrap();
        let info = PostgresInfo::detect(temp_dir.path());

        // Version should be None since postgres binary doesn't exist in temp dir
        assert!(info.version.is_none());
        // pgvector availability depends on system - may be available via Homebrew
        // So we just check the function runs without panic
    }

    #[test]
    fn test_diagnostic_report_generate() {
        let temp_dir = TempDir::new().unwrap();
        let data_dir = temp_dir.path().join("data");
        let log_dir = temp_dir.path().join("logs");

        std::fs::create_dir_all(&data_dir).unwrap();
        std::fs::create_dir_all(&log_dir).unwrap();

        let report = DiagnosticReport::generate(
            "2.0.0".to_string(),
            true,
            5433,
            true,
            5001,
            &data_dir,
            &log_dir,
            None,
        );

        assert_eq!(report.system.app_version, "2.0.0");
        assert!(report.services.postgres.running);
        assert!(report.services.backend.running);
        assert!(!report.timestamp.is_empty());
    }
}
