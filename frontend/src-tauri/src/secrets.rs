//! Secrets management with validation and redaction.
//!
//! This module provides:
//! - Secrets validation before applying
//! - Redaction of sensitive values in logs
//! - Secure file operations

use serde::{Deserialize, Serialize};
use std::path::Path;

/// Validation error for secrets
#[derive(Debug, Clone)]
pub struct SecretsValidationError {
    pub field: String,
    pub message: String,
}

impl std::fmt::Display for SecretsValidationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.field, self.message)
    }
}

/// API secrets configuration stored in file
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
    pub github_personal_access_token: Option<String>,
    pub github_default_owner: Option<String>,
    pub github_default_repo: Option<String>,
    pub git_allowed_repository_roots: Option<String>,
    pub git_require_user_scoped_root: Option<bool>,
}

impl Secrets {
    /// Validate secrets before applying
    pub fn validate(&self) -> Result<(), Vec<SecretsValidationError>> {
        let mut errors = Vec::new();

        // Validate OpenAI key format (should start with sk-)
        if let Some(ref key) = self.openai_api_key {
            if !key.is_empty() && !key.starts_with("sk-") {
                errors.push(SecretsValidationError {
                    field: "openai_api_key".to_string(),
                    message: "OpenAI API key should start with 'sk-'".to_string(),
                });
            }
        }

        // Validate Anthropic key format (should start with sk-ant-)
        if let Some(ref key) = self.anthropic_api_key {
            if !key.is_empty() && !key.starts_with("sk-ant-") {
                errors.push(SecretsValidationError {
                    field: "anthropic_api_key".to_string(),
                    message: "Anthropic API key should start with 'sk-ant-'".to_string(),
                });
            }
        }

        // Validate Ollama URL format
        if let Some(ref url) = self.ollama_base_url {
            if !url.is_empty() && !is_valid_url(url) {
                errors.push(SecretsValidationError {
                    field: "ollama_base_url".to_string(),
                    message: "Invalid URL format".to_string(),
                });
            }
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }

    /// Get a redacted version of secrets for logging
    pub fn redacted(&self) -> RedactedSecrets {
        RedactedSecrets {
            openai_api_key: redact_key(&self.openai_api_key),
            anthropic_api_key: redact_key(&self.anthropic_api_key),
            gemini_api_key: redact_key(&self.gemini_api_key),
            xai_api_key: redact_key(&self.xai_api_key),
            ollama_base_url: self.ollama_base_url.clone(),
            pinecone_api_key: redact_key(&self.pinecone_api_key),
            pinecone_environment: self.pinecone_environment.clone(),
            pinecone_index_name: self.pinecone_index_name.clone(),
            github_personal_access_token: redact_key(&self.github_personal_access_token),
            github_default_owner: self.github_default_owner.clone(),
            github_default_repo: self.github_default_repo.clone(),
            git_allowed_repository_roots: self.git_allowed_repository_roots.clone(),
            git_require_user_scoped_root: self.git_require_user_scoped_root,
        }
    }

    /// Check if any API keys are configured
    pub fn has_any_keys(&self) -> bool {
        self.openai_api_key
            .as_ref()
            .map(|s| !s.is_empty())
            .unwrap_or(false)
            || self
                .anthropic_api_key
                .as_ref()
                .map(|s| !s.is_empty())
                .unwrap_or(false)
            || self
                .gemini_api_key
                .as_ref()
                .map(|s| !s.is_empty())
                .unwrap_or(false)
            || self
                .xai_api_key
                .as_ref()
                .map(|s| !s.is_empty())
                .unwrap_or(false)
    }

    /// Count how many API keys are configured
    pub fn key_count(&self) -> usize {
        [
            &self.openai_api_key,
            &self.anthropic_api_key,
            &self.gemini_api_key,
            &self.xai_api_key,
            &self.pinecone_api_key,
        ]
        .iter()
        .filter(|k| k.as_ref().map(|s| !s.is_empty()).unwrap_or(false))
        .count()
    }
}

/// Redacted version of secrets for logging
#[derive(Debug, Clone, Serialize)]
pub struct RedactedSecrets {
    pub openai_api_key: Option<String>,
    pub anthropic_api_key: Option<String>,
    pub gemini_api_key: Option<String>,
    pub xai_api_key: Option<String>,
    pub ollama_base_url: Option<String>,
    pub pinecone_api_key: Option<String>,
    pub pinecone_environment: Option<String>,
    pub pinecone_index_name: Option<String>,
    pub github_personal_access_token: Option<String>,
    pub github_default_owner: Option<String>,
    pub github_default_repo: Option<String>,
    pub git_allowed_repository_roots: Option<String>,
    pub git_require_user_scoped_root: Option<bool>,
}

/// Redact a secret key, showing only first and last few characters
fn redact_key(key: &Option<String>) -> Option<String> {
    key.as_ref().map(|k| {
        if k.is_empty() {
            String::new()
        } else if k.len() <= 8 {
            "*".repeat(k.len())
        } else {
            format!("{}...{}", &k[..4], &k[k.len() - 4..])
        }
    })
}

/// Simple URL validation
fn is_valid_url(url: &str) -> bool {
    url.starts_with("http://") || url.starts_with("https://")
}

/// Load secrets from file with validation
pub fn load_and_validate_secrets(app_data_dir: &Path) -> Result<Secrets, String> {
    let secrets = load_secrets_internal(app_data_dir);

    // Validate loaded secrets
    if let Err(errors) = secrets.validate() {
        let error_msgs: Vec<String> = errors.iter().map(|e| e.to_string()).collect();
        log::warn!("Secrets validation warnings: {}", error_msgs.join(", "));
    }

    Ok(secrets)
}

/// Load secrets from file (internal implementation)
fn load_secrets_internal(app_data_dir: &Path) -> Secrets {
    let secrets_path = app_data_dir.join("secrets.json");

    if secrets_path.exists() {
        match std::fs::read_to_string(&secrets_path) {
            Ok(contents) => match serde_json::from_str::<Secrets>(&contents) {
                Ok(secrets) => {
                    log::info!(
                        "Loaded secrets from {:?} ({} keys configured)",
                        secrets_path,
                        secrets.key_count()
                    );
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

/// Save secrets with validation and atomic write
pub fn save_secrets_validated(app_data_dir: &Path, secrets: &Secrets) -> Result<(), String> {
    // Validate before saving
    if let Err(errors) = secrets.validate() {
        let error_msgs: Vec<String> = errors.iter().map(|e| e.to_string()).collect();
        return Err(format!(
            "Secrets validation failed: {}",
            error_msgs.join(", ")
        ));
    }

    save_secrets_atomic(app_data_dir, secrets)
}

/// Save secrets atomically (temp file + rename)
fn save_secrets_atomic(app_data_dir: &Path, secrets: &Secrets) -> Result<(), String> {
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

    log::info!(
        "Saved secrets to {:?} ({} keys)",
        secrets_path,
        secrets.key_count()
    );
    Ok(())
}

/// Redact sensitive environment variables from a string
pub fn redact_env_vars(text: &str) -> String {
    let patterns = [
        ("sk-[a-zA-Z0-9]{32,}", "[OPENAI_KEY_REDACTED]"),
        ("sk-ant-[a-zA-Z0-9-]{32,}", "[ANTHROPIC_KEY_REDACTED]"),
        ("AIza[a-zA-Z0-9-_]{35}", "[GEMINI_KEY_REDACTED]"),
        ("xai-[a-zA-Z0-9]{32,}", "[XAI_KEY_REDACTED]"),
    ];

    let mut result = text.to_string();

    for (pattern, replacement) in patterns {
        if let Ok(regex) = regex_lite::Regex::new(pattern) {
            result = regex.replace_all(&result, replacement).to_string();
        }
    }

    result
}

// ============================================================
// Unit Tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_secrets_default() {
        let secrets = Secrets::default();
        assert!(secrets.openai_api_key.is_none());
        assert!(!secrets.has_any_keys());
        assert_eq!(secrets.key_count(), 0);
    }

    #[test]
    fn test_secrets_validation_valid() {
        let secrets = Secrets {
            openai_api_key: Some("sk-test1234567890".to_string()),
            anthropic_api_key: Some("sk-ant-test1234567890".to_string()),
            ..Default::default()
        };

        assert!(secrets.validate().is_ok());
    }

    #[test]
    fn test_secrets_validation_invalid_openai() {
        let secrets = Secrets {
            openai_api_key: Some("invalid-key".to_string()),
            ..Default::default()
        };

        let result = secrets.validate();
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert_eq!(errors.len(), 1);
        assert_eq!(errors[0].field, "openai_api_key");
    }

    #[test]
    fn test_secrets_validation_invalid_anthropic() {
        let secrets = Secrets {
            anthropic_api_key: Some("invalid-key".to_string()),
            ..Default::default()
        };

        let result = secrets.validate();
        assert!(result.is_err());
    }

    #[test]
    fn test_secrets_validation_invalid_url() {
        let secrets = Secrets {
            ollama_base_url: Some("not-a-url".to_string()),
            ..Default::default()
        };

        let result = secrets.validate();
        assert!(result.is_err());
        let errors = result.unwrap_err();
        assert_eq!(errors[0].field, "ollama_base_url");
    }

    #[test]
    fn test_secrets_validation_valid_url() {
        let secrets = Secrets {
            ollama_base_url: Some("http://localhost:11434".to_string()),
            ..Default::default()
        };

        assert!(secrets.validate().is_ok());
    }

    #[test]
    fn test_redact_key_short() {
        let key = Some("sk-12".to_string());
        let redacted = redact_key(&key);
        assert_eq!(redacted, Some("*****".to_string()));
    }

    #[test]
    fn test_redact_key_long() {
        let key = Some("sk-1234567890abcdef".to_string());
        let redacted = redact_key(&key);
        assert_eq!(redacted, Some("sk-1...cdef".to_string()));
    }

    #[test]
    fn test_redact_key_none() {
        let key: Option<String> = None;
        let redacted = redact_key(&key);
        assert!(redacted.is_none());
    }

    #[test]
    fn test_secrets_redacted() {
        let secrets = Secrets {
            openai_api_key: Some("sk-1234567890abcdef".to_string()),
            ollama_base_url: Some("http://localhost:11434".to_string()),
            ..Default::default()
        };

        let redacted = secrets.redacted();
        assert_eq!(redacted.openai_api_key, Some("sk-1...cdef".to_string()));
        // URLs are not redacted
        assert_eq!(
            redacted.ollama_base_url,
            Some("http://localhost:11434".to_string())
        );
    }

    #[test]
    fn test_has_any_keys() {
        let mut secrets = Secrets::default();
        assert!(!secrets.has_any_keys());

        secrets.openai_api_key = Some("sk-test".to_string());
        assert!(secrets.has_any_keys());
    }

    #[test]
    fn test_key_count() {
        let secrets = Secrets {
            openai_api_key: Some("sk-test".to_string()),
            anthropic_api_key: Some("sk-ant-test".to_string()),
            gemini_api_key: Some("".to_string()), // Empty strings don't count
            ..Default::default()
        };

        assert_eq!(secrets.key_count(), 2);
    }

    #[test]
    fn test_save_and_load_secrets() {
        let temp_dir = TempDir::new().unwrap();

        let secrets = Secrets {
            openai_api_key: Some("sk-test1234567890".to_string()),
            ..Default::default()
        };

        save_secrets_atomic(temp_dir.path(), &secrets).unwrap();

        let loaded = load_secrets_internal(temp_dir.path());
        assert_eq!(loaded.openai_api_key, secrets.openai_api_key);
    }

    #[test]
    fn test_save_secrets_validated_fails_on_invalid() {
        let temp_dir = TempDir::new().unwrap();

        let secrets = Secrets {
            openai_api_key: Some("invalid-key".to_string()),
            ..Default::default()
        };

        let result = save_secrets_validated(temp_dir.path(), &secrets);
        assert!(result.is_err());
    }

    #[cfg(unix)]
    #[test]
    fn test_secrets_file_permissions() {
        use std::os::unix::fs::PermissionsExt;

        let temp_dir = TempDir::new().unwrap();
        let secrets = Secrets::default();

        save_secrets_atomic(temp_dir.path(), &secrets).unwrap();

        let secrets_path = temp_dir.path().join("secrets.json");
        let metadata = std::fs::metadata(&secrets_path).unwrap();
        let mode = metadata.permissions().mode();

        // Should be 0o600 (owner read/write only)
        assert_eq!(mode & 0o777, 0o600);
    }

    #[test]
    fn test_is_valid_url() {
        assert!(is_valid_url("http://localhost:11434"));
        assert!(is_valid_url("https://api.openai.com"));
        assert!(!is_valid_url("not-a-url"));
        assert!(!is_valid_url("ftp://example.com"));
    }
}
