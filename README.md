# Second Brain

<div align="center">

<img src="frontend/src/assets/second-brain-logo-dark-mode.png" alt="Second Brain Logo - Dark Mode" width="200"/>

</div>

Intelligent knowledge management with AI-powered chat, smart notes, AI agents, and RAG (Retrieval-Augmented Generation) capabilities.

## Features

- **Email/Password Authentication**: Secure registration and login with JWT tokens
- **Smart Notes**: Create, organize, and search your notes with a rich text editor
- **AI Chat**: Multi-provider AI chat (OpenAI, Claude, Gemini, Ollama, Grok) with streaming responses
- **AI Agents**: Agent mode with tool execution for automated note management
- **RAG Search**: Semantic search with vector embeddings (PostgreSQL pgvector + Pinecone)
- **AI Provider Health**: Real-time monitoring of AI provider status
- **iOS Import**: Import notes from iPhone/iPad via Shortcuts
- **Analytics Dashboard**: Track your notes, AI usage, and token consumption

## Tech Stack

### Backend

- **Framework**: ASP.NET Core 10.0
- **Database**: PostgreSQL with pgvector extension
- **Authentication**: JWT tokens with BCrypt password hashing
- **Vector Stores**: PostgreSQL (pgvector), Pinecone
- **AI Providers**: OpenAI, Claude (Anthropic), Google Gemini, Ollama, X.AI (Grok)
- **Embedding Providers**: OpenAI, Gemini, Ollama

### Frontend

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 6
- **Routing**: React Router v7
- **State Management**: Zustand
- **Styling**: Tailwind CSS v4
- **Data Fetching**: TanStack Query v5
- **Rich Text Editor**: TipTap
- **Charts**: Recharts

## Prerequisites

- **Docker & Docker Compose** (recommended for deployment)
- **.NET 10 SDK** or later (for local development)
- **Node.js 18+** and **pnpm** (for local development)
- **AI Provider API Keys** (at least one: OpenAI, Anthropic, Gemini, X.AI, or Ollama)
- **Pinecone Account** (optional, for cloud vector search)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/second-brain.git
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

### API Key for iOS Import

1. Click on your profile picture in the top right
2. Select "Generate API Key"
3. Copy and save your API key securely
4. See [IOS_IMPORT_GUIDE.md](./IOS_IMPORT_GUIDE.md) for iOS Shortcuts setup

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
    "ChunkOverlap": 50,
    "TopK": 5,
    "SimilarityThreshold": 0.3,
    "MaxContextLength": 4000,
    "EnableChunking": true,
    "VectorStoreProvider": "PostgreSQL"
  }
}
```

## Development

### Backend Development

```bash
cd backend/src/SecondBrain.API
dotnet watch run
```

### Frontend Development

```bash
cd frontend
pnpm dev
```

### Running Tests

```bash
# Backend tests
cd backend
dotnet test

# Frontend tests (when available)
cd frontend
pnpm test
```

## Deployment

### Using Docker Compose (Recommended)

```bash
docker-compose up -d
```

### Backend (Docker)

```bash
cd backend
docker build -t second-brain-api -f Dockerfile .
docker run -p 8080:8080 second-brain-api
```

### Frontend (Docker)

```bash
cd frontend
docker build -t second-brain-frontend -f Dockerfile .
docker run -p 80:80 second-brain-frontend
```

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

## iOS Import

See [IOS_IMPORT_GUIDE.md](./IOS_IMPORT_GUIDE.md) for detailed instructions on:

- Generating API keys
- Creating iOS Shortcuts
- Importing notes from iPhone/iPad
- Troubleshooting common issues

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

### Agent Mode Issues

- Check supported providers: `GET /api/agent/supported-providers`
- Ensure the AI provider supports function calling
- Check conversation is marked with `agentEnabled: true`

### SSL Certificate Issues (macOS)

- Trust the certificate in Keychain Access
- Restart browser after trusting
- For Chrome, navigate to `chrome://flags/#allow-insecure-localhost`

## Architecture

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

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues and questions:

- Open an issue on GitHub
- Check [IOS_IMPORT_GUIDE.md](./IOS_IMPORT_GUIDE.md) for iOS-specific help
- Review troubleshooting section above
