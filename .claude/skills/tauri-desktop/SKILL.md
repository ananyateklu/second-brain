---
name: tauri-desktop
description: Tauri 2.0 desktop app development with Rust, embedded PostgreSQL, and native macOS features. Use when user asks to work on desktop-specific functionality, IPC commands, Rust code, or native macOS integrations. Triggers on code in frontend/src-tauri/, tauri-bridge.ts, or desktop-specific patterns.
---

# Tauri Desktop Development

## Directory Structure

```text
frontend/src-tauri/
├── src/
│   ├── main.rs              # App entry, window management
│   ├── lib.rs               # Command registration
│   ├── commands/            # IPC command handlers
│   ├── services/            # Business logic (PostgreSQL, etc.)
│   └── utils/               # Helpers
├── tauri.conf.json          # App configuration
├── Cargo.toml               # Rust dependencies
└── capabilities/            # Permission definitions
```

## IPC Commands

### Defining Commands (Rust)

```rust
// commands/database.rs
#[tauri::command]
pub async fn get_database_status(
    state: tauri::State<'_, AppState>,
) -> Result<DatabaseStatus, String> {
    let service = state.database_service.lock().await;
    service.get_status().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn execute_query(
    state: tauri::State<'_, AppState>,
    query: String,
) -> Result<QueryResult, String> {
    let service = state.database_service.lock().await;
    service.execute(&query).await.map_err(|e| e.to_string())
}
```

### Registering Commands

```rust
// lib.rs
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::database::get_database_status,
            commands::database::execute_query,
            commands::system::get_app_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Calling from Frontend (TypeScript)

```typescript
// lib/tauri-bridge.ts
import { invoke } from '@tauri-apps/api/core';

export const tauriBridge = {
  database: {
    getStatus: () => invoke<DatabaseStatus>('get_database_status'),
    executeQuery: (query: string) => invoke<QueryResult>('execute_query', { query }),
  },
  system: {
    getAppInfo: () => invoke<AppInfo>('get_app_info'),
  },
};

// Usage in component
const status = await tauriBridge.database.getStatus();
```

## Embedded PostgreSQL

The desktop app runs an embedded PostgreSQL instance on port 5433.

### Service Lifecycle

```rust
pub struct PostgresService {
    process: Option<Child>,
    data_dir: PathBuf,
}

impl PostgresService {
    pub async fn start(&mut self) -> Result<(), Error> {
        // Initialize data directory if needed
        // Start postgres process
        // Wait for ready
    }

    pub async fn stop(&mut self) -> Result<(), Error> {
        // Graceful shutdown
    }
}
```

### Database Selection

```typescript
// Frontend detects environment
const isDesktop = window.__TAURI_INTERNALS__ !== undefined;
const databasePort = isDesktop ? 5433 : 5432;
```

## App State Management

```rust
pub struct AppState {
    pub database_service: Mutex<PostgresService>,
    pub settings: RwLock<AppSettings>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            database_service: Mutex::new(PostgresService::new()),
            settings: RwLock::new(AppSettings::default()),
        }
    }
}
```

## Window Management

```rust
#[tauri::command]
pub fn create_note_window(app: tauri::AppHandle) -> Result<(), String> {
    tauri::WebviewWindowBuilder::new(
        &app,
        "note-editor",
        tauri::WebviewUrl::App("note-editor".into())
    )
    .title("New Note")
    .inner_size(800.0, 600.0)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}
```

## Events (Rust → Frontend)

```rust
// Emit from Rust
app.emit("database-status-changed", status)?;

// Listen in TypeScript
import { listen } from '@tauri-apps/api/event';

const unlisten = await listen<DatabaseStatus>('database-status-changed', (event) => {
    console.log('Database status:', event.payload);
});
```

## Capabilities (Permissions)

```json
// capabilities/default.json
{
  "identifier": "default",
  "description": "Default capabilities",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "shell:allow-open",
    "dialog:allow-open",
    "fs:allow-read",
    "fs:allow-write"
  ]
}
```

## Configuration

```json
// tauri.conf.json key sections
{
  "productName": "Second Brain",
  "version": "1.0.0",
  "identifier": "com.secondbrain.app",
  "build": {
    "beforeDevCommand": "pnpm dev",
    "beforeBuildCommand": "pnpm build",
    "devUrl": "http://localhost:3000",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [{
      "title": "Second Brain",
      "width": 1200,
      "height": 800,
      "minWidth": 800,
      "minHeight": 600
    }]
  }
}
```

## Common Patterns

### Error Handling

```rust
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

// Convert to string for IPC
impl From<AppError> for String {
    fn from(err: AppError) -> Self {
        err.to_string()
    }
}
```

### Async Commands

```rust
#[tauri::command]
pub async fn long_running_task(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    // Spawn background task
    tauri::async_runtime::spawn(async move {
        // Do work...
        app.emit("task-progress", 50).ok();
        // More work...
        app.emit("task-complete", ()).ok();
    });

    Ok(())
}
```

## Common Commands

```bash
cd frontend && pnpm tauri dev     # Dev mode with hot reload
cd frontend && pnpm tauri build   # Production build
cd frontend && pnpm tauri icon    # Generate app icons
cargo check                        # Type check Rust code
cargo clippy                       # Lint Rust code
```

## Key Files

| File | Purpose |
|------|---------|
| `src-tauri/src/main.rs` | App entry point |
| `src-tauri/src/lib.rs` | Command registration |
| `src-tauri/tauri.conf.json` | App configuration |
| `lib/tauri-bridge.ts` | Frontend IPC wrapper |
