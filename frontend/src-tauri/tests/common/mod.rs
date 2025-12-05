//! Shared test utilities for integration tests

use std::path::PathBuf;
use tempfile::TempDir;

/// Creates a mock app data directory structure
pub fn create_mock_app_data() -> TempDir {
    let temp_dir = TempDir::new().unwrap();

    // Create standard directories
    std::fs::create_dir_all(temp_dir.path().join("logs")).unwrap();
    std::fs::create_dir_all(temp_dir.path().join("postgresql")).unwrap();

    temp_dir
}

/// Creates a mock secrets file
pub fn create_mock_secrets(dir: &PathBuf, secrets_json: &str) {
    let secrets_path = dir.join("secrets.json");
    std::fs::write(secrets_path, secrets_json).unwrap();
}

/// Creates a mock PostgreSQL data directory
pub fn create_mock_postgres_data(dir: &PathBuf) {
    let pg_data = dir.join("postgresql");
    std::fs::create_dir_all(&pg_data).unwrap();
    std::fs::write(pg_data.join("PG_VERSION"), "16").unwrap();
    std::fs::write(pg_data.join("postgresql.conf"), "").unwrap();
    std::fs::write(pg_data.join("pg_hba.conf"), "").unwrap();
}

/// Test fixture for AppState
pub struct TestAppState {
    pub temp_dir: TempDir,
}

impl TestAppState {
    pub fn new() -> Self {
        Self {
            temp_dir: TempDir::new().unwrap(),
        }
    }

    pub fn app_data_dir(&self) -> PathBuf {
        self.temp_dir.path().to_path_buf()
    }
}

impl Default for TestAppState {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================
// Test Fixtures
// ============================================================

/// Standard test secrets JSON
pub fn sample_secrets_json() -> String {
    serde_json::json!({
        "openai_api_key": "sk-test-openai",
        "anthropic_api_key": "sk-ant-test",
        "gemini_api_key": null,
        "xai_api_key": "xai-test",
        "ollama_base_url": "http://localhost:11434",
        "pinecone_api_key": null,
        "pinecone_environment": null,
        "pinecone_index_name": null
    })
    .to_string()
}

/// Invalid JSON for error testing
#[allow(dead_code)]
pub fn invalid_json() -> &'static str {
    "{ invalid json {"
}

/// Empty secrets JSON
#[allow(dead_code)]
pub fn empty_secrets_json() -> &'static str {
    "{}"
}

/// PostgreSQL configuration template
pub fn postgres_conf_template(port: u16) -> String {
    format!(
        r#"listen_addresses = 'localhost'
port = {}
max_connections = 20
shared_buffers = 128MB
"#,
        port
    )
}

// ============================================================
// Async Test Helpers
// ============================================================

/// Test helper to check if a port is available
pub fn is_port_available(port: u16) -> bool {
    std::net::TcpListener::bind(("127.0.0.1", port)).is_ok()
}

/// Test helper to find an available port
pub fn find_available_port() -> u16 {
    let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    listener.local_addr().unwrap().port()
}

// ============================================================
// Test Macros
// ============================================================

/// Macro to assert error contains expected message
#[macro_export]
macro_rules! assert_err_contains {
    ($result:expr, $expected:expr) => {
        match $result {
            Err(e) => assert!(
                e.contains($expected),
                "Expected error to contain '{}', got '{}'",
                $expected,
                e
            ),
            Ok(_) => panic!("Expected error, got Ok"),
        }
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_find_available_port() {
        let port = find_available_port();
        assert!(port > 0);
        assert!(is_port_available(port));
    }

    #[test]
    fn test_create_mock_app_data() {
        let temp_dir = create_mock_app_data();

        assert!(temp_dir.path().join("logs").exists());
        assert!(temp_dir.path().join("postgresql").exists());
    }

    #[test]
    fn test_create_mock_secrets() {
        let temp_dir = TempDir::new().unwrap();
        let path = temp_dir.path().to_path_buf();

        create_mock_secrets(&path, r#"{"test": "value"}"#);

        assert!(path.join("secrets.json").exists());
    }

    #[test]
    fn test_create_mock_postgres_data() {
        let temp_dir = TempDir::new().unwrap();
        let path = temp_dir.path().to_path_buf();

        create_mock_postgres_data(&path);

        assert!(path.join("postgresql").join("PG_VERSION").exists());
        assert!(path.join("postgresql").join("postgresql.conf").exists());
        assert!(path.join("postgresql").join("pg_hba.conf").exists());
    }

    #[test]
    fn test_sample_secrets_json() {
        let json = sample_secrets_json();
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();

        assert_eq!(parsed["openai_api_key"], "sk-test-openai");
    }

    #[test]
    fn test_postgres_conf_template() {
        let conf = postgres_conf_template(5433);

        assert!(conf.contains("port = 5433"));
        assert!(conf.contains("listen_addresses"));
    }
}
