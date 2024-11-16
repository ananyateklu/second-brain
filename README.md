# Second Brain - AI-Powered Knowledge Management System

An AI-powered system to organize notes, ideas, tasks, and reminders with intelligent suggestions. Built with React, TypeScript, Tailwind CSS, and .NET 8.0.

## Table of Contents

- [Features](#features)
- [Technical Stack](#technical-stack)
- [Getting Started](#getting-started)
- [API Integration](#api-integration)
- [Acknowledgments](#acknowledgments)
- [Roadmap](#roadmap)

## Features

- **Knowledge Management**
  - Create, edit, and organize notes with rich text, tagging, and linking.
  - Capture and refine ideas with AI assistance.
  - Interactive mind mapping with visual relationship mapping.

- **Task and Reminder Management**
  - Create and track tasks with priorities and due dates.
  - Set recurring reminders with AI-powered suggestions.

- **AI Integration**
  - AI-powered suggestions for titles, content, and task descriptions.
  - Supports OpenAI, Google Gemini, Anthropic Claude, Grok API, and local models via **Ollama**.
  - **Database operations using natural language commands.**
  - Intelligent provider switching and local AI model support via ONNX Runtime.

- **User Experience**
  - Advanced tagging and knowledge linking.
  - Responsive design with dark/light mode and system detection.
  - Distraction-free focus mode with timed sessions.

- **Gamification and Activity Tracking**
  - Profile customization with avatars.
  - Experience points (XP), level progression, achievements, and badges.
  - Monitor progress and achievements.

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

2. **Update `appsettings.json` with your configuration.**

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

- User authentication system
- Gamification features
- Profile page with leveling
- Archiving and trash management
- Focus mode
- AI integrations
- Local AI model support
- **RAG (Retrieval Augmented Generation) implementation**
- **Agent implementation**

*Planned:*

- Real-time collaboration
- Mobile applications
- Advanced AI features
- Data export/import
- API documentation
- Integration tests
