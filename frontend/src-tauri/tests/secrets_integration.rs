//! Integration tests for secrets management

mod common;

use app_lib::{load_secrets, save_secrets, Secrets};

#[test]
fn test_secrets_persistence_workflow() {
    let fixture = common::TestAppState::new();
    let app_data = fixture.app_data_dir();

    // 1. Load from non-existent file (should return defaults)
    let initial = load_secrets(&app_data);
    assert!(initial.openai_api_key.is_none());

    // 2. Save secrets
    let secrets = Secrets {
        openai_api_key: Some("sk-test".to_string()),
        anthropic_api_key: Some("sk-ant-test".to_string()),
        gemini_api_key: None,
        xai_api_key: None,
        ollama_base_url: Some("http://localhost:11434".to_string()),
        pinecone_api_key: None,
        pinecone_environment: None,
        pinecone_index_name: None,
    };

    let save_result = save_secrets(&app_data, &secrets);
    assert!(save_result.is_ok());

    // 3. Load again and verify
    let loaded = load_secrets(&app_data);
    assert_eq!(loaded.openai_api_key, Some("sk-test".to_string()));
    assert_eq!(loaded.anthropic_api_key, Some("sk-ant-test".to_string()));
    assert!(loaded.gemini_api_key.is_none());
    assert_eq!(
        loaded.ollama_base_url,
        Some("http://localhost:11434".to_string())
    );
}

#[test]
fn test_secrets_update_workflow() {
    let fixture = common::TestAppState::new();
    let app_data = fixture.app_data_dir();

    // Save initial secrets
    let initial = Secrets {
        openai_api_key: Some("old-key".to_string()),
        ..Default::default()
    };
    save_secrets(&app_data, &initial).unwrap();

    // Update with new key
    let updated = Secrets {
        openai_api_key: Some("new-key".to_string()),
        anthropic_api_key: Some("added-key".to_string()),
        ..Default::default()
    };
    save_secrets(&app_data, &updated).unwrap();

    // Verify update
    let loaded = load_secrets(&app_data);
    assert_eq!(loaded.openai_api_key, Some("new-key".to_string()));
    assert_eq!(loaded.anthropic_api_key, Some("added-key".to_string()));
}

#[test]
fn test_secrets_full_roundtrip() {
    let fixture = common::TestAppState::new();
    let app_data = fixture.app_data_dir();

    // Create secrets with all fields populated
    let original = Secrets {
        openai_api_key: Some("sk-openai-key".to_string()),
        anthropic_api_key: Some("sk-anthropic-key".to_string()),
        gemini_api_key: Some("gemini-key".to_string()),
        xai_api_key: Some("xai-key".to_string()),
        ollama_base_url: Some("http://custom-ollama:11434".to_string()),
        pinecone_api_key: Some("pinecone-key".to_string()),
        pinecone_environment: Some("us-east-1".to_string()),
        pinecone_index_name: Some("my-index".to_string()),
    };

    // Save and load
    save_secrets(&app_data, &original).unwrap();
    let loaded = load_secrets(&app_data);

    // Verify all fields
    assert_eq!(original.openai_api_key, loaded.openai_api_key);
    assert_eq!(original.anthropic_api_key, loaded.anthropic_api_key);
    assert_eq!(original.gemini_api_key, loaded.gemini_api_key);
    assert_eq!(original.xai_api_key, loaded.xai_api_key);
    assert_eq!(original.ollama_base_url, loaded.ollama_base_url);
    assert_eq!(original.pinecone_api_key, loaded.pinecone_api_key);
    assert_eq!(original.pinecone_environment, loaded.pinecone_environment);
    assert_eq!(original.pinecone_index_name, loaded.pinecone_index_name);
}

#[test]
fn test_secrets_partial_update() {
    let fixture = common::TestAppState::new();
    let app_data = fixture.app_data_dir();

    // Start with OpenAI key only
    let initial = Secrets {
        openai_api_key: Some("openai-key".to_string()),
        ..Default::default()
    };
    save_secrets(&app_data, &initial).unwrap();

    // Load, modify, and save
    let mut loaded = load_secrets(&app_data);
    loaded.anthropic_api_key = Some("anthropic-key".to_string());
    save_secrets(&app_data, &loaded).unwrap();

    // Verify both keys exist
    let final_loaded = load_secrets(&app_data);
    assert_eq!(final_loaded.openai_api_key, Some("openai-key".to_string()));
    assert_eq!(
        final_loaded.anthropic_api_key,
        Some("anthropic-key".to_string())
    );
}

#[test]
fn test_secrets_handles_special_characters() {
    let fixture = common::TestAppState::new();
    let app_data = fixture.app_data_dir();

    // Test with special characters in API keys
    let secrets = Secrets {
        openai_api_key: Some("sk-test-key-with-special-chars!@#$%".to_string()),
        anthropic_api_key: Some("sk-ant-key/with/slashes".to_string()),
        gemini_api_key: Some("key+with+plus+signs".to_string()),
        xai_api_key: Some("key=with=equals".to_string()),
        ollama_base_url: Some("http://localhost:11434?param=value&other=test".to_string()),
        ..Default::default()
    };

    save_secrets(&app_data, &secrets).unwrap();
    let loaded = load_secrets(&app_data);

    assert_eq!(secrets.openai_api_key, loaded.openai_api_key);
    assert_eq!(secrets.anthropic_api_key, loaded.anthropic_api_key);
    assert_eq!(secrets.gemini_api_key, loaded.gemini_api_key);
    assert_eq!(secrets.xai_api_key, loaded.xai_api_key);
    assert_eq!(secrets.ollama_base_url, loaded.ollama_base_url);
}

#[test]
fn test_secrets_handles_unicode() {
    let fixture = common::TestAppState::new();
    let app_data = fixture.app_data_dir();

    // Test with unicode characters
    let secrets = Secrets {
        openai_api_key: Some("sk-test-emoji-🔑".to_string()),
        ollama_base_url: Some("http://サーバー:11434".to_string()),
        ..Default::default()
    };

    save_secrets(&app_data, &secrets).unwrap();
    let loaded = load_secrets(&app_data);

    assert_eq!(secrets.openai_api_key, loaded.openai_api_key);
    assert_eq!(secrets.ollama_base_url, loaded.ollama_base_url);
}

#[test]
fn test_secrets_clear_key() {
    let fixture = common::TestAppState::new();
    let app_data = fixture.app_data_dir();

    // Save with key
    let with_key = Secrets {
        openai_api_key: Some("sk-test".to_string()),
        ..Default::default()
    };
    save_secrets(&app_data, &with_key).unwrap();

    // Clear the key by saving None
    let without_key = Secrets {
        openai_api_key: None,
        ..Default::default()
    };
    save_secrets(&app_data, &without_key).unwrap();

    // Verify key is cleared
    let loaded = load_secrets(&app_data);
    assert!(loaded.openai_api_key.is_none());
}

#[test]
fn test_secrets_empty_string_vs_none() {
    let fixture = common::TestAppState::new();
    let app_data = fixture.app_data_dir();

    // Save with empty string (different from None)
    let secrets = Secrets {
        openai_api_key: Some("".to_string()),
        anthropic_api_key: None,
        ..Default::default()
    };
    save_secrets(&app_data, &secrets).unwrap();

    let loaded = load_secrets(&app_data);

    // Empty string should be preserved as Some("")
    assert_eq!(loaded.openai_api_key, Some("".to_string()));
    // None should stay None
    assert!(loaded.anthropic_api_key.is_none());
}

#[test]
fn test_secrets_creates_directory_if_missing() {
    let fixture = common::TestAppState::new();
    let nested_path = fixture
        .app_data_dir()
        .join("deep")
        .join("nested")
        .join("path");

    let secrets = Secrets {
        openai_api_key: Some("sk-test".to_string()),
        ..Default::default()
    };

    // Should create all parent directories
    let result = save_secrets(&nested_path, &secrets);
    assert!(result.is_ok());

    // Verify file was created
    assert!(nested_path.join("secrets.json").exists());
}

#[test]
fn test_secrets_multiple_saves() {
    let fixture = common::TestAppState::new();
    let app_data = fixture.app_data_dir();

    // Perform multiple saves
    for i in 0..10 {
        let secrets = Secrets {
            openai_api_key: Some(format!("sk-test-{}", i)),
            ..Default::default()
        };
        save_secrets(&app_data, &secrets).unwrap();
    }

    // Only the last save should persist
    let loaded = load_secrets(&app_data);
    assert_eq!(loaded.openai_api_key, Some("sk-test-9".to_string()));
}
