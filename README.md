# Second Brain - Knowledge Management System

A modern, AI-powered knowledge management system built with React, TypeScript, and Tailwind CSS for the frontend, and .NET 8.0 for the backend with SQL Server for the database. This application helps users organize notes, ideas, tasks, and reminders with intelligent suggestions and connections.

## Table of Contents

- [Features](#features)
  - [Core Functionality](#core-functionality)
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

### AI Integration

- **OpenAI and Anthropic Integration**
  - Intelligent title suggestions
  - Content generation assistance
  - Smart tagging recommendations
  - Context-aware suggestions

### Organization Features

- **Advanced Tagging**
  - Flexible tag management
  - Tag suggestions
  - Tag-based filtering and search

- **Knowledge Linking**
  - Connect related items
  - Visual relationship mapping
  - Contextual suggestions

- **Trash Management**
  - Soft delete functionality
  - Restore capabilities
  - Automatic cleanup

### User Experience

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

- React 18
- TypeScript
- Tailwind CSS
- Vite
- Lucide Icons
- React Router DOM
- Cytoscape.js and React-Cytoscape for mind mapping
- OpenAI and Anthropic SDKs for AI features

### Backend

- .NET 8.0
- ASP.NET Core Web API
- Entity Framework Core
- SQL Server
- JWT Authentication
- Swagger for API documentation

### AI Integration

- OpenAI API (GPT-4)
- Anthropic Claude

### State Management

- React Context
- Custom hooks

## Getting Started

### Prerequisites

- **Node.js** 18+
- **npm** or **yarn**
- **.NET SDK** 8.0
- **SQL Server** instance
- **OpenAI** and **Anthropic** API keys

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

3. **Create a `.env` file in the root directory:**

   ```env
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here
   VITE_API_BASE_URL=http://localhost:5127/api
   ```

4. **Start the development server:**

   ```bash
   npm run dev
   ```

#### Backend Setup

1. **Navigate to the backend directory:**

   ```bash
   cd ../backend/SecondBrain.Api
   ```

2. **Update the `appsettings.json` with your database connection string and API keys.**

   ```json:backend/SecondBrain.Api/appsettings.json
   {
     "Logging": {
       "LogLevel": {
         "Default": "Information",
         "Microsoft.AspNetCore": "Warning"
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
         "AccessTokenExpirationMinutes": "60",
         "RefreshTokenExpirationDays": "30"
       }
     },
     "Anthropic": {
       "ApiKey": "your_anthropic_api_key_here",
       "ApiEndpoint": "https://api.anthropic.com/v1"
     },
     "AllowedHosts": "*"
   }
   ```

3. **Restore NuGet packages:**

   ```bash
   dotnet restore
   ```

4. **Apply database migrations:**

   ```bash
   dotnet ef database update
   ```

5. **Run the API:**

   ```bash
   dotnet run
   ```

## API Integration

The frontend communicates with the backend API to perform CRUD operations, authentication, and AI-powered features. The API follows RESTful principles and uses JSON for request and response payloads.

- **Authentication**: JWT-based authentication with login, registration, and token refresh endpoints.
- **Notes API**: Endpoints for creating, retrieving, updating, and deleting notes. Supports tagging, linking, and searching.
- **Tasks API**: Endpoints for task management, including priority levels and due dates.
- **Reminders API**: Endpoints for setting and managing reminders, including recurring options.
- **AI Endpoints**: Integrates with OpenAI and Anthropic APIs for intelligent suggestions.

For detailed API documentation, refer to the [API Integration Guide](frontend/docs/api-integration.md).

## Acknowledgments

- [OpenAI](https://openai.com/) for GPT-4 API
- [Anthropic](https://www.anthropic.com/) for Claude API
- [Lucide Icons](https://lucide.dev/) for beautiful icons
- [Tailwind CSS](https://tailwindcss.com/) team for the amazing styling framework

## Roadmap

- [ ] User authentication system
- [ ] Real-time collaboration features
- [ ] Mobile applications
- [ ] Advanced AI features
- [ ] Data export/import capabilities
- [ ] API documentation
- [ ] Integration tests