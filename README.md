# Second Brain

<div align="center">

<img src="frontend/src/assets/second-brain-logo-dark-mode.png" alt="Second Brain Logo - Dark Mode" width="200"/>

[![Backend Tests](https://github.com/ananyateklu/second-brain/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/ananyateklu/second-brain/actions/workflows/backend-tests.yml)
[![Frontend Tests](https://github.com/ananyateklu/second-brain/actions/workflows/frontend-tests.yml/badge.svg)](https://github.com/ananyateklu/second-brain/actions/workflows/frontend-tests.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![.NET](https://img.shields.io/badge/.NET-10.0-512BD4)](https://dotnet.microsoft.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6)](https://www.typescriptlang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131)](https://tauri.app/)

</div>

Intelligent knowledge management with AI-powered chat, smart notes, AI agents, advanced RAG (Retrieval-Augmented Generation) with hybrid search, and multi-provider image generation.

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
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
  - [Docker Compose](#4-run-with-docker-compose-recommended)
  - [Local Development](#5-run-locally-development)
  - [Desktop App (macOS)](#6-run-as-desktop-app-macos)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Configuration](#configuration)
- [Development](#development)
- [Environment Variables Reference](#environment-variables-reference)
- [iOS Sync](#ios-sync)
- [Troubleshooting](#troubleshooting)
- [Architecture](#architecture)
- [License](#license)
- [Support](#support)

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

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 6
- **Routing**: React Router v7
- **State Management**: Zustand
- **Styling**: Tailwind CSS v4
- **Data Fetching**: TanStack Query v5
- **Rich Text Editor**: TipTap
- **Charts**: Recharts

### Desktop App (macOS)

- **Framework**: Tauri 2.0 (Rust + WebKit)
- **Backend**: Bundled .NET self-contained executable
- **Database**: PostgreSQL 17 (Homebrew) with pgvector on port 5433
- **Distribution**: DMG installer, universal binary (Intel + Apple Silicon)

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
# Install PostgreSQL 17 with pgvector
brew install postgresql@17 pgvector

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

### Authentication Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register with email and password |
| `/api/auth/login` | POST | Login with email and password |
| `/api/auth/me` | GET | Get current authenticated user |
| `/api/auth/generate-api-key` | POST | Generate API key for external access |

### Notes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/notes` | GET | Get all notes (authenticated user) |
| `/api/notes/{id}` | GET | Get specific note |
| `/api/notes` | POST | Create note |
| `/api/notes/{id}` | PUT | Update note |
| `/api/notes/{id}` | DELETE | Delete note |
| `/api/notes/bulk-delete` | POST | Bulk delete notes |

### Chat

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat/conversations` | GET | Get all conversations |
| `/api/chat/conversations/{id}` | GET | Get specific conversation |
| `/api/chat/conversations` | POST | Create conversation |
| `/api/chat/conversations/{id}/messages` | POST | Send message |
| `/api/chat/conversations/{id}/messages/stream` | POST | Stream message (SSE) |
| `/api/chat/conversations/{id}/settings` | PATCH | Update conversation settings |
| `/api/chat/conversations/{id}` | DELETE | Delete conversation |
| `/api/chat/conversations/{id}/generate-image` | POST | Generate image in conversation |
| `/api/chat/image-generation/providers` | GET | Get available image providers |
| `/api/chat/image-generation/providers/{provider}/sizes` | GET | Get supported sizes for provider |

### AI Agents

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agent/conversations/{id}/messages/stream` | POST | Stream agent message with tool execution |
| `/api/agent/supported-providers` | GET | Get providers supporting agent mode |
| `/api/agent/capabilities` | GET | Get available agent capabilities |

### AI Provider Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/health` | GET | Get health status for all AI providers |
| `/api/ai/health/{provider}` | GET | Get health status for specific provider |
| `/api/ai/providers` | GET | List all AI providers |
| `/api/ai/providers/enabled` | GET | List enabled AI providers |
| `/api/ai/generate/{provider}` | POST | Generate completion |
| `/api/ai/chat/{provider}` | POST | Generate chat completion |

### Indexing (RAG)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/indexing/start` | POST | Start indexing notes for RAG |
| `/api/indexing/status/{jobId}` | GET | Get indexing job status |
| `/api/indexing/stats` | GET | Get index statistics (PostgreSQL + Pinecone) |
| `/api/indexing/reindex/{noteId}` | POST | Reindex a specific note |
| `/api/indexing/notes` | DELETE | Delete all indexed notes for user |

### RAG Analytics

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/rag/analytics/feedback` | POST | Submit feedback for a RAG response |
| `/api/rag/analytics/stats` | GET | Get RAG performance statistics |
| `/api/rag/analytics/logs` | GET | Get paginated RAG query logs |
| `/api/rag/analytics/logs/{id}` | GET | Get specific RAG query log |
| `/api/rag/analytics/cluster` | POST | Run topic clustering on queries |
| `/api/rag/analytics/topics` | GET | Get topic statistics |

### Import

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/import/notes` | POST | Import notes (requires API key or JWT token) |

### Stats

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stats/ai` | GET | Get AI usage statistics |

### User Preferences

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/userpreferences/{userId}` | GET | Get user preferences |
| `/api/userpreferences/{userId}` | PUT | Update user preferences |

### Health Check

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Application health check |

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

Configure in `appsettings.json` or via environment variables:

```json
{
  "AIProviders": {
    "OpenAI": {
      "Enabled": true,
      "ApiKey": "",
      "BaseUrl": "https://api.openai.com/v1",
      "DefaultModel": "gpt-4o-mini",
      "MaxTokens": 4096,
      "Temperature": 0.7
    },
    "Gemini": {
      "Enabled": true,
      "ApiKey": "",
      "DefaultModel": "gemini-2.0-flash"
    },
    "Anthropic": {
      "Enabled": true,
      "ApiKey": "",
      "DefaultModel": "claude-3-5-haiku-latest"
    },
    "Ollama": {
      "Enabled": true,
      "BaseUrl": "http://localhost:11434",
      "DefaultModel": "qwen3:4b"
    },
    "XAI": {
      "Enabled": true,
      "ApiKey": "",
      "DefaultModel": "grok-3-mini"
    }
  }
}
```

### Embedding Providers

```json
{
  "EmbeddingProviders": {
    "DefaultProvider": "OpenAI",
    "OpenAI": {
      "Enabled": true,
      "Model": "text-embedding-3-small",
      "Dimensions": 1536
    },
    "Gemini": {
      "Enabled": false,
      "Model": "models/text-embedding-004",
      "Dimensions": 768
    },
    "Ollama": {
      "Enabled": false,
      "Model": "nomic-embed-text",
      "Dimensions": 768
    }
  }
}
```

### RAG Configuration

```json
{
  "RAG": {
    "ChunkSize": 500,
    "ChunkOverlap": 100,
    "TopK": 5,
    "SimilarityThreshold": 0.3,
    "MaxContextLength": 4000,
    "EnableChunking": true,
    "VectorStoreProvider": "PostgreSQL",
    
    "EnableHybridSearch": true,
    "VectorWeight": 0.7,
    "BM25Weight": 0.3,
    "RRFConstant": 60,
    
    "EnableQueryExpansion": true,
    "EnableHyDE": true,
    "MultiQueryCount": 3,
    
    "EnableReranking": true,
    "InitialRetrievalCount": 20,
    "RerankingProvider": "OpenAI",
    
    "EnableSemanticChunking": true,
    "MinChunkSize": 100,
    "MaxChunkSize": 800,
    
    "EnableAnalytics": true,
    "LogDetailedMetrics": false
  }
}
```

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

## Environment Variables Reference

### PostgreSQL

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_USER` | PostgreSQL username | `postgres` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `postgres` |
| `POSTGRES_DB` | Database name | `secondbrain` |

### Backend Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ConnectionStrings__DefaultConnection` | PostgreSQL connection string | Yes |
| `Jwt__SecretKey` | JWT signing secret (min 32 chars) | Yes |
| `Jwt__Issuer` | JWT issuer | No (default: SecondBrain) |
| `Jwt__Audience` | JWT audience | No (default: SecondBrainUsers) |
| `Jwt__ExpiryMinutes` | Token expiry in minutes | No (default: 1440) |
| `OPENAI_API_KEY` | OpenAI API key | At least one AI provider |
| `ANTHROPIC_API_KEY` | Anthropic (Claude) API key | At least one AI provider |
| `GEMINI_API_KEY` | Google Gemini API key | At least one AI provider |
| `XAI_API_KEY` | X.AI (Grok) API key | At least one AI provider |
| `VECTOR_STORE_PROVIDER` | Vector store provider (PostgreSQL/Pinecone) | No (default: PostgreSQL) |
| `PINECONE_API_KEY` | Pinecone API key | No (if using PostgreSQL) |
| `PINECONE_ENVIRONMENT` | Pinecone environment | No |
| `PINECONE_INDEX_NAME` | Pinecone index name | No |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins | Yes |
| `OLLAMA_BASE_URL` | Ollama server URL | No (default: <http://localhost:11434>) |
| `ASPNETCORE_ENVIRONMENT` | Environment mode | No (default: Production) |

### Frontend Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | No (uses proxy in dev) |

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
- Ensure pgvector extension is installed (automatic with `pgvector/pgvector:pg16` image)
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
                        ┌────────────────────────────────┴────────────────────────────────┐
                        │                                                                 │
                        ▼                                                                 ▼
               ┌─────────────────┐                                              ┌─────────────────┐
               │   PostgreSQL    │                                              │  AI Providers   │
               │   + pgvector    │                                              │ OpenAI, Claude  │
               │   (Users, Notes,│                                              │ Gemini, Ollama  │
               │    Embeddings)  │                                              │     Grok        │
               └─────────────────┘                                              └─────────────────┘
```

### Desktop App Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                    Second Brain.app                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Tauri Shell (Rust) - Service Lifecycle         │ │
│  └────────────────────────────────────────────────────────┘ │
│                          │ IPC                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              React Frontend (WebView)                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                          │ localhost:5001                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         .NET Backend (Sidecar Process)                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                          │                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         PostgreSQL (port 5433) + pgvector              │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues and questions:

- Open an issue on GitHub
- Review the [Troubleshooting](#troubleshooting) section above
