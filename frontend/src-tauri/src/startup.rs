//! Startup management with backoff, timeout, and structured status events.
//!
//! This module provides reliable service startup with:
//! - Exponential backoff for retries
//! - Configurable timeouts
//! - Status event emission to frontend
//! - Startup metrics collection

use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

/// Startup status events emitted to the frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum StartupEvent {
    /// PostgreSQL is starting
    PostgresStarting { port: u16 },
    /// PostgreSQL is ready
    PostgresReady { port: u16, duration_ms: u64 },
    /// PostgreSQL failed to start
    PostgresFailed { error: String, port: u16 },
    /// Backend is starting
    BackendStarting { port: u16 },
    /// Backend is ready
    BackendReady { port: u16, duration_ms: u64 },
    /// Backend failed to start
    BackendFailed { error: String, port: u16 },
    /// All services are ready
    AllServicesReady { total_duration_ms: u64 },
    /// Service startup failed
    StartupFailed { error: String },
    /// Port conflict detected
    PortConflict { port: u16, service: String },
    /// Retrying service startup
    RetryingStartup {
        service: String,
        attempt: u32,
        max_attempts: u32,
        delay_ms: u64,
    },
}

impl StartupEvent {
    /// Emit this event to the frontend
    pub fn emit(&self, app: &AppHandle) {
        if let Err(e) = app.emit("startup-event", self) {
            log::warn!("Failed to emit startup event: {}", e);
        }
    }
}

/// Configuration for startup behavior
#[derive(Debug, Clone)]
pub struct StartupConfig {
    /// Initial delay before first retry (milliseconds)
    pub initial_delay_ms: u64,
    /// Maximum delay between retries (milliseconds)
    pub max_delay_ms: u64,
    /// Multiplier for exponential backoff
    pub backoff_multiplier: f64,
    /// Maximum number of retry attempts
    pub max_attempts: u32,
    /// Overall timeout for service startup (seconds)
    pub timeout_secs: u64,
}

impl Default for StartupConfig {
    fn default() -> Self {
        Self {
            initial_delay_ms: 500,
            max_delay_ms: 10_000,
            backoff_multiplier: 2.0,
            max_attempts: 10,
            timeout_secs: 120,
        }
    }
}

/// Backoff strategy for retrying operations
pub struct ExponentialBackoff {
    config: StartupConfig,
    current_attempt: u32,
    current_delay_ms: u64,
}

impl ExponentialBackoff {
    pub fn new(config: StartupConfig) -> Self {
        Self {
            current_delay_ms: config.initial_delay_ms,
            current_attempt: 0,
            config,
        }
    }

    /// Get the next delay duration, or None if max attempts reached
    pub fn next_delay(&mut self) -> Option<Duration> {
        if self.current_attempt >= self.config.max_attempts {
            return None;
        }

        let delay = Duration::from_millis(self.current_delay_ms);
        self.current_attempt += 1;

        // Calculate next delay with exponential backoff
        self.current_delay_ms = ((self.current_delay_ms as f64) * self.config.backoff_multiplier)
            .min(self.config.max_delay_ms as f64) as u64;

        Some(delay)
    }

    /// Get the current attempt number (1-indexed)
    pub fn current_attempt(&self) -> u32 {
        self.current_attempt
    }

    /// Get the maximum number of attempts
    pub fn max_attempts(&self) -> u32 {
        self.config.max_attempts
    }

    /// Reset the backoff state
    pub fn reset(&mut self) {
        self.current_attempt = 0;
        self.current_delay_ms = self.config.initial_delay_ms;
    }
}

/// Metrics collected during startup
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct StartupMetrics {
    /// Time to start PostgreSQL (milliseconds)
    pub postgres_startup_ms: Option<u64>,
    /// Time to start backend (milliseconds)
    pub backend_startup_ms: Option<u64>,
    /// Total startup time (milliseconds)
    pub total_startup_ms: Option<u64>,
    /// Number of PostgreSQL retry attempts
    pub postgres_retry_count: u32,
    /// Number of backend retry attempts
    pub backend_retry_count: u32,
    /// Port used for PostgreSQL
    pub postgres_port: Option<u16>,
    /// Port used for backend
    pub backend_port: Option<u16>,
    /// Whether startup succeeded
    pub success: bool,
    /// Error message if startup failed
    pub error: Option<String>,
}

impl StartupMetrics {
    pub fn new() -> Self {
        Self::default()
    }

    /// Mark PostgreSQL as started
    pub fn mark_postgres_started(&mut self, duration: Duration, port: u16, retries: u32) {
        self.postgres_startup_ms = Some(duration.as_millis() as u64);
        self.postgres_port = Some(port);
        self.postgres_retry_count = retries;
    }

    /// Mark backend as started
    pub fn mark_backend_started(&mut self, duration: Duration, port: u16, retries: u32) {
        self.backend_startup_ms = Some(duration.as_millis() as u64);
        self.backend_port = Some(port);
        self.backend_retry_count = retries;
    }

    /// Mark startup as complete
    pub fn mark_complete(&mut self, total_duration: Duration) {
        self.total_startup_ms = Some(total_duration.as_millis() as u64);
        self.success = true;
    }

    /// Mark startup as failed
    pub fn mark_failed(&mut self, error: String) {
        self.success = false;
        self.error = Some(error);
    }
}

/// Timer for measuring startup durations
pub struct StartupTimer {
    start: Instant,
}

impl StartupTimer {
    pub fn new() -> Self {
        Self {
            start: Instant::now(),
        }
    }

    /// Get elapsed time
    pub fn elapsed(&self) -> Duration {
        self.start.elapsed()
    }

    /// Get elapsed milliseconds
    pub fn elapsed_ms(&self) -> u64 {
        self.elapsed().as_millis() as u64
    }
}

impl Default for StartupTimer {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================
// Unit Tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_startup_config_default() {
        let config = StartupConfig::default();
        assert_eq!(config.initial_delay_ms, 500);
        assert_eq!(config.max_delay_ms, 10_000);
        assert_eq!(config.backoff_multiplier, 2.0);
        assert_eq!(config.max_attempts, 10);
        assert_eq!(config.timeout_secs, 120);
    }

    #[test]
    fn test_exponential_backoff_delays() {
        let config = StartupConfig {
            initial_delay_ms: 100,
            max_delay_ms: 1000,
            backoff_multiplier: 2.0,
            max_attempts: 5,
            timeout_secs: 60,
        };
        let mut backoff = ExponentialBackoff::new(config);

        // First attempt: 100ms
        assert_eq!(backoff.next_delay(), Some(Duration::from_millis(100)));
        // Second attempt: 200ms
        assert_eq!(backoff.next_delay(), Some(Duration::from_millis(200)));
        // Third attempt: 400ms
        assert_eq!(backoff.next_delay(), Some(Duration::from_millis(400)));
        // Fourth attempt: 800ms
        assert_eq!(backoff.next_delay(), Some(Duration::from_millis(800)));
        // Fifth attempt: 1000ms (capped at max)
        assert_eq!(backoff.next_delay(), Some(Duration::from_millis(1000)));
        // Sixth attempt: None (max attempts reached)
        assert_eq!(backoff.next_delay(), None);
    }

    #[test]
    fn test_backoff_reset() {
        let config = StartupConfig {
            initial_delay_ms: 100,
            max_attempts: 3,
            ..Default::default()
        };
        let mut backoff = ExponentialBackoff::new(config);

        // Use up some attempts
        backoff.next_delay();
        backoff.next_delay();
        assert_eq!(backoff.current_attempt(), 2);

        // Reset
        backoff.reset();
        assert_eq!(backoff.current_attempt(), 0);
        assert_eq!(backoff.next_delay(), Some(Duration::from_millis(100)));
    }

    #[test]
    fn test_startup_metrics_marking() {
        let mut metrics = StartupMetrics::new();

        metrics.mark_postgres_started(Duration::from_millis(500), 5433, 0);
        assert_eq!(metrics.postgres_startup_ms, Some(500));
        assert_eq!(metrics.postgres_port, Some(5433));
        assert_eq!(metrics.postgres_retry_count, 0);

        metrics.mark_backend_started(Duration::from_millis(1000), 5001, 2);
        assert_eq!(metrics.backend_startup_ms, Some(1000));
        assert_eq!(metrics.backend_port, Some(5001));
        assert_eq!(metrics.backend_retry_count, 2);

        metrics.mark_complete(Duration::from_millis(1500));
        assert!(metrics.success);
        assert_eq!(metrics.total_startup_ms, Some(1500));
    }

    #[test]
    fn test_startup_metrics_failure() {
        let mut metrics = StartupMetrics::new();
        metrics.mark_failed("Connection refused".to_string());

        assert!(!metrics.success);
        assert_eq!(metrics.error, Some("Connection refused".to_string()));
    }

    #[test]
    fn test_startup_timer() {
        let timer = StartupTimer::new();
        std::thread::sleep(Duration::from_millis(10));
        assert!(timer.elapsed_ms() >= 10);
    }

    #[test]
    fn test_startup_event_serialization() {
        let event = StartupEvent::PostgresReady {
            port: 5433,
            duration_ms: 1500,
        };
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("PostgresReady"));
        assert!(json.contains("5433"));
    }
}
