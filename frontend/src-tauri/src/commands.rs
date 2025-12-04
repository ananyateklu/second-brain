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

