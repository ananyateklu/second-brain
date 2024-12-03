<!-- markdownlint-disable MD033 -->
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="frontend/src/assets/second-brain-logo-dark-mode.png">
    <source media="(prefers-color-scheme: light)" srcset="frontend/src/assets/second-brain-logo-light-mode.png">
    <img alt="Second Brain Logo" src="frontend/src/assets/second-brain-logo-light-mode.png" width="300">
  </picture>
</p>

# AI-Powered Personal Knowledge Management System

Second Brain is a modern note-taking and knowledge management system that helps you organize your thoughts with AI assistance. Built for those who want to:

- **Capture Ideas Efficiently**: Take smart notes with AI-powered organization and tagging
- **Connect Information**: Discover hidden relationships in your knowledge through interactive visualizations
- **Manage Code & Documentation**: Store and organize code snippets with syntax highlighting and documentation
- **Enhance Productivity**: Manage tasks and reminders with intelligent scheduling
- **Learn Continuously**: Build and explore your personal knowledge base while tracking your progress

## Key Features

- **Knowledge Management**
  - Rich text editing with Markdown support
  - Interactive mind mapping and visual relationship graphs
  - Code block support with syntax highlighting for 15+ languages
  - Automated content organization with AI suggestions
  - Bi-directional linking between notes, tasks, and ideas
  - Version history and comprehensive archiving

- **Code & Documentation**
  - Syntax highlighting for multiple programming languages
  - Code snippet organization and tagging
  - AI-powered code explanations and suggestions
  - Markdown support for technical documentation
  - Easy code sharing and export

- **AI Integration**
  - Multiple AI model support (OpenAI, Claude, Gemini, Grok, local models)
  - Natural language queries and content enhancement
  - Voice transcription and text-to-speech
  - Image generation and editing
  - Context-aware responses using RAG technology

- **Task & Reminder System**
  - Priority-based organization
  - Smart scheduling with AI suggestions
  - Task linking and dependencies
  - Progress tracking
  - Context-aware notifications

- **Productivity & Growth**
  - Focus Mode for distraction-free work
  - Achievement system with XP and levels
  - Progress tracking and analytics
  - Customizable themes and avatars
  - Activity monitoring

- **Privacy & Security**
  - Optional local AI model support via Ollama
  - Secure authentication and data encryption
  - Regular backup options
  - Granular privacy controls

## Technical Stack

- **Frontend**
  - React 18, TypeScript, Tailwind CSS, Vite.
  - State management with React Context and custom hooks.
  - AI libraries: OpenAI, Anthropic AI SDK, Google Generative AI.
  - Mind mapping with Cytoscape.js.
  - UI/UX with Headless UI, Framer Motion, Lucide Icons.

- **Backend**
  - .NET 8.0, ASP.NET Core Web API, Entity Framework Core, SQL Server.
  - JWT authentication with role-based access control.
  - AI integrations with OpenAI, Anthropic Claude, Grok API, Google Gemini, and local models via **Ollama**.
  - **Natural language database operations through AI services.**

## Getting Started

### Prerequisites

- Node.js 18+
- .NET SDK 8.0
- SQL Server
- API keys for OpenAI, Google Cloud, Anthropic, Grok
- Optional: Local AI models and **Ollama setup**

### Installation

#### Frontend

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/second-brain.git
   cd second-brain/frontend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables in `.env`.**

4. **Start the development server:**

   ```bash
   npm run dev
   ```

#### Backend

1. **Navigate to backend directory:**

   ```bash
   cd ../backend/SecondBrain.Api
   ```

2. **Configure `appsettings.json` with your settings.**

   Here's a template for `appsettings.json`:

   ```json:backend/SecondBrain.Api/appsettings.json
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

   - Replace placeholders (`YOUR_SERVER`, `YOUR_USER_ID`, etc.) with your actual configuration settings.
   - Generate a strong secret key for JWT authentication.
   - Ensure all required API keys are provided.

3. **Restore packages and run migrations:**

   ```bash
   dotnet restore
   dotnet ef database update
   dotnet run
   ```

## API Integration

The application provides RESTful API endpoints for various resources. Below is a list of available controllers and their primary routes:

- **Authentication** (`/auth`)
  - **Endpoints:**
    - `POST /auth/register` - Register a new user.
    - `POST /auth/login` - Authenticate a user and obtain tokens.
    - `POST /auth/refresh-token` - Refresh access tokens using a refresh token.
    - `GET /auth/me` - Retrieve the authenticated user's profile.
    - `PUT /auth/me/avatar` - Update user avatar.

- **Notes** (`/api/notes`)
  - **Endpoints:**
    - `GET /api/notes` - Get all notes.
    - `POST /api/notes` - Create a new note.
    - `GET /api/notes/{id}` - Get a note by ID.
    - `PUT /api/notes/{id}` - Update a note.
    - `DELETE /api/notes/{id}` - Soft-delete a note.
    - `POST /api/notes/{id}/restore` - Restore a soft-deleted note.
    - `DELETE /api/notes/{id}/permanent` - Permanently delete a note.
    - `GET /api/notes/deleted` - Get all soft-deleted notes.
    - `GET /api/notes/archived` - Get all archived notes.
    - `POST /api/notes/{id}/unarchive` - Unarchive a note.

- **Ideas** (`/api/ideas`)
  - **Endpoints:**
    - `POST /api/ideas` - Create a new idea.
    - `PUT /api/ideas/{id}` - Update an idea.
    - `DELETE /api/ideas/{id}` - Delete an idea.
    - `PUT /api/ideas/{id}/favorite` - Toggle favorite status.
    - `PUT /api/ideas/{id}/pin` - Toggle pin status.
    - `PUT /api/ideas/{id}/archive` - Toggle archive status.

- **Tasks** (`/api/tasks`)
  - **Endpoints:**
    - `GET /api/tasks` - Get all tasks.
    - `POST /api/tasks` - Create a new task.
    - `GET /api/tasks/{id}` - Get a task by ID.
    - `PATCH /api/tasks/{id}` - Update a task.
    - `DELETE /api/tasks/{id}` - Soft-delete a task.
    - `POST /api/tasks/{id}/restore` - Restore a soft-deleted task.
    - `GET /api/tasks/deleted` - Get all soft-deleted tasks.

- **Reminders** (`/api/reminders`)
  - **Endpoints:**
    - `GET /api/reminders` - Get all reminders.
    - `POST /api/reminders` - Create a new reminder.
    - `GET /api/reminders/{id}` - Get a reminder by ID.
    - `PUT /api/reminders/{id}` - Update a reminder.
    - `DELETE /api/reminders/{id}` - Delete a reminder.
    - `GET /api/reminders/deleted` - Get all deleted reminders.

- **Activities** (`/api/activities`)
  - **Endpoints:**
    - *(To be defined based on implementation)*

- **Achievements** (`/api/achievements`)
  - **Endpoints:**
    - `GET /api/achievements` - Get all achievements.
    - `GET /api/achievements/user` - Get user's unlocked achievements.
    - `GET /api/achievements/progress` - Get user's progress towards achievements.

- **AI Integrations**

  - **OpenAI** (`/api/ai/openai`)
    - **Endpoints:**
      - `GET /api/ai/openai/status` - Check OpenAI API status.
      - `POST /api/ai/openai/chat` - Send a message to OpenAI Chat API.
      - `POST /api/ai/openai/embeddings` - Create embeddings.
      - `POST /api/ai/openai/images/generate` - Generate images.
      - `POST /api/ai/openai/audio/transcribe` - Transcribe audio.
      - `POST /api/ai/openai/audio/speech` - Convert text to speech.

  - **Anthropic Claude** (`/api/claude`)
    - **Endpoints:**
      - `POST /api/claude/send-message` - Send a message to Claude.
      - `GET /api/claude/status` - Check Claude API status.

  - **Grok** (`/api/grok`)
    - **Endpoints:**
      - `POST /api/grok/send` - Send a message to Grok API.

  - **Google Gemini** (`/api/gemini`)
    - **Endpoints:**
      - `POST /api/gemini/chat` - Chat with the Gemini model.
      - `POST /api/gemini/generate` - Generate content with Gemini.

  - **Llama** (`/api/llama`)
    - **Endpoints:**
      - `GET /api/llama/stream` - Stream responses from local Llama models.
      - **`POST /api/llama/execute-db` - Execute database operations via natural language.**

- **Nexus Storage** (`/api/nexusstorage`)
  - **Endpoints:**
    - `POST /api/nexusstorage/execute` - Execute database operations via Llama service.
    - `POST /api/nexusstorage/test` - Test Llama service operations.

## Acknowledgments

- Thanks to OpenAI, Anthropic, Grok, Google, Ollama, Lucide Icons, and Tailwind CSS.

## Roadmap

Current Focus:

- User authentication system
- Gamification features
- Profile page with leveling
- Archiving and trash management
- Focus mode
- AI integrations
- Local AI model support
- RAG (Retrieval Augmented Generation) implementation
- Agent implementation

Upcoming Features:

- Calendar & Email Integration
- Calendar sync with Google Calendar/Outlook
- Email-based task creation and reminders
- Automated meeting notes and summaries
- Smart email digests of your knowledge base
- Calendar-based task scheduling

Future Plans:

- Real-time collaboration
- Mobile applications
- Advanced AI features
- Data export/import
- API documentation
- Integration tests
