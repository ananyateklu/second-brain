# Second Brain API Integration Guide

## Overview

This document outlines the API specifications for the Second Brain knowledge management system. The API follows RESTful principles and uses JSON for request/response payloads.

## Base URL

```
Production: https://api.secondbrain.io/v1
Development: http://localhost:3000/v1
```

## Authentication

### Token-based Authentication

All API requests must include a JWT token in the Authorization header:

```http
Authorization: Bearer <jwt_token>
```

### Obtaining Authentication Tokens

```http
POST /auth/login
POST /auth/register
POST /auth/refresh
```

#### Login Request
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

#### Login Response
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "usr_123",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-03-15T10:30:00Z"
  }
}
```

## API Endpoints

### Notes

#### List Notes
```http
GET /notes
```

Query Parameters:
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (default: 20)
- `sort` (optional): Sort field (createdAt, updatedAt, title)
- `order` (optional): Sort order (asc, desc)
- `tags` (optional): Filter by tags (comma-separated)
- `search` (optional): Search term

Response:
```json
{
  "data": [
    {
      "id": "note_123",
      "title": "Project Planning",
      "content": "Meeting notes for Q2 planning...",
      "tags": ["planning", "q2", "projects"],
      "isPinned": false,
      "isFavorite": true,
      "createdAt": "2024-03-15T10:30:00Z",
      "updatedAt": "2024-03-15T10:30:00Z",
      "linkedNotes": ["note_456", "note_789"]
    }
  ],
  "meta": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 100,
    "itemsPerPage": 20
  }
}
```

#### Create Note
```http
POST /notes
```

Request:
```json
{
  "title": "Project Planning",
  "content": "Meeting notes for Q2 planning...",
  "tags": ["planning", "q2", "projects"],
  "isPinned": false,
  "isFavorite": false
}
```

#### Update Note
```http
PATCH /notes/:id
```

Request:
```json
{
  "title": "Updated Title",
  "content": "Updated content...",
  "tags": ["updated", "tags"]
}
```

#### Delete Note
```http
DELETE /notes/:id
```

#### Link Notes
```http
POST /notes/:id/links
```

Request:
```json
{
  "targetNoteId": "note_456",
  "linkType": "related"
}
```

### Tasks

#### List Tasks
```http
GET /tasks
```

Query Parameters:
- `status` (optional): Filter by status (incomplete, completed)
- `priority` (optional): Filter by priority (low, medium, high)
- `dueDate` (optional): Filter by due date (overdue, today, week, none)

Response:
```json
{
  "data": [
    {
      "id": "task_123",
      "title": "Review Documentation",
      "description": "Review and update API docs",
      "status": "incomplete",
      "priority": "high",
      "dueDate": "2024-03-20T15:00:00Z",
      "tags": ["documentation", "api"],
      "linkedNotes": ["note_123"],
      "createdAt": "2024-03-15T10:30:00Z",
      "updatedAt": "2024-03-15T10:30:00Z"
    }
  ],
  "meta": {
    "currentPage": 1,
    "totalPages": 3,
    "totalItems": 50,
    "itemsPerPage": 20
  }
}
```

### Reminders

#### List Reminders
```http
GET /reminders
```

Query Parameters:
- `status` (optional): Filter by status (pending, completed, snoozed)
- `timeframe` (optional): Filter by timeframe (overdue, today, upcoming)

Response:
```json
{
  "data": [
    {
      "id": "rem_123",
      "title": "Team Meeting",
      "description": "Weekly sync with team",
      "dueDateTime": "2024-03-20T10:00:00Z",
      "repeatInterval": "weekly",
      "tags": ["meetings", "team"],
      "isSnoozed": false,
      "isCompleted": false,
      "createdAt": "2024-03-15T10:30:00Z",
      "updatedAt": "2024-03-15T10:30:00Z"
    }
  ]
}
```

### AI Integration

#### Generate Title
```http
POST /ai/generate/title
```

Request:
```json
{
  "content": "Meeting notes content...",
  "type": "note",
  "context": {
    "currentTitle": "Old Title",
    "tags": ["meetings", "notes"]
  }
}
```

Response:
```json
{
  "title": "Q2 Planning Meeting Notes and Action Items"
}
```

#### Generate Content Suggestions
```http
POST /ai/generate/content
```

Request:
```json
{
  "title": "Project Planning",
  "type": "note",
  "context": {
    "currentContent": "Current content...",
    "tags": ["planning", "projects"]
  }
}
```

## WebSocket Connections

### Real-time Updates

Connect to:
```
wss://api.secondbrain.io/v1/ws
```

Required Headers:
```
Authorization: Bearer <jwt_token>
```

### Event Types

```typescript
interface WebSocketEvent {
  type: 'note.updated' | 'note.deleted' | 'task.updated' | 'reminder.due';
  payload: {
    id: string;
    [key: string]: any;
  };
}
```

## Error Handling

### HTTP Status Codes

- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 422: Validation Error
- 429: Rate Limit Exceeded
- 500: Server Error

### Error Response Format

```json
{
  "error": {
    "code": "validation_error",
    "message": "Invalid input data",
    "details": [
      {
        "field": "title",
        "message": "Title is required"
      }
    ]
  }
}
```

## Rate Limiting

- 100 requests per minute per IP
- 1000 requests per hour per user
- Rate limit headers included in responses:
  ```
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 95
  X-RateLimit-Reset: 1500000000
  ```

## Environment Variables

```env
# Server Configuration
PORT=3000
NODE_ENV=development
API_VERSION=v1

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/secondbrain

# Authentication
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# AI Services
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Redis (for rate limiting and caching)
REDIS_URL=redis://localhost:6379

# WebSocket
WS_PORT=3001
```

## Data Models

### Note
```typescript
interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  archivedAt?: string;
  linkedNotes: string[];
  createdAt: string;
  updatedAt: string;
  userId: string;
}
```

### Task
```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'incomplete' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate: string | null;
  tags: string[];
  linkedNotes: string[];
  linkedIdeas: string[];
  createdAt: string;
  updatedAt: string;
  userId: string;
}
```

### Reminder
```typescript
interface Reminder {
  id: string;
  title: string;
  description?: string;
  dueDateTime: string;
  repeatInterval?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  customRepeatPattern?: string;
  tags: string[];
  isSnoozed: boolean;
  snoozeUntil?: string;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}
```

## Sequence Diagrams

### Note Creation with AI Title Generation

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API
    participant AI as AI Service
    participant DB as Database

    C->>A: POST /notes (draft content)
    A->>AI: Generate title suggestion
    AI-->>A: Return suggested title
    A->>DB: Save note with generated title
    DB-->>A: Confirm save
    A-->>C: Return created note
    
    Note over C,DB: WebSocket Update
    A->>C: Broadcast note.created event
```

### Task Completion with Linked Notes

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API
    participant DB as Database

    C->>A: PATCH /tasks/:id (mark complete)
    A->>DB: Update task status
    A->>DB: Fetch linked notes
    DB-->>A: Return linked notes
    A->>DB: Update linked notes metadata
    DB-->>A: Confirm updates
    A-->>C: Return updated task
    
    Note over C,DB: WebSocket Updates
    A->>C: Broadcast task.completed event
    A->>C: Broadcast note.updated events
```

### Reminder Creation with Recurrence

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API
    participant S as Scheduler
    participant DB as Database

    C->>A: POST /reminders
    A->>DB: Save reminder
    A->>S: Schedule notifications
    S-->>A: Confirm scheduling
    A-->>C: Return created reminder
    
    Note over S,C: When reminder is due
    S->>A: Trigger reminder
    A->>C: Send WebSocket notification
    alt is recurring
        A->>S: Schedule next occurrence
    end
```