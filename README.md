# Second Brain

<div align="center">

<img src="frontend/src/assets/second-brain-logo-dark-mode.png" alt="Second Brain Logo - Dark Mode" width="200"/>

[![Backend Tests](https://github.com/ananyateklu/second-brain/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/ananyateklu/second-brain/actions/workflows/backend-tests.yml)
[![Frontend Tests](https://github.com/ananyateklu/second-brain/actions/workflows/frontend-tests.yml/badge.svg)](https://github.com/ananyateklu/second-brain/actions/workflows/frontend-tests.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![.NET](https://img.shields.io/badge/.NET-10.0-512BD4)](https://dotnet.microsoft.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6)](https://www.typescriptlang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131)](https://tauri.app/)

</div>

Intelligent knowledge management with AI-powered chat, smart notes, AI agents, advanced RAG (Retrieval-Augmented Generation) with hybrid search, and multi-provider image generation.

## Technical Highlights

- **Production-grade RAG pipeline** with HyDE, hybrid search (vector + BM25), RRF fusion, and LLM reranking
- **Multi-provider AI architecture** supporting 5 LLM providers with circuit breaker resilience
- **Native macOS app** via Tauri 2.0 with embedded PostgreSQL and bundled .NET backend
- **Clean Architecture** backend with CQRS/MediatR, Result pattern, and comprehensive error handling

## TL;DR

```bash
# Clone and run with Docker (fastest way to get started)
git clone https://github.com/ananyateklu/second-brain.git && cd second-brain
cp .env.example .env  # Edit with your AI provider API keys
docker-compose up -d  # Access at http://localhost:3000
```

## Table of Contents

- [Screenshots](#screenshots)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
  - [Docker Compose](#4-run-with-docker-compose-recommended)
  - [Local Development](#5-run-locally-development)
  - [Desktop App (macOS)](#6-run-as-desktop-app-macos)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Configuration](#configuration)
- [Development](#development)
- [Git & GitHub Integration](#git--github-integration)
- [iOS Sync](#ios-sync)
- [Troubleshooting](#troubleshooting)
- [Architecture](#architecture)
- [License](#license)

## Screenshots

<div align="center">

<table>
<tr>
<td align="center">
<img src="frontend/src/assets/dashboard-screenshot.png" alt="Dashboard" width="400"/>
<br><strong>Dashboard</strong>
</td>
<td align="center">
<img src="frontend/src/assets/chat-screenshot.png" alt="Chat" width="400"/>
<br><strong>Chat</strong>
</td>
</tr>
<tr>
<td align="center">
<img src="frontend/src/assets/aisettings-screenshot.png" alt="Settings" width="400"/>
<br><strong>Integration Settings</strong>
</td>
<td align="center">
<img src="frontend/src/assets/indexing-screenshot.png" alt="Indexing" width="400"/>
<br><strong>RAG Indexing</strong>
</td>
</tr>
</table>

</div>

## Features

### Core Features

- **Email/Password Authentication**: Secure registration and login with JWT tokens
- **Smart Notes**: Create, organize, and search your notes with a rich text editor
- **AI Chat**: Multi-provider AI chat (OpenAI, Claude, Gemini, Ollama, Grok) with streaming responses
- **AI Agents**: Agent mode with tool execution for automated note management
- **AI Provider Health**: Real-time monitoring of AI provider status
- **Git Integration**: Local Git repository management with branch operations and commit history
- **GitHub Integration**: Connect to GitHub for pull requests, issues, and workflow management
- **macOS Desktop App**: Native desktop application built with Tauri 2.0 featuring bundled backend, embedded database, and offline capability
- **iOS Sync**: Bidirectional sync with iPhone/iPad via iOS Shortcuts
- **Analytics Dashboard**: Track your notes, AI usage, and token consumption

### Advanced RAG Features

- **Hybrid Search**: Combines vector similarity search with BM25 lexical search using Reciprocal Rank Fusion (RRF)
- **HyDE (Hypothetical Document Embeddings)**: Generates hypothetical documents to improve retrieval accuracy
- **Multi-Query Generation**: Creates query variations to capture different phrasings
- **LLM Reranking**: Uses AI to score and reorder retrieved results for better relevance
- **RAG Analytics Dashboard**: Track query performance, user feedback, and identify areas for improvement
- **Topic Clustering**: Automatically clusters queries to identify patterns and problem areas

## Tech Stack

### Backend

- **Framework**: ASP.NET Core 10.0
- **Database**: PostgreSQL with pgvector extension + full-text search
- **Authentication**: JWT tokens with BCrypt password hashing
- **Vector Stores**: PostgreSQL (pgvector), Pinecone
- **AI Providers**: OpenAI, Claude (Anthropic), Google Gemini, Ollama, X.AI (Grok)
- **Embedding Providers**: OpenAI, Gemini, Ollama
- **Image Generation**: OpenAI DALL-E, Google Gemini, X.AI Grok

### Frontend

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Routing**: React Router v7
- **State Management**: Zustand
- **Styling**: Tailwind CSS v4
- **Data Fetching**: TanStack Query v5
- **Rich Text Editor**: TipTap
- **Charts**: Recharts

### Desktop App (macOS)

- **Framework**: Tauri 2.0 (Rust + WebKit)
- **Backend**: Bundled .NET self-contained executable
- **Database**: PostgreSQL 18 (Homebrew) with pgvector on port 5433
- **Distribution**: DMG installer, universal binary (Intel + Apple Silicon)

## Project Structure

```text
second-brain/
├── backend/
│   └── src/
│       ├── SecondBrain.API/          # Controllers, middleware, Program.cs
│       ├── SecondBrain.Application/  # Services, CQRS commands/queries, DTOs
│       ├── SecondBrain.Core/         # Entities, interfaces, Result pattern
│       └── SecondBrain.Infrastructure/ # EF Core, repositories
├── frontend/
│   └── src/
│       ├── features/                 # Domain modules (chat, notes, agents, rag)
│       ├── services/                 # API service layer
│       ├── store/                    # Zustand slices (auth, settings, theme)
│       ├── components/               # Shared UI components
│       └── lib/                      # API client, router, Tauri bridge
├── frontend/src-tauri/              # Rust desktop app shell
├── database/                        # SQL schema files
└── docs/adr/                        # Architecture Decision Records
```

**Key Patterns**: Clean Architecture (backend), CQRS with MediatR, Result pattern for errors, Factory pattern for AI providers, Slice-based Zustand store. See `docs/adr/` for detailed rationale.

## Prerequisites

- **Docker & Docker Compose** (recommended for deployment)
- **.NET 10 SDK** or later (for local development)
- **Node.js 18+** and **pnpm** (for local development)
- **AI Provider API Keys** (at least one: OpenAI, Anthropic, Gemini, X.AI, or Ollama)
- **Pinecone Account** (optional, for cloud vector search)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/ananyateklu/second-brain.git
cd second-brain
```

### 2. Environment Variables Setup

You need to configure environment variables in three locations:

#### Root `.env` (for Docker Compose)

```bash
cp .env.example .env
```

Edit `.env` with your values:

```bash
# PostgreSQL Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=secondbrain

# JWT Configuration
JWT_SECRET_KEY=YourSuperSecretKeyThatIsAtLeast32CharactersLong!
JWT_ISSUER=SecondBrain
JWT_AUDIENCE=SecondBrainUsers

# AI Provider API Keys (configure at least one)
OPENAI_API_KEY=your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
XAI_API_KEY=your-xai-api-key

# Vector Store Configuration
VECTOR_STORE_PROVIDER=PostgreSQL
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX_NAME=second-brain-index

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
CORS_ALLOW_LOCAL_NETWORK=false

# Ollama Configuration (optional, for local models)
OLLAMA_BASE_URL=http://localhost:11434

# Application Settings
ASPNETCORE_ENVIRONMENT=Production
```

#### Backend `.env` (for local development)

```bash
cp backend/src/SecondBrain.API/.env.example backend/src/SecondBrain.API/.env
```

Edit with appropriate values for local development.

#### Frontend `.env` (for local development)

```bash
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env`:

```bash
VITE_API_URL=http://localhost:5001/api
```

### 3. Generate SSL Certificates (for HTTPS)

```bash
chmod +x generate_certs.sh
./generate_certs.sh
```

This creates self-signed certificates in `frontend/certs/` for local HTTPS development.

**For macOS users:** To trust the certificate:

1. Open **Keychain Access**
2. Drag `frontend/certs/nginx-selfsigned.crt` into the **System** keychain
3. Double-click the certificate → Expand **Trust** → Set to **Always Trust**

### 4. Run with Docker Compose (Recommended)

```bash
docker-compose up -d
```

This starts three services:

- **PostgreSQL** with pgvector (port 5432)
- **Backend API** (internal port 8080)
- **Frontend** with nginx (ports 3000/443)

Access the application:

- **Frontend:** `http://localhost:3000`
- **Frontend HTTPS:** `https://localhost:443`
- **Backend API:** `http://localhost:3000/api` (proxied through nginx)

View logs:

```bash
docker-compose logs -f
```

Stop services:

```bash
docker-compose down
```

### 5. Run Locally (Development)

**Terminal 1 - Start PostgreSQL:**

```bash
docker-compose up -d postgres
```

**Terminal 2 - Backend:**

```bash
cd backend/src/SecondBrain.API
dotnet restore
dotnet watch run
```

Backend runs at `http://localhost:5001`

**Terminal 3 - Frontend:**

```bash
cd frontend
pnpm install
pnpm dev
```

Frontend runs at `http://localhost:3000`

### 6. Run as Desktop App (macOS)

The desktop app bundles everything into a single native application.

#### Desktop Prerequisites

```bash
# Install PostgreSQL 18 with pgvector
brew install postgresql@18 pgvector

# Install Rust toolchain (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add aarch64-apple-darwin x86_64-apple-darwin
```

#### Build and Run

```bash
# Build backend for macOS
./backend/publish-mac.sh

# Build and run desktop app
cd frontend
pnpm tauri dev      # Development mode
pnpm tauri build    # Production DMG
```

The app stores data in `~/Library/Application Support/com.secondbrain.desktop/`:

- `secrets.json` - API keys (configured via Settings)
- `postgresql/` - Database files

See [ADR 007](docs/adr/007-tauri-macos-desktop-app.md) for full architecture details.

## Authentication

### Email/Password Authentication

Second Brain uses a database-backed authentication system with JWT tokens:

1. **Register**: Navigate to `http://localhost:3000/login` and click "Create one"
2. **Login**: Enter your email and password to sign in
3. **Session**: JWT tokens are stored in browser localStorage and automatically included in API requests

### Security Features

- **Password Hashing**: BCrypt with salt (12 rounds)
- **JWT Tokens**: HS256 signed tokens with configurable expiry
- **Secure Storage**: Passwords are never stored in plain text

### API Key Generation

For iOS sync and external API access:

1. Click on your profile picture in the top right
2. Select "Generate API Key"
3. Copy and save your API key securely

See [iOS Sync](#ios-sync) section for mobile setup.

## API Endpoints

The API follows RESTful conventions with JWT authentication. Key endpoint groups:

| Group | Base Path | Description |
|-------|-----------|-------------|
| Auth | `/api/auth` | Registration, login, API key generation |
| Notes | `/api/notes` | CRUD operations, bulk delete, import |
| Chat | `/api/chat` | Conversations, streaming messages (SSE), image generation |
| Agents | `/api/agent` | Agent mode with tool execution |
| AI | `/api/ai` | Provider health, completions |
| Git | `/api/git` | Repository management, branch operations, commit history |
| GitHub | `/api/github` | Pull requests, issues, workflow runs, repository management |
| Indexing | `/api/indexing` | RAG indexing jobs and stats |
| RAG Analytics | `/api/rag/analytics` | Query logs, feedback, topic clustering |
| Stats | `/api/stats` | AI usage statistics |

**Full API documentation available at `/swagger` when running the backend.**

## Configuration

### JWT Settings

Configure in `appsettings.json`:

```json
{
  "Jwt": {
    "SecretKey": "YourSuperSecretKeyThatIsAtLeast32CharactersLong!",
    "Issuer": "SecondBrain",
    "Audience": "SecondBrainUsers",
    "ExpiryMinutes": 1440
  }
}
```

### AI Providers

Configure in `appsettings.json` or via environment variables. Each provider supports:

| Provider | Config Keys | Default Model |
|----------|-------------|---------------|
| OpenAI | `ApiKey`, `DefaultModel`, `MaxTokens`, `Temperature` | `gpt-4o-mini` |
| Anthropic | `ApiKey`, `DefaultModel` | `claude-3-5-haiku-latest` |
| Gemini | `ApiKey`, `DefaultModel` | `gemini-2.0-flash` |
| Ollama | `BaseUrl`, `DefaultModel` | `qwen3:4b` |
| X.AI | `ApiKey`, `DefaultModel` | `grok-3-mini` |

See `backend/src/SecondBrain.API/appsettings.json` for full configuration options including embedding providers and RAG settings.

## Development

### Running Tests

```bash
# Backend tests
cd backend
dotnet test

# Frontend tests
cd frontend
pnpm test
```

See [Quick Start](#quick-start) for development server commands.

## Git & GitHub Integration

### Git Repository Management

Connect and manage local Git repositories directly within Second Brain:

**Features:**

- **Repository Operations** - Clone, fetch, and configure local repositories
- **Branch Management** - Create, switch, and publish branches
- **Commit History** - View and analyze commit logs
- **SSH Authentication** - Secure Git operations with SSH keys

**API Reference:**

```bash
# Get branches for a repository
GET /api/git/repositories/{repoId}/branches

# Create a new branch
POST /api/git/repositories/{repoId}/branches
{ "branchName": "feature/new-feature", "fromBranch": "main" }

# Switch to a branch
POST /api/git/repositories/{repoId}/checkout
{ "branchName": "feature/new-feature" }

# Publish branch to remote
POST /api/git/repositories/{repoId}/publish
{ "branchName": "feature/new-feature", "remoteName": "origin" }

# Get commit history
GET /api/git/repositories/{repoId}/commits?branch=main
```

### GitHub API Integration

Access GitHub data directly from Second Brain for pull requests, issues, and workflows:

**Features:**

- **Pull Requests** - View, filter, and manage PRs across repositories
- **Issues** - Browse and track GitHub issues
- **Workflow Runs** - Monitor CI/CD pipeline execution
- **Repository Management** - Access your GitHub repositories

**API Reference:**

```bash
# Get user's repositories
GET /api/github/repositories

# Get pull requests
GET /api/github/repositories/{owner}/{repo}/pulls?state=open

# Get issues
GET /api/github/repositories/{owner}/{repo}/issues

# Get workflow runs
GET /api/github/repositories/{owner}/{repo}/actions/runs
```

**Configuration:**

Add GitHub settings to `appsettings.json`:

```json
{
  "GitHub": {
    "ApiBaseUrl": "https://api.github.com",
    "ApiVersion": "2022-11-28"
  }
}
```

For authentication, store your GitHub personal access token in the user preferences or environment variables.

---

## iOS Sync

Sync notes between your iPhone/iPad and Second Brain using iOS Shortcuts.

**Features:**

- Import notes from Apple Notes (single or batch)
- Export notes back to Apple Notes or Files app
- Automatic duplicate detection via external IDs
- Preserves timestamps and folder structure
- Automation support for scheduled sync

See [iOS Notes Sync Guide](./docs/ios-notes-sync-guide.md) for setup instructions and [ADR 008](./docs/adr/008-ios-shortcuts-integration.md) for architecture details.

## Troubleshooting

### Setup Checklist

Before running, verify:

- [ ] .NET 10 SDK installed (`dotnet --version`)
- [ ] Node.js 18+ installed (`node --version`)
- [ ] pnpm installed (`pnpm --version`)
- [ ] Docker installed (if using Docker)
- [ ] All `.env` files created with required values
- [ ] SSL certificates generated (`./generate_certs.sh`) for HTTPS
- [ ] At least one AI provider API key configured

### PostgreSQL Connection Issues

- Verify PostgreSQL container is running: `docker-compose ps`
- Check connection string format: `Host=localhost;Port=5432;Database=secondbrain;Username=postgres;Password=yourpassword`
- Ensure pgvector extension is installed (automatic with `pgvector/pgvector:pg18` image)
- Check logs: `docker-compose logs postgres`

### Authentication Issues

- Ensure JWT secret key is at least 32 characters
- Check that the token is being stored in localStorage
- Verify the Authorization header is being sent: `Bearer <token>`
- For registration errors, check if email already exists

### CORS Errors

- Update `CORS_ALLOWED_ORIGINS` in `.env` with your frontend URL
- For local network access, set `CORS_ALLOW_LOCAL_NETWORK=true`
- Ensure the origin includes protocol and port (e.g., `http://localhost:3000`)

### Docker Health Check Failing

- Check backend logs: `docker-compose logs backend`
- Verify all environment variables are set in `.env`
- Check the health endpoint: `curl http://localhost:8080/api/health`

### Vector Search Not Working

- Verify embedding provider is configured (OpenAI or Gemini API key)
- Run indexing: `POST /api/indexing/start`
- Check index stats: `GET /api/indexing/stats`
- Verify vector dimensions match (1536 for OpenAI, 768 for Gemini/Ollama)

### RAG Not Returning Results

- Check if hybrid search is enabled in settings
- Verify BM25 search vectors are populated (run reindexing)
- Check RAG analytics for query performance: `/analytics` page
- Review similarity threshold settings

### Agent Mode Issues

- Check supported providers: `GET /api/agent/supported-providers`
- Ensure the AI provider supports function calling
- Check conversation is marked with `agentEnabled: true`

### Image Generation Issues

- Verify the provider API key is configured (OpenAI, Gemini, or Grok)
- Check supported models: DALL-E 3/2, Gemini image models, Grok-2-image
- Ensure `imageGenerationEnabled: true` on the conversation

### SSL Certificate Issues (macOS)

- Trust the certificate in Keychain Access
- Restart browser after trusting
- For Chrome, navigate to `chrome://flags/#allow-insecure-localhost`

### Ports Reference

| Service | Port | Notes |
|---------|------|-------|
| Frontend (dev) | 3000 | Vite dev server or nginx |
| Frontend HTTPS | 443 | nginx with SSL |
| Backend API | 5001 | ASP.NET Core (local dev) |
| Backend API (Docker) | 8080 | Internal container port |
| PostgreSQL (Web/Docker) | 5432 | Standard PostgreSQL port |
| PostgreSQL (Desktop) | 5433 | Non-standard to avoid conflicts |
| Ollama | 11434 | Local AI models |

## Architecture

### Web Deployment

```text
    ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
    │    Frontend     │────▶│   nginx proxy   │────▶│    Backend      │
    │   React/Vite    │     │   (port 3000)   │     │  ASP.NET Core   │
    └─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                             │
                                        ┌────────────────────┴────────────────────┐
                                        │                                         │
                                        ▼                                         ▼
                              ┌─────────────────┐                       ┌─────────────────┐
                              │   PostgreSQL    │                       │  AI Providers   │
                              │   + pgvector    │                       │  OpenAI, Claude │
                              │  (Users, Notes, │                       │  Gemini, Ollama │
                              │   Embeddings)   │                       │      Grok       │
                              └─────────────────┘                       └─────────────────┘
```

### Desktop App Architecture

```text
                ┌──────────────────────────────────────────────────────────────┐
                │                    Second Brain.app                          │
                │  ┌────────────────────────────────────────────────────────┐  │
                │  │         Tauri Shell (Rust) - Service Lifecycle         │  │
                │  └────────────────────────────────────────────────────────┘  │
                │                          │ IPC                               │
                │  ┌────────────────────────────────────────────────────────┐  │
                │  │              React Frontend (WebView)                  │  │
                │  └────────────────────────────────────────────────────────┘  │
                │                          │ localhost:5001                    │
                │  ┌────────────────────────────────────────────────────────┐  │
                │  │         .NET Backend (Sidecar Process)                 │  │
                │  └────────────────────────────────────────────────────────┘  │
                │                          │                                   │
                │  ┌────────────────────────────────────────────────────────┐  │
                │  │         PostgreSQL (port 5433) + pgvector              │  │
                │  └────────────────────────────────────────────────────────┘  │
                └──────────────────────────────────────────────────────────────┘
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
