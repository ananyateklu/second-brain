# Configuration

## Environment Variables (`.env`)

```bash
# Database
ConnectionStrings__DefaultConnection=Host=localhost;Port=5432;Database=secondbrain;...

# JWT
Jwt__SecretKey=YourSecretKeyAtLeast32Characters

# AI Providers (at least one required)
AIProviders__OpenAI__ApiKey=sk-...
AIProviders__Anthropic__ApiKey=sk-ant-...
AIProviders__Gemini__ApiKey=...
AIProviders__XAI__ApiKey=...
AIProviders__Cohere__ApiKey=...

# Voice Providers
Voice__Deepgram__ApiKey=...
Voice__ElevenLabs__ApiKey=...

# Vector Store
RAG__VectorStoreProvider=PostgreSQL  # or Pinecone
```

## Configuration Hierarchy

```text
.env (highest) → Program.cs env mapping → appsettings.Development.json → appsettings.json (defaults)
```

## Development Commands

### Backend

```bash
cd backend/src/SecondBrain.API
dotnet watch run                           # Hot reload
cd backend && dotnet test                  # Run tests
dotnet ef migrations add MigrationName     # Create migration
```

### Frontend

```bash
cd frontend
bun dev                     # Dev server (port 3000)
bun run build               # Production build
bun test                    # Run tests
bun run tauri:dev           # Desktop app development
bun run tauri:build         # Build desktop app
```

### Docker

```bash
docker-compose up -d        # Start all services
docker-compose logs -f      # View logs
docker-compose down -v      # Stop and remove volumes
```

## Ports & Services

| Service | Port |
|---------|------|
| Frontend (dev) | 3000 |
| Backend API | 5001 |
| PostgreSQL (Docker) | 5432 |
| PostgreSQL (Desktop) | 5433 |
| Ollama | 11434 |

## Domain Types

### Note

```typescript
{ id, title, content, tags[], isArchived, folder, createdAt, updatedAt, userId, source }
```

### ChatConversation

```typescript
{ id, title, provider, model, ragEnabled, agentEnabled, imageGenerationEnabled,
  agentCapabilities, vectorStoreProvider, messages[] }
```

### ChatMessage

```typescript
{ role, content, timestamp, retrievedNotes[], toolCalls[], thinkingSteps[],
  images[], generatedImages[], ragLogId, ragFeedback, inputTokens, outputTokens }
```

### VoiceSession

```typescript
{ id, userId, provider, model, status, startedAt, endedAt, tokensUsed, audioDurationMs }
```

### FocusItem

```typescript
{ id, title, priority: 1|2|3, status, scheduledDate, isCurrentFocus,
  focusStartedAt, accumulatedMinutes }
```

### ThinkingStep

```typescript
{ id, messageId, stepNumber, content, startedAt, completedAt, modelSource, isStreaming }
```

Full type definitions in `frontend/src/types/`.
