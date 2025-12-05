# ADR 007: Tauri macOS Desktop App

## Status

Accepted

## Context

Second Brain needed to transition from a web-only application to a native macOS desktop application to provide:

1. **Native Desktop Experience**: Users expect native window management, menu bar integration, and system tray support
2. **Offline Capability**: The app should work without requiring a separate backend server running
3. **Simplified Deployment**: Users should be able to install a single `.app` bundle without managing multiple services
4. **Native Features**: Access to macOS notifications, file dialogs, clipboard, and keyboard shortcuts
5. **Data Privacy**: Keep user data local on their machine rather than in the cloud

### Requirements

- Bundle the existing React frontend without rewriting
- Include the .NET backend as a managed process
- Provide vector database support for RAG functionality (pgvector)
- Support secure storage of API keys
- Enable auto-updates for future releases
- Target both Apple Silicon and Intel Macs

### Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| **Electron** | Mature ecosystem, familiar Node.js | Large bundle size (~150MB+), high memory usage |
| **Native Swift/AppKit** | Best native integration | Requires complete frontend rewrite |
| **PWA** | No app store needed | Limited native access, no sidecar support |
| **Tauri 2.0** | Small bundle (~20MB), Rust security, sidecar support | Newer ecosystem, WebKit-only on macOS |

## Decision

We will use **Tauri 2.0** to build the macOS desktop application with the following architecture:

### Architecture Overview

```text
┌──────────────────────────────────────────────────────────────┐
│                    Second Brain.app                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Tauri Application Shell (Rust)            │ │
│  │  - Manages PostgreSQL & backend lifecycle              │ │
│  │  - Handles secrets storage & IPC                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                          │ IPC                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              React Frontend (WebView)                  │ │
│  │  - All existing React components                       │ │
│  │  - TanStack Query, Zustand                             │ │
│  │  - Tauri API for native features                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                          │ localhost                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         .NET Backend (Sidecar Process)                 │ │
│  │  - SecondBrain.API (self-contained)                    │ │
│  │  - All AI provider integrations                        │ │
│  │  - RAG pipeline                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                          │                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              PostgreSQL (System Installation)          │ │
│  │  - pgvector for embeddings                             │ │
│  │  - Data in ~/Library/Application Support               │ │
│  │  - Port 5433 (non-standard to avoid conflicts)         │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Tauri Shell | `frontend/src-tauri/src/lib.rs` | Main app, service lifecycle, IPC commands |
| Database Manager | `frontend/src-tauri/src/database.rs` | PostgreSQL initialization and management |
| Tauri Bridge | `frontend/src/lib/tauri-bridge.ts` | Frontend IPC commands |
| Native Notifications | `frontend/src/lib/native-notifications.ts` | Cross-platform notifications |
| Backend Resources | `frontend/src-tauri/resources/backend/` | Bundled .NET API |

### Backend Bundling Strategy

The backend is bundled in `resources/backend/` rather than using Tauri's `externalBin` sidecar mechanism. This provides:

- Full control over environment variables (API keys)
- Custom process lifecycle management
- Simpler configuration without target-triple naming

```text
Second Brain.app/
└── Contents/
    └── Resources/
        └── resources/
            └── backend/
                ├── secondbrain-api          # Self-contained .NET executable
                ├── SecondBrain.API.dll
                ├── appsettings.json
                └── ... (other .NET assemblies)
```

### Database Strategy

Uses system-installed PostgreSQL (Homebrew) rather than bundling PostgreSQL binaries:

- Avoids macOS code signing/notarization issues with bundled binaries
- Reduces app bundle size significantly
- PostgreSQL 17 (preferred) or 16 with pgvector extension
- Data stored in `~/Library/Application Support/com.secondbrain.desktop/postgresql/`
- Uses port 5433 to avoid conflicts with system PostgreSQL on 5432

**Critical Implementation Detail**: Must set `LC_ALL=C` and `LANG=C` environment variables when starting PostgreSQL to prevent "postmaster became multithreaded during startup" error on macOS.

### Secrets Management

API keys stored in `~/Library/Application Support/com.secondbrain.desktop/secrets.json`:

```json
{
  "openai_api_key": "sk-...",
  "anthropic_api_key": "sk-ant-...",
  "gemini_api_key": "...",
  "xai_api_key": "xai-...",
  "ollama_base_url": "http://localhost:11434",
  "pinecone_api_key": null,
  "pinecone_environment": null,
  "pinecone_index_name": null
}
```

### Native Features

- **Menu Bar**: Standard macOS menus (File, Edit, View, Window, Help)
- **System Tray**: Icon with restart backend/database options
- **Notifications**: Native macOS notifications for AI responses, indexing
- **File Dialogs**: Native open/save dialogs for import/export
- **Single Instance**: Prevents multiple app instances
- **Window Behavior**: Hide to dock on close (macOS convention)

### Configuration Files

**`tauri.conf.json`** key settings:

```json
{
  "productName": "Second Brain",
  "identifier": "com.secondbrain.desktop",
  "bundle": {
    "targets": ["dmg", "app"],
    "resources": ["resources/**/*"],
    "macOS": {
      "entitlements": "entitlements.plist",
      "minimumSystemVersion": "10.15"
    }
  }
}
```

**`capabilities/default.json`** permissions:

- `shell:allow-spawn`, `shell:allow-kill` - Process management
- `fs:scope-appdata-recursive` - App data access
- `notification:allow-notify` - System notifications
- `dialog:allow-open`, `dialog:allow-save` - File dialogs

### Build Process

```bash
# 1. Build backend
./backend/publish-mac.sh

# 2. Build Tauri app
cd frontend
pnpm tauri build --target universal-apple-darwin
```

Output: `frontend/src-tauri/target/release/bundle/dmg/Second Brain_*.dmg`

## Consequences

### Positive

- **Small Bundle Size**: ~20MB vs Electron's ~150MB+
- **Native Performance**: Uses WebKit (Safari's engine) with lower memory footprint
- **Security**: Rust's memory safety, capability-based permissions, sandboxed WebView
- **Native Integration**: Full access to macOS APIs via Tauri plugins
- **Existing Code Reuse**: React frontend works unchanged
- **Sidecar Support**: Built-in support for bundling the .NET backend
- **Auto-Updates**: Tauri updater plugin for seamless updates

### Negative

- **PostgreSQL Dependency**: Requires users to have Homebrew PostgreSQL installed
- **Platform-Specific Code**: Rust code needed for macOS-specific features
- **WebKit Limitations**: Some CSS/JS features may differ from Chrome
- **Newer Ecosystem**: Fewer resources compared to Electron
- **Build Complexity**: Requires Rust toolchain + .NET SDK + Node.js

### Neutral

- Single-instance enforcement is both a feature and constraint
- macOS entitlements required for network access, spawning processes
- App data stored in standard macOS location (`~/Library/Application Support/`)
- Universal binary targets both Apple Silicon and Intel Macs

## Implementation Reference

### Prerequisites

```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add aarch64-apple-darwin x86_64-apple-darwin

# Install PostgreSQL and pgvector
brew install postgresql@17 pgvector

# Install Node.js and pnpm
brew install node
npm install -g pnpm
```

### Development Commands

```bash
cd frontend

# Development mode
pnpm tauri dev

# Production build
pnpm tauri build

# Universal binary (Intel + Apple Silicon)
pnpm tauri build --target universal-apple-darwin
```

### Quick Reference

```bash
# App data directory
open ~/Library/Application\ Support/com.secondbrain.desktop/

# View secrets
cat ~/Library/Application\ Support/com.secondbrain.desktop/secrets.json

# Check PostgreSQL status
/opt/homebrew/opt/postgresql@17/bin/pg_isready -h localhost -p 5433

# Connect to database
/opt/homebrew/opt/postgresql@17/bin/psql -h localhost -p 5433 -U secondbrain -d secondbrain

# View logs
cat ~/Library/Logs/com.secondbrain.desktop/*.log | tail -100

# Remove quarantine (development)
xattr -cr "/Applications/Second Brain.app"

# Check ports
lsof -i :5001  # Backend
lsof -i :5433  # PostgreSQL
```

### Known Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| PostgreSQL "multithreaded startup" | Missing locale env vars | Set `LC_ALL=C` and `LANG=C` |
| Backend connection refused | Firewall or port conflict | Use `127.0.0.1` instead of `localhost` |
| Blank window on Intel Macs | WebKit rendering issue | Set `minimumSystemVersion: "10.15"`, disable transparency |
| App blocked by Gatekeeper | Unsigned app | `xattr -cr` for dev, proper signing for production |

### Code Signing and Distribution

For production distribution:

1. Obtain Developer ID Application certificate from Apple
2. Configure signing identity in `tauri.conf.json`
3. Set up notarization with App Store Connect credentials
4. Build with: `pnpm tauri build --target universal-apple-darwin`
5. Notarize: `xcrun notarytool submit ... --wait`
6. Staple: `xcrun stapler staple ...`

### Future Considerations

- **iOS Support**: Tauri 2.0 supports iOS, but requires cloud backend (no sidecar)
- **Windows/Linux**: Same codebase with platform-specific adjustments
- **SQLite Migration**: Could replace PostgreSQL with SQLite + sqlite-vec for simpler deployment
- **Auto-Updates**: Configure Tauri updater plugin with release server

## References

- [Tauri v2 Documentation](https://v2.tauri.app/)
- [Tauri Sidecar Guide](https://v2.tauri.app/develop/sidecar/)
- [Tauri Security](https://v2.tauri.app/security/)
- [Apple Code Signing Guide](https://developer.apple.com/library/archive/documentation/Security/Conceptual/CodeSigningGuide/)
- [.NET macOS Deployment](https://learn.microsoft.com/en-us/dotnet/core/deploying/)
