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

- Markdown-based rich text editing
- Bi-directional linking across notes, ideas, tasks, and reminders
- Graph visualization with React Flow to highlight relationships:
  - Customizable node types and styles
  - Smooth animations and transitions
  - Real-time graph updates
  - Drag and drop interface
  - Mini-map navigation
  - Node grouping
  - Custom edge connections
- AI-assisted tagging, content organization, and context-aware suggestions
- Version history, archiving, and focus mode for concentrated workflows

### Code & Documentation

- Syntax highlighting for multiple programming languages
- Code snippet management and AI-driven code explanations
- Documentation integration and quick export/sharing features

### Tasks & Reminders

- Priority-based organization and AI-driven scheduling
- Context-aware reminders linked to notes, ideas, and other content
- Progress tracking, archiving, and linking tasks directly with related notes or ideas

### AI Integration

- Multiple AI backends: OpenAI (GPT-4, DALL-E 3), Anthropic Claude, Google Gemini, Grok, and local models via Ollama
- Unified interface to select AI models and embeddings
- Natural language queries, voice transcription, text-to-speech, image generation, and vector embeddings
- Retrieval augmented generation (RAG) for context-rich responses
- Database operations through natural language queries

### Privacy & Security

- API keys and credentials stored securely on the backend
- JWT authentication with refresh tokens
- Data encryption

## Technical Stack

### Frontend

- React 18 with TypeScript and Vite
- Tailwind CSS, Headless UI, Framer Motion
- State management with React Context and custom hooks
- React Flow for interactive graph visualization (zoom, pan, custom nodes, and edges)
- Date handling with date-fns
- Vitest and Testing Library for comprehensive tests

### Backend

- .NET 8.0 with ASP.NET Core Web API and Clean Architecture using CQRS
- Entity Framework Core and SQL Server
- Integrations with OpenAI, Anthropic, Google Gemini, Grok, and Ollama
- Pinecone for vector embeddings and semantic search
- Logging, monitoring, and Swagger/OpenAPI documentation

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- .NET SDK 8.0
- SQL Server 2019+
- API keys for OpenAI, Anthropic, Google Cloud, Grok, Pinecone
- Optional: Ollama for local AI models

### Frontend Setup

```bash
git clone https://github.com/yourusername/second-brain.git
cd second-brain/frontend
npm install
npm run dev
```

Configure the `.env` file with the appropriate API URLs and keys before running `npm run dev`.

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
  "ConnectionStrings": {
    "DefaultConnection": "Server=YOUR_SERVER;Database=SecondBrainDb;User Id=YOUR_USER_ID;Password=YOUR_PASSWORD;TrustServerCertificate=True;"
  },
  "Authentication": {
    "Jwt": {
      "Secret": "YOUR_SECRET_KEY",
      "Issuer": "SecondBrain",
      "Audience": "SecondBrain",
      "AccessTokenExpirationMinutes": "60",
      "RefreshTokenExpirationDays": "30"
    }
  },
  "Anthropic": {
    "ApiKey": "YOUR_ANTHROPIC_API_KEY",
    "ApiEndpoint": "https://api.anthropic.com/v1"
  },
  "Grok": {
    "ApiKey": "YOUR_GROK_API_KEY"
  },
  "Llama": {
    "OllamaUri": "http://localhost:11434/",
    "NetworkSettings": {
      "ConnectionTimeoutSeconds": 5,
      "RetryAttempts": 3,
      "RequireFirewallPermission": true
    }
  },
  "OpenAI": {
    "ApiKey": "YOUR_OPENAI_API_KEY",
    "ApiEndpoint": "https://api.openai.com/v1",
    "ModelId": "gpt-4"
  },
  "Gemini": {
    "ApiKey": "YOUR_GOOGLE_GEMINI_API_KEY"
  },
  "Pinecone": {
    "ApiKey": "YOUR_PINECONE_API_KEY",
    "Environment": "YOUR_PINECONE_ENVIRONMENT",
    "IndexName": "secondbrainindex"
  },
  "Storage": {
    "DocumentsPath": "Storage/Documents"
  },
  "DocumentProcessing": {
    "MaxTokensPerChunk": 500,
    "OverlapTokens": 50
  },
  "AllowedHosts": "*"
}
```

Before running these commands, ensure that appsettings.json is configured with the correct database connection string, JWT secrets, and AI keys. After completing the setup, the backend will be ready to accept requests.

## API Reference

The application provides RESTful API endpoints for various resources. Below is a list of available controllers and their primary routes:

### Authentication (/auth)

- **Endpoints:**
  - `POST /auth/register` - Register a new user
  - `POST /auth/login` - Authenticate a user and obtain tokens
  - `POST /auth/refresh-token` - Refresh access tokens using a refresh token
  - `GET /auth/me` - Retrieve the authenticated user's profile
  - `PUT /auth/me/avatar` - Update user avatar

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

### Ideas (/api/ideas)

- **Endpoints:**
  - `POST /api/ideas` - Create a new idea
  - `PUT /api/ideas/{id}` - Update an idea
  - `DELETE /api/ideas/{id}` - Delete an idea
  - `PUT /api/ideas/{id}/favorite` - Toggle favorite status
  - `PUT /api/ideas/{id}/pin` - Toggle pin status
  - `PUT /api/ideas/{id}/archive` - Toggle archive status

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

### Activities (/api/activities)

- **Endpoints:**
  - *(To be defined based on implementation)*

### Achievements (/api/achievements)

- **Endpoints:**
  - `GET /api/achievements` - Get all achievements
  - `GET /api/achievements/user` - Get user's unlocked achievements
  - `GET /api/achievements/progress` - Get user's progress towards achievements

### AI Integrations

#### OpenAI (/api/ai/openai)

- **Endpoints:**
  - `GET /api/ai/openai/status` - Check OpenAI API status
  - `POST /api/ai/openai/chat` - Send a message to OpenAI Chat API
  - `POST /api/ai/openai/embeddings` - Create embeddings
  - `POST /api/ai/openai/images/generate` - Generate images
  - `POST /api/ai/openai/audio/transcribe` - Transcribe audio
  - `POST /api/ai/openai/audio/speech` - Convert text to speech

#### Anthropic Claude (/api/claude)

- **Endpoints:**
  - `POST /api/claude/send-message` - Send a message to Claude
  - `GET /api/claude/status` - Check Claude API status

#### Grok (/api/grok)

- **Endpoints:**
  - `POST /api/grok/send` - Send a message to Grok API

#### Google Gemini (/api/gemini)

- **Endpoints:**
  - `POST /api/gemini/chat` - Chat with the Gemini model
  - `POST /api/gemini/generate` - Generate content with Gemini

#### Llama (/api/llama)

- **Endpoints:**
  - `GET /api/llama/stream` - Stream responses from local Llama models
  - `POST /api/llama/execute-db` - Execute database operations via natural language

### Nexus Storage (/api/nexusstorage)

- **Endpoints:**
  - `POST /api/nexusstorage/execute` - Execute database operations via Llama service
  - `POST /api/nexusstorage/test` - Test Llama service operations

## Content Linking Features

The system implements bi-directional linking across all content types, enabling seamless navigation and relationship management:

### Content Types & Connections

- **Notes**: Reference other notes, tasks, reminders, and ideas
- **Tasks**: Link to documentation, dependencies, and meeting notes
- **Reminders**: Connect to related tasks and reference materials
- **Ideas**: Associate with research, implementation tasks, and related concepts

All connections are bi-directional and support:

- Contextual relationships
- Dependency tracking
- Project organization
- Knowledge discovery

## Roadmap Enhancements

### Vector Database & RAG Integration

- Incorporate a vector database to enable fast retrieval and semantic queries
- Enhance AI-assisted suggestions with full knowledge-base context
- Move towards a system where RAG informs all aspects of note-taking, content creation, and linking

### Role-Based Permissions

- Introduce dedicated tables and schema for storing user and agent roles
- Assign specific capabilities to AI agents—some can create or edit content, others remain read-only
- Scale permissions to support multiple users and maintain a secure environment

### Enhanced Linking & Visualization

- Differentiate link types (note-to-note, idea-to-idea, note-to-idea) using visual cues, colors, and line styles
- Add overlays for relevance, confidence, or thematic grouping
- Introduce temporal views to track changes and identify content evolution over time
- Explore hierarchical and dependency links to represent structured project relationships

### Performance & Scalability

- Optimize graph rendering for large-scale datasets
- Implement caching, indexing, and on-demand rendering strategies
- Introduce strategies for handling large volumes of notes, tasks, ideas, and reminders efficiently

### Data Integrity & Recovery

- Implement backup and restore processes for critical data
- Consider versioning, rollback capabilities, and automated integrity checks

### AI Context & Confidence

- Display confidence scores or relevance metrics for AI-generated suggestions
- Utilize system-wide context, allowing titles, tags, and related content to inform suggestions
- Improve user understanding of AI logic and rationale

### Customizability & Metrics

- Allow users to adjust AI link suggestion aggressiveness
- Offer user-selectable default AI models and parameter configurations
- Provide detailed productivity and knowledge density metrics to evaluate the AI's effectiveness

### Calendar & Email Integration

- Calendar sync with Google Calendar/Outlook
- Email-based task creation and reminders
- Automated meeting notes and summaries
- Smart email digests of your knowledge base
- Calendar-based task scheduling

### Mobile & Platform Expansion

- Native mobile applications for iOS and Android
- Progressive Web App (PWA) support
- Cross-platform synchronization
- Offline capabilities
- Mobile-optimized UI/UX

## Acknowledgments

Thanks to the following projects and organizations that make Second Brain possible:

- OpenAI for GPT-4 and DALL-E 3
- Anthropic for Claude
- Google for Gemini
- Grok team for their API
- Ollama for local AI model support
- Lucide Icons for the beautiful icon system
- Tailwind CSS for the styling framework
- The open-source community for various tools and libraries
