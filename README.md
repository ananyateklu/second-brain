# Second Brain - AI-Powered Knowledge Management System

A modern, AI-powered knowledge management system built with React, TypeScript, and Tailwind CSS for the frontend, and .NET 8.0 for the backend with SQL Server for the database. This application helps users organize notes, ideas, tasks, and reminders with intelligent suggestions and connections.

## Table of Contents

- [Features](#features)
  - [Core Functionality](#core-functionality)
  - [Gamification Features](#gamification-features)
  - [AI Integration](#ai-integration)
  - [Organization Features](#organization-features)
  - [User Experience](#user-experience)
- [Technical Stack](#technical-stack)
  - [Frontend](#frontend)
  - [Backend](#backend)
  - [AI Integration](#ai-integration-1)
  - [State Management](#state-management)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [API Integration](#api-integration)
- [Acknowledgments](#acknowledgments)
- [Roadmap](#roadmap)

## Features

### Core Functionality

- **Notes Management**

  - Create, edit, and organize notes
  - Rich text formatting
  - Tags and categorization
  - AI-powered title and content suggestions
  - Link notes together for better organization
  - Archiving and Trash Management
    - Soft delete notes (move to Trash)
    - Restore notes from Trash
    - Permanent deletion from Trash after a defined period

- **Ideas Hub**

  - Capture and develop ideas
  - AI-assisted idea refinement
  - Visual mind mapping
  - Idea linking and relationship mapping

- **Task Management**

  - Create and track tasks
  - Priority levels and due dates
  - Link tasks to related notes and ideas
  - AI-suggested task descriptions

- **Smart Reminders**

  - Set and manage reminders
  - Recurring reminder options
  - Snooze functionality
  - AI-powered reminder suggestions

- **Mind Mapping**

  - Interactive graph visualization
  - Node linking and relationship mapping
  - Custom node styling and layouts
  - Zoom and pan controls

- **Activity Tracking**

  - User action logging
  - Progress monitoring
  - Achievement tracking
  - XP calculations

- **Smart Suggestions**

  - AI-powered content generation
  - Title suggestions
  - Tag recommendations
  - Related content linking

- **Data Organization**
  - Hierarchical note structure
  - Task prioritization
  - Smart reminder system
  - Archive and trash management

### Gamification Features

- **Profile Page and Leveling System**

  - Personal profile with avatar customization
  - Experience Points (XP) system
  - Level progression based on XP
  - Visual progress bar showing XP towards next level

- **Achievements and Badges**

  - Unlock achievements by completing specific actions
  - View earned badges on your profile
  - Share achievements with others

- **Focus Mode**
  - Distraction-free environment for enhanced productivity
  - Minimalistic UI when focus mode is enabled
  - Timed focus sessions with progress tracking

### AI Integration

- **Multiple AI Provider Support**

  - Frontend Integrations:
    - OpenAI API
    - Google Gemini API
  - Backend Integrations:
    - Anthropic Claude
    - Grok API
  - Intelligent provider switching
  - Provider-specific optimizations

- **Local Model Support**
  - Offline AI capabilities using local language models
  - Enhanced privacy and faster response times
  - ONNX Runtime integration

### Organization Features

- **Advanced Tagging**

  - Flexible tag management
  - Tag suggestions
  - Tag-based filtering and search

- **Knowledge Linking**

  - Connect related items
  - Visual relationship mapping
  - Contextual suggestions

- **Archiving and Trash Management**
  - **Archiving Notes**
    - Move seldom-used notes to the archive
    - Keep your workspace uncluttered
  - **Trash Page**
    - Soft delete functionality
    - Restore or permanently delete notes
    - Automatic cleanup of old trashed items

### User Experience

- **Profile Page**

  - View and edit personal information
  - Customize avatar and profile settings
  - Track your progress and achievements

- **Dark/Light Mode**

  - System preference detection
  - Manual toggle option
  - Consistent styling

- **Responsive Design**
  - Mobile-friendly interface
  - Adaptive layouts
  - Touch-optimized interactions

## Technical Stack

### Frontend

- **Frameworks and Libraries**

  - React 18
  - TypeScript
  - Tailwind CSS
  - Vite
  - React Router DOM
  - Cytoscape.js and React-Cytoscape for mind mapping
  - Lucide Icons for iconography

- **State Management**

  - React Context
  - Custom hooks

- **Additional Features**

  - Focus Mode Implementation
  - Custom components for focus sessions
  - Timers and progress indicators

- **AI Integration Libraries**

  - @anthropic-ai/sdk
  - @google/generative-ai
  - openai

- **UI/UX Libraries**

  - @headlessui/react
  - framer-motion
  - react-beautiful-dnd
  - react-circular-progressbar
  - react-select

- **Visualization**

  - cytoscape
  - react-cytoscapejs (for mind mapping)

- **Development Tools**
  - TypeScript 5.5
  - Vite 5.4
  - ESLint 9.9
  - Tailwind CSS 3.4

### Backend

- **Technologies**

  - .NET 8.0
  - ASP.NET Core Web API
  - Entity Framework Core
  - SQL Server

- **Authentication and Security**

  - JWT Authentication
  - Role-based access control
  - Secure password hashing

- **API Documentation**

  - Swagger for API documentation and testing

- **AI Integration**

  - **Third-Party APIs**

    - OpenAI API (GPT-3.5, GPT-4)
    - Anthropic Claude (claude-3-5-sonnet, claude-3-opus, claude-3-haiku)
    - Grok API (Grok-beta)
    - Google Gemini (gemini-1.5-flash, gemini-1.5-pro)

  - **Local Model Support**
    - Integration with local AI models
    - ONNX Runtime support
    - Supported models:
      - llama3.1:8b
      - llama3.2
      - codegemma
      - gemma2:2b
      - gemma2:9b
      - nemotron-mini
      - Mistral-nemo
      - starcoder2:7b
      - orca2
      - samantha-mistral
      - nexusraven
      - granite3-dense:8b
      - qwen2.5-coder
      - phi3.5

- **State Management**

  - **Backend**

    - Entity Framework Core
    - AutoMapper

  - **Frontend**
    - React Context API
    - Local storage for settings

- **AI Services**

  - Anthropic Claude Integration
  - Grok API Integration
  - Local Llama Integration via Ollama
  - AI Model Management System

- **Gamification System**

  - XP Service
  - Achievement System
  - Level Progression
  - User Stats Tracking

- **Data Models**

  - Notes with linking capability
  - Tasks with priority levels
  - Reminders with recurrence
  - Ideas with mind mapping
  - Activities tracking
  - User achievements

- **Security**
  - JWT with refresh token rotation
  - Concurrent session handling
  - Rate limiting

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- .NET SDK 8.0
- SQL Server instance
- API keys for:
  - OpenAI (frontend)
  - Google Cloud (frontend, for Gemini AI)
  - Anthropic (backend)
  - Grok (backend)
- Local AI Model (optional)

### Installation

#### Frontend Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/second-brain.git
   cd second-brain/frontend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Create a `.env` file:**

   ```env
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here
   VITE_GROK_API_KEY=your_grok_api_key_here
   VITE_GOOGLE_API_KEY=your_google_api_key_here
   VITE_API_BASE_URL=http://localhost:5127/api
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

#### Backend Setup

1. **Navigate to backend:**

   ```bash
   cd ../backend/SecondBrain.Api
   ```

2. **Update `appsettings.json`:**

   ```json
   {
     "Logging": {
       "LogLevel": {
         "Default": "Information",
         "Microsoft.AspNetCore": "Warning",
         "SecondBrain.Api.Services.AnthropicService": "Debug"
       }
     },
     "ConnectionStrings": {
       "DefaultConnection": "Your_SQL_Server_Connection_String_Here"
     },
     "Authentication": {
       "Jwt": {
         "Secret": "your_jwt_secret_key_here",
         "Issuer": "SecondBrain",
         "Audience": "SecondBrain",
         "AccessTokenExpirationMinutes": "600",
         "RefreshTokenExpirationDays": "30"
       }
     },
     "Anthropic": {
       "ApiKey": "your_anthropic_api_key_here",
       "ApiEndpoint": "https://api.anthropic.com/v1"
     },
     "Grok": {
       "ApiKey": "your_grok_api_key_here"
     },
     "Llama": {
       "OllamaUri": "http://localhost:11434/"
     },
     "AllowedHosts": "*"
   }
   ```

3. **Setup database:**
   ```bash
   dotnet restore
   dotnet ef database update
   dotnet run
   ```

#### Local AI Model Setup (Optional)

1. Download compatible model files
2. Configure backend for local model
3. Install ONNX Runtime dependencies

## API Integration

RESTful API with JSON payloads for:

- Authentication (JWT-based)
- Notes CRUD operations
- Tasks management
- Reminders
- Gamification features
- AI integrations

### API Endpoints

- **/api/Auth** - Authentication and user management
- **/api/Notes** - Note CRUD operations
- **/api/Tasks** - Task management
- **/api/Reminders** - Reminder system
- **/api/Ideas** - Idea management
- **/api/Activities** - Activity tracking
- **/api/Claude** - Anthropic AI integration
- **/api/Grok** - Grok AI integration
- **/api/Llama** - Local AI integration

Each endpoint supports:

- GET (list/detail)
- POST (create)
- PUT/PATCH (update)
- DELETE (soft/hard delete)

## Acknowledgments

- OpenAI for GPT-4 API
- Anthropic for Claude API
- Grok for AI integration
- Google for Gemini AI
- Lucide Icons
- Tailwind CSS team

## Roadmap

- [x] User authentication system
- [x] Gamification features
- [x] Profile page with leveling
- [x] Archiving and trash management
- [x] Focus mode
- [x] AI integration (OpenAI, Anthropic, Grok)
- [x] Local AI model support
- [ ] Real-time collaboration
- [ ] Mobile applications
- [ ] Advanced AI features
- [ ] Data export/import
- [ ] API documentation
- [ ] Integration tests
