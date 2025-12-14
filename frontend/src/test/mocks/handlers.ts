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
    provider: 'OpenAI',
    model: 'gpt-4o-mini',
    ragEnabled: false,
    agentEnabled: false,
    messages: [],
    createdAt: '2024-01-01T12:00:00Z',
    updatedAt: '2024-01-01T12:00:00Z',
  },
];

const mockAIProviders = {
  providers: [
    {
      name: 'OpenAI',
      isEnabled: true,
      models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    },
    {
      name: 'Anthropic',
      isEnabled: true,
      models: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'],
    },
    {
      name: 'Ollama',
      isEnabled: false,
      models: [],
    },
  ],
};

const mockIndexingStats = {
  totalNotes: 10,
  indexedNotes: 8,
  totalChunks: 45,
  lastIndexedAt: '2024-01-15T12:00:00Z',
};

// Mock version history data for note versioning tests
const mockVersionHistory = [
  {
    versionNumber: 3,
    isCurrent: true,
    validFrom: '2024-01-03T12:00:00Z',
    validTo: null,
    title: 'Updated Title v3',
    content: 'Updated content v3',
    tags: ['work', 'important', 'updated'],
    isArchived: false,
    folder: 'Projects',
    modifiedBy: 'user-123',
    changeSummary: 'Updated: title, content, tags',
    source: 'web',
    createdAt: '2024-01-03T12:00:00Z',
  },
  {
    versionNumber: 2,
    isCurrent: false,
    validFrom: '2024-01-02T12:00:00Z',
    validTo: '2024-01-03T12:00:00Z',
    title: 'Updated Title v2',
    content: 'Updated content v2',
    tags: ['work', 'important'],
    isArchived: false,
    folder: null,
    modifiedBy: 'user-123',
    changeSummary: 'Updated: title, content',
    source: 'agent',
    createdAt: '2024-01-02T12:00:00Z',
  },
  {
    versionNumber: 1,
    isCurrent: false,
    validFrom: '2024-01-01T12:00:00Z',
    validTo: '2024-01-02T12:00:00Z',
    title: 'First Note',
    content: 'Content of first note',
    tags: ['work', 'important'],
    isArchived: false,
    folder: null,
    modifiedBy: 'user-123',
    changeSummary: 'Initial version',
    source: 'web',
    createdAt: '2024-01-01T12:00:00Z',
  },
];

const mockRagAnalytics = {
  totalQueries: 100,
  queriesWithFeedback: 25,
  positiveFeedback: 20,
  negativeFeedback: 5,
  positiveFeedbackRate: 0.8,
  avgTotalTimeMs: 450,
  avgRetrievedCount: 3.5,
};

export const handlers = [
  // ============================================
  // Auth Endpoints
  // ============================================
  http.post(`${API_BASE}/auth/login`, () => {
    return HttpResponse.json(mockUser);
  }),

  http.post(`${API_BASE}/auth/register`, () => {
    return HttpResponse.json(mockUser);
  }),

  http.post(`${API_BASE}/auth/logout`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // ============================================
  // Notes Endpoints
  // ============================================
  http.get(`${API_BASE}/notes`, () => {
    return HttpResponse.json(mockNotes);
  }),

  // Versioned route support
  http.get(`${API_BASE}/v1/notes`, () => {
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
      isArchived: false,
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

  http.post(`${API_BASE}/notes/bulk-delete`, async ({ request }) => {
    const body = await request.json() as { noteIds: string[] };
    return HttpResponse.json({ deletedCount: body.noteIds.length });
  }),

  // ============================================
  // Note Version History Endpoints
  // ============================================
  http.get(`${API_BASE}/notes/:id/versions`, ({ params }) => {
    const noteId = params.id as string;
    const note = mockNotes.find((n) => n.id === noteId);
    if (!note) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({
      noteId,
      totalVersions: 3,
      currentVersion: 3,
      versions: mockVersionHistory.map((v) => ({ ...v, noteId })),
    });
  }),

  http.get(`${API_BASE}/notes/:id/versions/at`, ({ params, request }) => {
    const noteId = params.id as string;
    const url = new URL(request.url);
    const timestamp = url.searchParams.get('timestamp');
    if (!timestamp) {
      return new HttpResponse(null, { status: 400 });
    }
    const note = mockNotes.find((n) => n.id === noteId);
    if (!note) {
      return new HttpResponse(null, { status: 404 });
    }
    // Return version 1 for any timestamp query
    return HttpResponse.json({
      ...mockVersionHistory[2],
      noteId,
    });
  }),

  http.get(`${API_BASE}/notes/:id/versions/diff`, ({ params, request }) => {
    const noteId = params.id as string;
    const url = new URL(request.url);
    const fromVersion = parseInt(url.searchParams.get('fromVersion') || '1');
    const toVersion = parseInt(url.searchParams.get('toVersion') || '2');

    const note = mockNotes.find((n) => n.id === noteId);
    if (!note) {
      return new HttpResponse(null, { status: 404 });
    }

    const from = mockVersionHistory.find((v) => v.versionNumber === fromVersion);
    const to = mockVersionHistory.find((v) => v.versionNumber === toVersion);

    if (!from || !to) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json({
      noteId,
      fromVersion: { ...from, noteId },
      toVersion: { ...to, noteId },
      titleChanged: from.title !== to.title,
      contentChanged: from.content !== to.content,
      tagsChanged: JSON.stringify(from.tags) !== JSON.stringify(to.tags),
      archivedChanged: from.isArchived !== to.isArchived,
      folderChanged: from.folder !== to.folder,
      tagsAdded: to.tags.filter((t: string) => !from.tags.includes(t)),
      tagsRemoved: from.tags.filter((t: string) => !to.tags.includes(t)),
    });
  }),

  http.post(`${API_BASE}/notes/:id/versions/restore`, async ({ params, request }) => {
    const noteId = params.id as string;
    const body = await request.json() as { targetVersion: number };

    const note = mockNotes.find((n) => n.id === noteId);
    if (!note) {
      return new HttpResponse(null, { status: 404 });
    }

    const targetVersionData = mockVersionHistory.find((v) => v.versionNumber === body.targetVersion);
    if (!targetVersionData) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json({
      message: `Note restored to version ${body.targetVersion}`,
      newVersionNumber: 4,
      noteId,
    });
  }),

  // ============================================
  // Chat/Conversations Endpoints
  // ============================================
  http.get(`${API_BASE}/chat/conversations`, () => {
    return HttpResponse.json(mockConversations);
  }),

  http.get(`${API_BASE}/v1/chat/conversations`, () => {
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
      title: body.title || 'New Conversation',
      provider: body.provider || 'OpenAI',
      model: body.model || 'gpt-4o-mini',
      ragEnabled: body.ragEnabled || false,
      agentEnabled: body.agentEnabled || false,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(newConversation, { status: 201 });
  }),

  http.delete(`${API_BASE}/chat/conversations/:id`, ({ params }) => {
    const conversation = mockConversations.find((c) => c.id === params.id);
    if (conversation) {
      return new HttpResponse(null, { status: 204 });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  http.post(`${API_BASE}/chat/conversations/bulk-delete`, async ({ request }) => {
    const body = await request.json() as { conversationIds: string[] };
    return HttpResponse.json({ deletedCount: body.conversationIds.length });
  }),

  // Chat message (non-streaming)
  http.post(`${API_BASE}/chat/conversations/:id/messages`, () => {
    return HttpResponse.json({
      conversation: {
        ...mockConversations[0],
        messages: [
          { role: 'user', content: 'Hello', timestamp: new Date().toISOString() },
          { role: 'assistant', content: 'Hello! How can I help you?', timestamp: new Date().toISOString() },
        ],
      },
      retrievedNotes: [],
    });
  }),

  // Chat message streaming (SSE)
  http.post(`${API_BASE}/chat/conversations/:id/messages/stream`, () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Send start event
        controller.enqueue(encoder.encode('event: start\ndata: {"status":"streaming"}\n\n'));

        // Simulate streaming tokens
        const tokens = ['Hello', '!', ' How', ' can', ' I', ' help', ' you', ' today', '?'];
        tokens.forEach((token, index) => {
          setTimeout(() => {
            controller.enqueue(encoder.encode(`data: ${token}\n\n`));

            // Send end event after last token
            if (index === tokens.length - 1) {
              setTimeout(() => {
                controller.enqueue(encoder.encode('event: end\ndata: {"conversationId":"conv-1","inputTokens":10,"outputTokens":9}\n\n'));
                controller.close();
              }, 10);
            }
          }, index * 10);
        });
      },
    });

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }),

  // Image generation providers
  http.get(`${API_BASE}/chat/image-generation/providers`, () => {
    return HttpResponse.json([
      { provider: 'OpenAI', models: ['dall-e-3', 'dall-e-2'], isEnabled: true },
      { provider: 'Gemini', models: ['gemini-image'], isEnabled: true },
    ]);
  }),

  // ============================================
  // AI Health Endpoints
  // ============================================
  http.get(`${API_BASE}/ai/health`, () => {
    return HttpResponse.json(mockAIProviders);
  }),

  http.get(`${API_BASE}/ai/health/:provider`, ({ params }) => {
    const provider = mockAIProviders.providers.find(
      (p) => p.name.toLowerCase() === String(params.provider).toLowerCase()
    );
    if (provider) {
      return HttpResponse.json(provider);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // ============================================
  // Indexing Endpoints
  // ============================================
  http.get(`${API_BASE}/indexing/stats`, () => {
    return HttpResponse.json(mockIndexingStats);
  }),

  http.post(`${API_BASE}/indexing/start`, () => {
    return HttpResponse.json({
      jobId: `job-${Date.now()}`,
      status: 'started',
      message: 'Indexing job started',
    });
  }),

  http.get(`${API_BASE}/indexing/status/:jobId`, () => {
    return HttpResponse.json({
      status: 'completed',
      progress: 100,
      processedNotes: 10,
      totalNotes: 10,
    });
  }),

  // ============================================
  // RAG Analytics Endpoints
  // ============================================
  http.get(`${API_BASE}/rag/analytics/stats`, () => {
    return HttpResponse.json(mockRagAnalytics);
  }),

  http.get(`${API_BASE}/rag/analytics/logs`, () => {
    return HttpResponse.json({
      items: [
        {
          id: 'log-1',
          query: 'What is TypeScript?',
          totalTimeMs: 350,
          userFeedback: 'thumbs_up',
          createdAt: '2024-01-15T12:00:00Z',
        },
        {
          id: 'log-2',
          query: 'How to use React hooks?',
          totalTimeMs: 420,
          userFeedback: null,
          createdAt: '2024-01-14T12:00:00Z',
        },
      ],
      totalCount: 2,
      page: 1,
      pageSize: 10,
    });
  }),

  http.post(`${API_BASE}/rag/analytics/feedback`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${API_BASE}/rag/analytics/topics`, () => {
    return HttpResponse.json([
      { id: 0, label: 'Programming', queryCount: 45 },
      { id: 1, label: 'AI/ML', queryCount: 30 },
      { id: 2, label: 'DevOps', queryCount: 15 },
    ]);
  }),

  // ============================================
  // Stats Endpoints
  // ============================================
  http.get(`${API_BASE}/stats/dashboard`, () => {
    return HttpResponse.json({
      totalNotes: 10,
      totalConversations: 5,
      notesThisWeek: 3,
      activeProviders: 2,
    });
  }),

  http.get(`${API_BASE}/stats/ai`, () => {
    return HttpResponse.json({
      totalTokensUsed: 15000,
      totalRequests: 50,
      averageResponseTime: 1200,
    });
  }),

  http.get(`${API_BASE}/stats/notes`, () => {
    return HttpResponse.json({
      totalNotes: 10,
      archivedNotes: 2,
      notesWithTags: 8,
      uniqueTags: 15,
    });
  }),

  // ============================================
  // User Preferences Endpoints
  // ============================================
  http.get(`${API_BASE}/userpreferences/:userId`, () => {
    return HttpResponse.json({
      theme: 'dark',
      chatProvider: 'OpenAI',
      chatModel: 'gpt-4o-mini',
      vectorStore: 'PostgreSQL',
      useRemoteOllama: false,
    });
  }),

  http.put(`${API_BASE}/userpreferences/:userId`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(body);
  }),

  // ============================================
  // Agent Endpoints
  // ============================================
  http.get(`${API_BASE}/agent/capabilities`, () => {
    return HttpResponse.json([
      { id: 'notes', displayName: 'Notes Management', description: 'Create, update, and search notes' },
    ]);
  }),

  http.get(`${API_BASE}/agent/providers`, () => {
    return HttpResponse.json([
      { name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini'] },
    ]);
  }),
];

export { mockNotes, mockUser, mockConversations, mockAIProviders, mockIndexingStats, mockRagAnalytics, mockVersionHistory };

