//! Port utilities for detecting conflicts and finding available ports.
//!
//! This module provides:
//! - Port availability checking
//! - Finding alternative ports when conflicts occur
//! - Process identification on ports (macOS/Unix)

use std::net::TcpListener;
use std::process::Command;

/// Check if a port is available for binding
pub fn is_port_available(port: u16) -> bool {
    TcpListener::bind(("127.0.0.1", port)).is_ok()
}

/// Find an available port starting from the given port
/// Returns the first available port, or None if no port is available in range
pub fn find_available_port(start_port: u16, max_attempts: u16) -> Option<u16> {
    for offset in 0..max_attempts {
        let port = start_port.saturating_add(offset);
        if is_port_available(port) {
            return Some(port);
        }
    }
    None
}

/// Get the process ID using a specific port (macOS/Unix only)
#[cfg(unix)]
pub fn get_process_on_port(port: u16) -> Option<ProcessInfo> {
    let output = Command::new("lsof")
        .args(["-ti", &format!(":{}", port)])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let pids = String::from_utf8_lossy(&output.stdout);
    let pid_str = pids.lines().next()?.trim();
    let pid: u32 = pid_str.parse().ok()?;

    // Get process name
    let name_output = Command::new("ps")
        .args(["-p", &pid.to_string(), "-o", "comm="])
        .output()
        .ok()?;

    let name = String::from_utf8_lossy(&name_output.stdout)
        .trim()
        .to_string();

    Some(ProcessInfo {
        pid,
        name: if name.is_empty() { None } else { Some(name) },
    })
}

#[cfg(not(unix))]
pub fn get_process_on_port(_port: u16) -> Option<ProcessInfo> {
    None
}

/// Information about a process using a port
#[derive(Debug, Clone)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: Option<String>,
}

/// Result of port validation
#[derive(Debug)]
pub enum PortStatus {
    /// Port is available
    Available,
    /// Port is in use by another process
    InUse { process: Option<ProcessInfo> },
    /// Port is in a reserved range (< 1024)
    Reserved,
    /// Port is out of valid range
    Invalid,
}

/// Validate a port and return its status
pub fn validate_port(port: u16) -> PortStatus {
    if port == 0 {
        return PortStatus::Invalid;
    }

    if port < 1024 {
        return PortStatus::Reserved;
    }

    if is_port_available(port) {
        PortStatus::Available
    } else {
        PortStatus::InUse {
            process: get_process_on_port(port),
        }
    }
}

/// Port range for services
#[derive(Debug, Clone, Copy)]
pub struct PortRange {
    pub postgres_start: u16,
    pub postgres_end: u16,
    pub backend_start: u16,
    pub backend_end: u16,
}

impl Default for PortRange {
    fn default() -> Self {
        Self {
            postgres_start: 5433,
            postgres_end: 5443,
            backend_start: 5001,
            backend_end: 5011,
        }
    }
}

impl PortRange {
    /// Find available ports for both PostgreSQL and backend
    pub fn find_available_ports(&self) -> Option<(u16, u16)> {
        let postgres_port = find_available_port(
            self.postgres_start,
            self.postgres_end - self.postgres_start + 1,
        )?;

        let backend_port = find_available_port(
            self.backend_start,
            self.backend_end - self.backend_start + 1,
        )?;

        Some((postgres_port, backend_port))
    }
}

// ============================================================
// Unit Tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_port_available_high_port() {
        // High ports should generally be available
        // Using a very high port that's unlikely to be in use
        let port = 59999;
        // Just test that the function doesn't panic
        let _ = is_port_available(port);
    }

    #[test]
    fn test_find_available_port_returns_some() {
        // Should find some available port in a wide range
        let result = find_available_port(50000, 100);
        assert!(result.is_some());
    }

    #[test]
    fn test_find_available_port_with_zero_attempts() {
        let result = find_available_port(50000, 0);
        assert!(result.is_none());
    }

    #[test]
    fn test_validate_port_invalid() {
        match validate_port(0) {
            PortStatus::Invalid => {}
            _ => panic!("Expected Invalid for port 0"),
        }
    }

    #[test]
    fn test_validate_port_reserved() {
        match validate_port(80) {
            PortStatus::Reserved => {}
            _ => panic!("Expected Reserved for port 80"),
        }
    }

    #[test]
    fn test_validate_port_available() {
        // Use a high unlikely-to-be-used port
        match validate_port(59998) {
            PortStatus::Available | PortStatus::InUse { .. } => {
                // Either is valid depending on system state
            }
            _ => panic!("Expected Available or InUse"),
        }
    }

    #[test]
    fn test_port_range_default() {
        let range = PortRange::default();
        assert_eq!(range.postgres_start, 5433);
        assert_eq!(range.backend_start, 5001);
    }

    #[test]
    fn test_port_range_find_available() {
        let range = PortRange {
            postgres_start: 55000,
            postgres_end: 55010,
            backend_start: 56000,
            backend_end: 56010,
        };

        let result = range.find_available_ports();
        assert!(result.is_some());
    }

    #[cfg(unix)]
    #[test]
    fn test_get_process_on_port_unused() {
        // Port 59997 is unlikely to be in use
        let result = get_process_on_port(59997);
        // Should return None for unused port
        assert!(result.is_none());
    }

    #[test]
    fn test_saturating_add_overflow() {
        // Test that saturating_add doesn't panic on overflow
        let start_port: u16 = 65530;
        let offset: u16 = 10;
        let result = start_port.saturating_add(offset);
        assert_eq!(result, 65535);
    }
}
