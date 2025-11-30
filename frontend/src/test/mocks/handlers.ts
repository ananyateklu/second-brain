/**
 * MSW Request Handlers
 * Mock API handlers for testing
 */

import { http, HttpResponse } from 'msw';

const API_BASE = '/api';

// Mock data
const mockNotes = [
  {
    id: 'note-1',
    title: 'First Note',
    content: 'Content of first note',
    tags: ['work', 'important'],
    isArchived: false,
    createdAt: '2024-01-01T12:00:00Z',
    updatedAt: '2024-01-01T12:00:00Z',
  },
  {
    id: 'note-2',
    title: 'Second Note',
    content: 'Content of second note',
    tags: ['personal'],
    isArchived: false,
    createdAt: '2024-01-02T12:00:00Z',
    updatedAt: '2024-01-02T12:00:00Z',
  },
];

const mockUser = {
  userId: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  token: 'mock-jwt-token',
};

const mockConversations = [
  {
    id: 'conv-1',
    title: 'Test Conversation',
    messages: [],
    createdAt: '2024-01-01T12:00:00Z',
    updatedAt: '2024-01-01T12:00:00Z',
  },
];

export const handlers = [
  // Auth endpoints
  http.post(`${API_BASE}/auth/login`, async () => {
    return HttpResponse.json(mockUser);
  }),

  http.post(`${API_BASE}/auth/register`, async () => {
    return HttpResponse.json(mockUser);
  }),

  // Notes endpoints
  http.get(`${API_BASE}/notes`, () => {
    return HttpResponse.json(mockNotes);
  }),

  http.get(`${API_BASE}/notes/:id`, ({ params }) => {
    const note = mockNotes.find((n) => n.id === params.id);
    if (note) {
      return HttpResponse.json(note);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  http.post(`${API_BASE}/notes`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const newNote = {
      id: `note-${Date.now()}`,
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(newNote, { status: 201 });
  }),

  http.put(`${API_BASE}/notes/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    const note = mockNotes.find((n) => n.id === params.id);
    if (note) {
      const updatedNote = { ...note, ...body, updatedAt: new Date().toISOString() };
      return HttpResponse.json(updatedNote);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  http.delete(`${API_BASE}/notes/:id`, ({ params }) => {
    const note = mockNotes.find((n) => n.id === params.id);
    if (note) {
      return new HttpResponse(null, { status: 204 });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Chat endpoints
  http.get(`${API_BASE}/chat/conversations`, () => {
    return HttpResponse.json(mockConversations);
  }),

  http.get(`${API_BASE}/chat/conversations/:id`, ({ params }) => {
    const conversation = mockConversations.find((c) => c.id === params.id);
    if (conversation) {
      return HttpResponse.json(conversation);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  http.post(`${API_BASE}/chat/conversations`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const newConversation = {
      id: `conv-${Date.now()}`,
      ...body,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(newConversation, { status: 201 });
  }),

  // AI Health endpoints
  http.get(`${API_BASE}/ai/health`, () => {
    return HttpResponse.json({
      openai: { available: true },
      anthropic: { available: true },
      ollama: { available: false },
    });
  }),

  // Stats endpoints
  http.get(`${API_BASE}/stats`, () => {
    return HttpResponse.json({
      totalNotes: 10,
      totalConversations: 5,
      notesThisWeek: 3,
    });
  }),
];

export { mockNotes, mockUser, mockConversations };

