<!-- markdownlint-disable MD041 MD033 -->
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="frontend/src/assets/second-brain-logo-dark-mode.png">
    <source media="(prefers-color-scheme: light)" srcset="frontend/src/assets/second-brain-logo-light-mode.png">
    <img alt="Second Brain Logo" src="frontend/src/assets/second-brain-logo-light-mode.png" width="200">
  </picture>
</p>

# AI-Powered Personal Knowledge Management System

Second Brain is an AI-enhanced knowledge management and note-taking system that unifies your notes, ideas, tasks, and reminders in one interactive environment. It intelligently links related concepts, highlights relevant information, and provides guidance to help you gain clarity, maintain organization, and discover insights you may have overlooked—all within a single, easy-to-use workspace.

## Core Features

### Knowledge Management

- Rich text editing with Markdown support
- Bi-directional linking across notes, ideas, tasks, and reminders with redundant storage for quick traversal
- Interactive graph visualization:
  - Node types for different content entities (notes, tasks, ideas, reminders)
  - Real-time updates reflecting content relationships
  - Intuitive navigation interface
- Tagging and categorization system
- Version tracking, archiving, and focus mode
- Soft delete implementation with restore capabilities

### Tasks & Reminders

- Priority-based task management with status tracking
- Time-based reminders with recurrence options
- Task dependency visualization and tracking
- Linking tasks to notes, ideas, and reference materials
- Progress tracking and completion status management

### AI Integration

- Multi-provider architecture supporting:
  - OpenAI (GPT-4, GPT-3.5, DALL-E)
  - Anthropic Claude (Opus, Sonnet, Haiku)
  - Google Gemini (Pro, Pro Vision)
  - Grok
  - Local models via Ollama
- Real-time streaming responses with SignalR
- Tool execution framework for executing AI-driven actions
- Voice transcription and audio processing
- Retrieval-augmented generation (RAG) via OpenAI Assistants API
- Natural language database operations

### Multi-Layered Theme System

- Three distinct themes: Light, Dark, and Midnight
- Combined CSS variables and Tailwind implementation
- System preference detection
- Browser-specific optimizations (especially for Safari)
- Dynamic theme switching with persistence

### Privacy & Security

- JWT authentication with refresh token rotation
- API keys stored securely on backend
- User-specific data isolation
- HTTP-only cookies for refresh tokens
- SignalR secure connections with authentication

## Technical Architecture

### Frontend

- React 18 with TypeScript and Vite
- State management with React Context API and custom hooks
  - Nested provider architecture for different concerns
  - Optimistic updates with rollback capabilities
- Tailwind CSS with custom theming
- SignalR for real-time updates and streaming
- Component organization by feature
- Axios with interceptors for API authentication

### Backend

- ASP.NET Core 8.0 Web API
- Entity Framework Core with SQL Server
- Controller-service-repository pattern
- JWT authentication system
- SignalR hubs for real-time communication
- Soft delete pattern with query filters
- Multi-layer response processing
- Provider-specific AI integrations

### Database Structure

- Entity Framework Core code-first approach
- Comprehensive entity relationships
- Bidirectional linking implementation
- Soft delete pattern with automatic query filters
- Activity and achievement tracking
- Flexible tag system across entities

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- .NET SDK 8.0
- SQL Server 2019+
- API keys for:
  - OpenAI
  - Anthropic Claude
  - Google Gemini
  - Grok
- Optional: Ollama for local AI models (<http://localhost:11434>)

### Frontend Setup

```bash
git clone https://github.com/yourusername/second-brain.git
cd second-brain/frontend
npm install
npm run dev
```

Configure the `.env` file with the appropriate API URLs before running `npm run dev`.

### Backend Setup

```bash
cd ../backend/SecondBrain.Api
dotnet restore
dotnet ef database update
dotnet run
```

Here's a template for `appsettings.json`:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },

  "AllowedHosts": "*",

  "ConnectionStrings": {
    "DefaultConnection": "your-connection-string"
  },

  "Authentication": {
    "Jwt": {
      "Secret": "your-jwt-secret",
      "Issuer": "SecondBrain",
      "Audience": "SecondBrain",
      "AccessTokenExpirationMinutes": "30",
      "RefreshTokenExpirationDays": "7"
    }
  },

  "Anthropic": {
    "ApiKey": "your-api-key-here",
    "ApiEndpoint": "https://api.anthropic.com/v1/messages"
  },

  "Grok": {
    "ApiKey": "your-grok-api-key",
    "BaseUrl": "https://api.x.ai/v1"
  },

  "OpenAI": {
    "ApiKey": "your-openai-api-key",
    "ApiEndpoint": "https://api.openai.com/v1"
  },

  "Gemini": {
    "ApiKey": "your-api-key",
    "BaseUrl": "https://generativelanguage.googleapis.com/v1beta/"
  },

  "Llama": {
    "OllamaUri": "http://localhost:11434/"
  },

  "Kestrel": {
    "Endpoints": {
      "Http": {
        "Url": "http://localhost:5127"
      },
      "Https": {
        "Url": "https://localhost:7056"
      }
    }
  },

  "AIService": {
    "BaseUrl": "http://localhost:8000"
  }
}
```

Before running these commands, ensure that appsettings.json is configured with the correct database connection string, JWT secrets, and AI keys. After completing the setup, the backend will be ready to accept requests.

## API Reference

The application provides RESTful API endpoints for various resources. Below is a list of available controllers and their primary routes:

### Authentication (/api/auth)

- **Endpoints:**
  - `POST /api/auth/register` - Register a new user
  - `POST /api/auth/login` - Authenticate a user and obtain tokens
  - `POST /api/auth/refresh-token` - Refresh access tokens using a refresh token
  - `POST /api/auth/logout` - Logout and invalidate tokens
  - `GET /api/auth/me` - Retrieve the authenticated user's profile
  - `PUT /api/auth/me/avatar` - Update user avatar

### Notes (/api/notes)

- **Endpoints:**
  - `GET /api/notes` - Get all notes
  - `POST /api/notes` - Create a new note
  - `GET /api/notes/{id}` - Get a note by ID
  - `PUT /api/notes/{id}` - Update a note
  - `DELETE /api/notes/{id}` - Soft-delete a note
  - `POST /api/notes/{id}/restore` - Restore a soft-deleted note
  - `DELETE /api/notes/{id}/permanent` - Permanently delete a note
  - `GET /api/notes/deleted` - Get all soft-deleted notes
  - `GET /api/notes/archived` - Get all archived notes
  - `POST /api/notes/{id}/unarchive` - Unarchive a note

### Tasks (/api/tasks)

- **Endpoints:**
  - `GET /api/tasks` - Get all tasks
  - `POST /api/tasks` - Create a new task
  - `GET /api/tasks/{id}` - Get a task by ID
  - `PATCH /api/tasks/{id}` - Update a task
  - `DELETE /api/tasks/{id}` - Soft-delete a task
  - `POST /api/tasks/{id}/restore` - Restore a soft-deleted task
  - `GET /api/tasks/deleted` - Get all soft-deleted tasks

### Reminders (/api/reminders)

- **Endpoints:**
  - `GET /api/reminders` - Get all reminders
  - `POST /api/reminders` - Create a new reminder
  - `GET /api/reminders/{id}` - Get a reminder by ID
  - `PUT /api/reminders/{id}` - Update a reminder
  - `DELETE /api/reminders/{id}` - Delete a reminder
  - `GET /api/reminders/deleted` - Get all deleted reminders

### AI Integrations

#### AI Agents (/api/ai/agents)

- **Endpoints:**
  - `GET /api/ai/agents/models` - Get available AI models
  - `GET /api/ai/agents/configs` - Get provider configurations
  - `POST /api/ai/agents/execute` - Execute tool with AI

#### OpenAI (/api/openai)

- **Endpoints:**
  - `GET /api/openai/status` - Check OpenAI API status
  - `POST /api/openai/chat` - Send a message to OpenAI Chat API
  - `POST /api/openai/images/generate` - Generate images
  - `POST /api/openai/audio/transcribe` - Transcribe audio
  - `POST /api/openai/audio/speech` - Convert text to speech

#### Anthropic Claude (/api/claude)

- **Endpoints:**
  - `POST /api/claude/send-message` - Send a message to Claude
  - `GET /api/claude/status` - Check Claude API status

#### Google Gemini (/api/gemini)

- **Endpoints:**
  - `POST /api/gemini/chat` - Chat with the Gemini model
  - `POST /api/gemini/generate` - Generate content with Gemini

#### Llama (/api/llama)

- **Endpoints:**
  - `GET /api/llama/stream` - Stream responses from local Llama models
  - `POST /api/llama/execute-db` - Execute database operations via natural language

#### RAG (/api/ai/rag)

- **Endpoints:**
  - `POST /api/ai/rag/upload` - Upload file for RAG processing
  - `POST /api/ai/rag/create-assistant` - Create RAG assistant with file
  - `POST /api/ai/rag/query` - Query RAG assistant
  - `DELETE /api/ai/rag/file` - Delete RAG file
  - `DELETE /api/ai/rag/assistant` - Delete RAG assistant

## Content Linking Features

The system implements bi-directional linking across all content types, enabling seamless navigation and relationship management:

### Content Types & Connections

- **Notes**: Reference other notes, tasks, reminders, and ideas with bidirectional links
- **Tasks**: Link to documentation, dependencies, and meeting notes
- **Reminders**: Connect to related tasks and reference materials
- **Ideas**: Associate with research, implementation tasks, and related concepts

All connections are bi-directional and support:

- Contextual relationships with link types and metadata
- Dependency tracking with status propagation
- Project organization and categorization
- Knowledge discovery through relationship exploration

## Implementation Considerations

- **Optimistic Updates**: Most data modifications use optimistic updates with rollback
- **SignalR Streaming**: AI responses stream in real-time with fallback mechanisms
- **Provider-Specific Streaming**: Each AI provider implements streaming differently
- **Safari Compatibility**: Theme system includes special handling for Safari browser
- **Soft Delete**: Entities use soft delete with query filters
- **Context Dependencies**: The nested context structure creates complex dependencies
- **Token Refresh**: JWT tokens refresh automatically with rotation for security

## Future Improvements

- Complete RAG implementation with notes integration
- Enhance bidirectional linking with improved error handling
- Optimize context provider architecture to reduce nesting
- Improve error handling consistency across components
- Standardize streaming implementations across AI providers
- Implement a more unified theme system approach
- Add mobile and offline support

## Acknowledgments

Thanks to the following projects and organizations that make Second Brain possible:

- OpenAI for GPT-4 and DALL-E 3
- Anthropic for Claude models
- Google for Gemini
- Grok team for their API
- Ollama for local AI model support
- Lucide Icons for the beautiful icon system
- Tailwind CSS for the styling framework
- The open-source community for various tools and libraries
