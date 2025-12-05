use tauri::{AppHandle, Manager};
use std::process::Command;

/// Open the app data directory in Finder
#[tauri::command]
pub async fn open_data_directory(app: AppHandle) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    
    Command::new("open")
        .arg(&app_data_dir)
        .spawn()
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

/// Open the log directory in Finder
#[tauri::command]
pub async fn open_log_directory(app: AppHandle) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    
    let log_dir = app_data_dir.join("logs");
    
    // Create the directory if it doesn't exist
    std::fs::create_dir_all(&log_dir).map_err(|e| e.to_string())?;
    
    Command::new("open")
        .arg(&log_dir)
        .spawn()
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

/// Get the app version
#[tauri::command]
pub async fn get_app_version(app: AppHandle) -> Result<String, String> {
    let version = app
        .config()
        .version
        .clone()
        .unwrap_or_else(|| "unknown".to_string());
    
    Ok(version)
}

// ============================================================
// Unit Tests
// ============================================================

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    // ============================================================
    // Path Construction Tests
    // ============================================================

    #[test]
    fn test_log_directory_path_construction() {
        let app_data_dir = PathBuf::from("/Users/test/Library/Application Support/com.secondbrain.desktop");
        let log_dir = app_data_dir.join("logs");
        
        assert_eq!(
            log_dir.to_string_lossy(),
            "/Users/test/Library/Application Support/com.secondbrain.desktop/logs"
        );
    }

    #[test]
    fn test_log_directory_path_with_spaces() {
        let app_data_dir = PathBuf::from("/path/with spaces/app data");
        let log_dir = app_data_dir.join("logs");
        
        assert!(log_dir.to_string_lossy().contains("logs"));
        assert!(log_dir.to_string_lossy().contains("with spaces"));
    }

    // ============================================================
    // Version String Tests
    // ============================================================

    #[test]
    fn test_version_fallback() {
        let version: Option<String> = None;
        let result = version.unwrap_or_else(|| "unknown".to_string());
        
        assert_eq!(result, "unknown");
    }

    #[test]
    fn test_version_with_value() {
        let version: Option<String> = Some("2.0.0".to_string());
        let result = version.unwrap_or_else(|| "unknown".to_string());
        
        assert_eq!(result, "2.0.0");
    }

    #[test]
    fn test_version_semver_format() {
        let version: Option<String> = Some("1.2.3".to_string());
        let result = version.unwrap_or_else(|| "unknown".to_string());
        
        // Should preserve semantic version format
        let parts: Vec<&str> = result.split('.').collect();
        assert_eq!(parts.len(), 3);
    }

    // ============================================================
    // Command Output Tests (for open commands)
    // ============================================================

    #[cfg(target_os = "macos")]
    #[test]
    fn test_open_command_exists() {
        use std::process::Command;
        
        // Verify 'open' command exists on macOS
        let result = Command::new("which").arg("open").output();
        
        assert!(result.is_ok());
        assert!(result.unwrap().status.success());
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn test_open_command_path() {
        use std::process::Command;
        
        // The 'open' command should be at /usr/bin/open
        let result = Command::new("which").arg("open").output().unwrap();
        let path = String::from_utf8_lossy(&result.stdout);
        
        assert!(path.trim() == "/usr/bin/open");
    }

    // ============================================================
    // Directory Creation Tests
    // ============================================================

    #[test]
    fn test_create_dir_all_creates_nested_directories() {
        use tempfile::TempDir;
        
        let temp_dir = TempDir::new().unwrap();
        let nested_path = temp_dir.path().join("a").join("b").join("c").join("logs");
        
        std::fs::create_dir_all(&nested_path).unwrap();
        
        assert!(nested_path.exists());
        assert!(nested_path.is_dir());
    }

    #[test]
    fn test_create_dir_all_is_idempotent() {
        use tempfile::TempDir;
        
        let temp_dir = TempDir::new().unwrap();
        let log_dir = temp_dir.path().join("logs");
        
        // Create once
        std::fs::create_dir_all(&log_dir).unwrap();
        assert!(log_dir.exists());
        
        // Create again - should not error
        let result = std::fs::create_dir_all(&log_dir);
        assert!(result.is_ok());
    }
}
