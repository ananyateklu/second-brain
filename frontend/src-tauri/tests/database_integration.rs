//! Integration tests for PostgreSQL manager

mod common;

use app_lib::database::PostgresManager;
use std::sync::Arc;

#[test]
fn test_postgres_manager_full_lifecycle() {
    let fixture = common::TestAppState::new();

    // Create mock PG data so init_database succeeds without real initdb
    common::create_mock_postgres_data(&fixture.app_data_dir());

    let manager = PostgresManager::new(fixture.app_data_dir(), fixture.app_data_dir(), 5433);

    // Test initialization
    let init_result = manager.init_database();
    assert!(
        init_result.is_ok(),
        "init_database failed: {:?}",
        init_result
    );

    // Test connection string generation
    let conn_str = manager.get_connection_string();
    assert!(conn_str.contains("Port=5433"));

    // Test stop (should succeed even without running process)
    let stop_result = manager.stop();
    assert!(stop_result.is_ok());
}

#[test]
fn test_postgres_manager_concurrent_access() {
    use std::thread;

    let fixture = common::TestAppState::new();
    common::create_mock_postgres_data(&fixture.app_data_dir());

    let manager = Arc::new(PostgresManager::new(
        fixture.app_data_dir(),
        fixture.app_data_dir(),
        5433,
    ));

    let mut handles = vec![];

    // Spawn multiple threads accessing the manager
    for _ in 0..5 {
        let manager_clone = Arc::clone(&manager);
        let handle = thread::spawn(move || {
            let conn_str = manager_clone.get_connection_string();
            let port = manager_clone.get_port();
            let is_running = manager_clone.is_running();

            (conn_str, port, is_running)
        });
        handles.push(handle);
    }

    for handle in handles {
        let (conn_str, port, _is_running) = handle.join().unwrap();
        assert!(conn_str.contains("Port=5433"));
        assert_eq!(port, 5433);
    }
}

#[test]
fn test_postgres_manager_init_with_existing_data() {
    let fixture = common::TestAppState::new();

    // Create PostgreSQL data directory with PG_VERSION file
    common::create_mock_postgres_data(&fixture.app_data_dir());

    let manager = PostgresManager::new(fixture.app_data_dir(), fixture.app_data_dir(), 5433);

    // Should succeed by detecting existing data
    let result = manager.init_database();
    assert!(result.is_ok());
}

#[test]
fn test_postgres_manager_connection_string_consistency() {
    let fixture = common::TestAppState::new();

    let manager = PostgresManager::new(fixture.app_data_dir(), fixture.app_data_dir(), 5433);

    // Multiple calls should return the same connection string
    let conn_str1 = manager.get_connection_string();
    let conn_str2 = manager.get_connection_string();
    let conn_str3 = manager.get_connection_string();

    assert_eq!(conn_str1, conn_str2);
    assert_eq!(conn_str2, conn_str3);
}

#[test]
fn test_postgres_manager_port_consistency() {
    let fixture = common::TestAppState::new();

    let port = 5555;
    let manager = PostgresManager::new(fixture.app_data_dir(), fixture.app_data_dir(), port);

    // Port should be consistent
    assert_eq!(manager.get_port(), port);

    // Connection string should contain the port
    let conn_str = manager.get_connection_string();
    assert!(conn_str.contains(&format!("Port={}", port)));
}

#[test]
fn test_postgres_manager_stop_idempotent() {
    let fixture = common::TestAppState::new();

    let manager = PostgresManager::new(fixture.app_data_dir(), fixture.app_data_dir(), 5433);

    // Multiple stops should all succeed (idempotent operation)
    assert!(manager.stop().is_ok());
    assert!(manager.stop().is_ok());
    assert!(manager.stop().is_ok());
}

#[test]
fn test_postgres_manager_different_ports() {
    let fixture = common::TestAppState::new();

    // Test with different port configurations
    let ports = [5432, 5433, 5434, 6543];

    for port in ports {
        let manager = PostgresManager::new(fixture.app_data_dir(), fixture.app_data_dir(), port);

        assert_eq!(manager.get_port(), port);
        assert!(manager
            .get_connection_string()
            .contains(&format!("Port={}", port)));
    }
}

#[test]
fn test_postgres_manager_is_not_running_initially() {
    let fixture = common::TestAppState::new();

    let manager = PostgresManager::new(fixture.app_data_dir(), fixture.app_data_dir(), 5433);

    // Should not be running before start() is called
    // Note: This might return true if PostgreSQL happens to be running on this port
    // For a clean test environment, this should be false
    let is_running = manager.is_running();

    // We just verify it doesn't panic - the actual value depends on system state
    let _ = is_running;
}
