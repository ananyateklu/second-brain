//! Configuration persistence for caching port assignments and service state.
//!
//! This module provides:
//! - Persistent storage of last-known good configuration
//! - Atomic file writes with temp file + rename
//! - Schema validation for configuration

use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

/// Cached service configuration that persists across restarts
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceConfig {
    /// PostgreSQL port that was last successfully used
    pub postgres_port: u16,
    /// Backend port that was last successfully used
    pub backend_port: u16,
    /// Timestamp of last successful startup (Unix epoch seconds)
    pub last_successful_startup: Option<u64>,
    /// Schema version for migration purposes
    pub schema_version: u32,
}

impl Default for ServiceConfig {
    fn default() -> Self {
        Self {
            postgres_port: 5433,
            backend_port: 5001,
            last_successful_startup: None,
            schema_version: 1,
        }
    }
}

impl ServiceConfig {
    /// Load configuration from file, returning default if file doesn't exist or is invalid
    pub fn load(config_dir: &Path) -> Self {
        let config_path = config_dir.join("service-config.json");

        if !config_path.exists() {
            log::info!("No service config found, using defaults");
            return Self::default();
        }

        match fs::read_to_string(&config_path) {
            Ok(contents) => match serde_json::from_str::<ServiceConfig>(&contents) {
                Ok(config) => {
                    // Validate schema version
                    if config.schema_version != 1 {
                        log::warn!(
                            "Config schema version mismatch (found {}, expected 1), using defaults",
                            config.schema_version
                        );
                        return Self::default();
                    }
                    log::info!("Loaded service config from {:?}", config_path);
                    config
                }
                Err(e) => {
                    log::warn!("Failed to parse service config: {}, using defaults", e);
                    Self::default()
                }
            },
            Err(e) => {
                log::warn!("Failed to read service config: {}, using defaults", e);
                Self::default()
            }
        }
    }

    /// Save configuration to file atomically (temp file + rename)
    pub fn save(&self, config_dir: &Path) -> Result<(), String> {
        // Ensure directory exists
        fs::create_dir_all(config_dir)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;

        let config_path = config_dir.join("service-config.json");
        let temp_path = config_dir.join(".service-config.json.tmp");

        // Write to temp file
        let json = serde_json::to_string_pretty(self)
            .map_err(|e| format!("Failed to serialize config: {}", e))?;

        {
            let mut file = fs::File::create(&temp_path)
                .map_err(|e| format!("Failed to create temp config file: {}", e))?;

            file.write_all(json.as_bytes())
                .map_err(|e| format!("Failed to write config: {}", e))?;

            file.sync_all()
                .map_err(|e| format!("Failed to sync config file: {}", e))?;
        }

        // Set restrictive permissions (Unix only)
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let permissions = fs::Permissions::from_mode(0o600);
            fs::set_permissions(&temp_path, permissions)
                .map_err(|e| format!("Failed to set config permissions: {}", e))?;
        }

        // Atomic rename
        fs::rename(&temp_path, &config_path)
            .map_err(|e| format!("Failed to rename config file: {}", e))?;

        log::info!("Saved service config to {:?}", config_path);
        Ok(())
    }

    /// Update with new successful startup
    pub fn mark_successful_startup(&mut self, postgres_port: u16, backend_port: u16) {
        self.postgres_port = postgres_port;
        self.backend_port = backend_port;
        self.last_successful_startup = Some(
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0),
        );
    }

    /// Get config file path for a given directory
    pub fn config_path(config_dir: &Path) -> PathBuf {
        config_dir.join("service-config.json")
    }
}

/// Validate that a configuration file is well-formed
pub fn validate_config_file(path: &Path) -> Result<ServiceConfig, String> {
    let contents = fs::read_to_string(path).map_err(|e| format!("Failed to read file: {}", e))?;

    let config: ServiceConfig =
        serde_json::from_str(&contents).map_err(|e| format!("Invalid JSON: {}", e))?;

    // Validate port ranges
    if config.postgres_port < 1024 {
        return Err(format!(
            "Invalid postgres_port {}: must be >= 1024",
            config.postgres_port
        ));
    }

    if config.backend_port < 1024 {
        return Err(format!(
            "Invalid backend_port {}: must be >= 1024",
            config.backend_port
        ));
    }

    Ok(config)
}

// ============================================================
// Unit Tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_service_config_default() {
        let config = ServiceConfig::default();
        assert_eq!(config.postgres_port, 5433);
        assert_eq!(config.backend_port, 5001);
        assert_eq!(config.schema_version, 1);
        assert!(config.last_successful_startup.is_none());
    }

    #[test]
    fn test_service_config_save_and_load() {
        let temp_dir = TempDir::new().unwrap();

        let mut config = ServiceConfig::default();
        config.postgres_port = 5434;
        config.backend_port = 5002;
        config.mark_successful_startup(5434, 5002);

        // Save
        config.save(temp_dir.path()).unwrap();

        // Verify file exists
        let config_path = ServiceConfig::config_path(temp_dir.path());
        assert!(config_path.exists());

        // Load
        let loaded = ServiceConfig::load(temp_dir.path());
        assert_eq!(loaded.postgres_port, 5434);
        assert_eq!(loaded.backend_port, 5002);
        assert!(loaded.last_successful_startup.is_some());
    }

    #[test]
    fn test_service_config_load_missing_file() {
        let temp_dir = TempDir::new().unwrap();
        let config = ServiceConfig::load(temp_dir.path());

        // Should return defaults
        assert_eq!(config.postgres_port, 5433);
        assert_eq!(config.backend_port, 5001);
    }

    #[test]
    fn test_service_config_load_invalid_json() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("service-config.json");

        // Write invalid JSON
        fs::write(&config_path, "not valid json {{{").unwrap();

        let config = ServiceConfig::load(temp_dir.path());

        // Should return defaults
        assert_eq!(config.postgres_port, 5433);
    }

    #[test]
    fn test_service_config_atomic_write() {
        let temp_dir = TempDir::new().unwrap();

        let config = ServiceConfig::default();
        config.save(temp_dir.path()).unwrap();

        // Temp file should not exist after successful save
        let temp_path = temp_dir.path().join(".service-config.json.tmp");
        assert!(!temp_path.exists());

        // Real config should exist
        let config_path = ServiceConfig::config_path(temp_dir.path());
        assert!(config_path.exists());
    }

    #[test]
    fn test_mark_successful_startup() {
        let mut config = ServiceConfig::default();

        config.mark_successful_startup(5500, 5600);

        assert_eq!(config.postgres_port, 5500);
        assert_eq!(config.backend_port, 5600);
        assert!(config.last_successful_startup.is_some());
    }

    #[test]
    fn test_validate_config_file_valid() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("test-config.json");

        let config = ServiceConfig::default();
        let json = serde_json::to_string_pretty(&config).unwrap();
        fs::write(&config_path, json).unwrap();

        let result = validate_config_file(&config_path);
        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_config_file_invalid_port() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("test-config.json");

        let json = r#"{"postgres_port": 80, "backend_port": 5001, "schema_version": 1}"#;
        fs::write(&config_path, json).unwrap();

        let result = validate_config_file(&config_path);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Invalid postgres_port"));
    }

    #[cfg(unix)]
    #[test]
    fn test_config_file_permissions() {
        use std::os::unix::fs::PermissionsExt;

        let temp_dir = TempDir::new().unwrap();
        let config = ServiceConfig::default();
        config.save(temp_dir.path()).unwrap();

        let config_path = ServiceConfig::config_path(temp_dir.path());
        let metadata = fs::metadata(&config_path).unwrap();
        let mode = metadata.permissions().mode();

        // Should be 0o600 (owner read/write only)
        assert_eq!(mode & 0o777, 0o600);
    }

    #[test]
    fn test_schema_version_mismatch() {
        let temp_dir = TempDir::new().unwrap();
        let config_path = temp_dir.path().join("service-config.json");

        // Write config with different schema version
        let json = r#"{"postgres_port": 5500, "backend_port": 5600, "schema_version": 99}"#;
        fs::write(&config_path, json).unwrap();

        let config = ServiceConfig::load(temp_dir.path());

        // Should return defaults due to schema mismatch
        assert_eq!(config.postgres_port, 5433);
        assert_eq!(config.backend_port, 5001);
    }
}
