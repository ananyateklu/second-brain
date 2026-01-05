import { APIRequestContext } from '@playwright/test';

const API_BASE_URL = process.env.E2E_API_URL || 'http://localhost:5001/api';

/**
 * Helper class for making direct API calls during test setup/teardown.
 */
export class ApiHelpers {
  private request: APIRequestContext;
  private authToken: string | null = null;

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  /**
   * Set the authentication token for API requests.
   */
  setAuthToken(token: string) {
    this.authToken = token;
  }

  /**
   * Get default headers including authentication.
   */
  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    return headers;
  }

  /**
   * Login and get an auth token.
   */
  async login(email: string, password: string): Promise<string> {
    const response = await this.request.post(`${API_BASE_URL}/auth/login`, {
      data: { identifier: email, password },
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok()) {
      throw new Error(`Login failed: ${response.status()} ${await response.text()}`);
    }

    const data = await response.json();
    this.authToken = data.token;
    return data.token;
  }

  /**
   * Register a new test user.
   */
  async register(email: string, password: string, displayName: string): Promise<string> {
    const response = await this.request.post(`${API_BASE_URL}/auth/register`, {
      data: { email, password, displayName },
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok()) {
      throw new Error(`Registration failed: ${response.status()} ${await response.text()}`);
    }

    const data = await response.json();
    this.authToken = data.token;
    return data.token;
  }

  // Notes API
  async createNote(title: string, content: string, options?: { tags?: string[]; folder?: string }) {
    const response = await this.request.post(`${API_BASE_URL}/notes`, {
      data: { title, content, ...options },
      headers: this.getHeaders(),
    });

    if (!response.ok()) {
      throw new Error(`Create note failed: ${response.status()} ${await response.text()}`);
    }

    return response.json();
  }

  async getNote(id: string) {
    const response = await this.request.get(`${API_BASE_URL}/notes/${id}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok()) {
      throw new Error(`Get note failed: ${response.status()} ${await response.text()}`);
    }

    return response.json();
  }

  async deleteNote(id: string) {
    const response = await this.request.delete(`${API_BASE_URL}/notes/${id}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok()) {
      throw new Error(`Delete note failed: ${response.status()} ${await response.text()}`);
    }
  }

  async getAllNotes() {
    const response = await this.request.get(`${API_BASE_URL}/notes`, {
      headers: this.getHeaders(),
    });

    if (!response.ok()) {
      throw new Error(`Get notes failed: ${response.status()} ${await response.text()}`);
    }

    return response.json();
  }

  // Chat API
  async createConversation(title: string, options?: { provider?: string; model?: string; ragEnabled?: boolean }) {
    const response = await this.request.post(`${API_BASE_URL}/chat/conversations`, {
      data: { title, provider: 'openai', model: 'gpt-4o-mini', ...options },
      headers: this.getHeaders(),
    });

    if (!response.ok()) {
      throw new Error(`Create conversation failed: ${response.status()} ${await response.text()}`);
    }

    return response.json();
  }

  async deleteConversation(id: string) {
    const response = await this.request.delete(`${API_BASE_URL}/chat/conversations/${id}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok()) {
      throw new Error(`Delete conversation failed: ${response.status()} ${await response.text()}`);
    }
  }

  async getAllConversations() {
    const response = await this.request.get(`${API_BASE_URL}/chat/conversations`, {
      headers: this.getHeaders(),
    });

    if (!response.ok()) {
      throw new Error(`Get conversations failed: ${response.status()} ${await response.text()}`);
    }

    return response.json();
  }

  // Focus API
  async createFocusItem(title: string, options?: { priority?: number; description?: string; scheduledDate?: string }) {
    const response = await this.request.post(`${API_BASE_URL}/focus/items`, {
      data: { title, priority: 2, ...options },
      headers: this.getHeaders(),
    });

    if (!response.ok()) {
      throw new Error(`Create focus item failed: ${response.status()} ${await response.text()}`);
    }

    return response.json();
  }

  async deleteFocusItem(id: string) {
    const response = await this.request.delete(`${API_BASE_URL}/focus/items/${id}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok()) {
      throw new Error(`Delete focus item failed: ${response.status()} ${await response.text()}`);
    }
  }

  // Cleanup helpers
  async cleanupAllNotes() {
    const notes = await this.getAllNotes();
    for (const note of notes) {
      await this.deleteNote(note.id).catch(() => {});
    }
  }

  async cleanupAllConversations() {
    const conversations = await this.getAllConversations();
    for (const conv of conversations) {
      await this.deleteConversation(conv.id).catch(() => {});
    }
  }
}
