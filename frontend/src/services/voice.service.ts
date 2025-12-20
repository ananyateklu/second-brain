import { apiClient } from '../lib/api-client';
import { API_ENDPOINTS } from '../lib/constants';
import type {
  VoiceSession,
  VoiceSessionOptions,
  CreateVoiceSessionResult,
  VoiceInfo,
  GrokVoiceInfo,
  VoiceServiceStatus,
  ClientVoiceMessage,
  ServerVoiceMessage,
  VoiceSessionState,
} from '../features/voice/types/voice-types';

// ============================================================================
// REST API Service
// ============================================================================

export const voiceService = {
  /**
   * Create a new voice session
   */
  async createSession(options: VoiceSessionOptions): Promise<CreateVoiceSessionResult> {
    return apiClient.post<CreateVoiceSessionResult>(API_ENDPOINTS.VOICE.SESSIONS, options);
  },

  /**
   * Get session details
   */
  async getSession(sessionId: string): Promise<VoiceSession> {
    return apiClient.get<VoiceSession>(API_ENDPOINTS.VOICE.SESSION_BY_ID(sessionId));
  },

  /**
   * End a voice session
   */
  async endSession(sessionId: string): Promise<void> {
    return apiClient.delete(API_ENDPOINTS.VOICE.SESSION_BY_ID(sessionId));
  },

  /**
   * Get available TTS voices
   */
  async getVoices(): Promise<VoiceInfo[]> {
    return apiClient.get<VoiceInfo[]>(API_ENDPOINTS.VOICE.VOICES);
  },

  /**
   * Get available Grok Voice voices (xAI Realtime API)
   */
  async getGrokVoices(): Promise<GrokVoiceInfo[]> {
    return apiClient.get<GrokVoiceInfo[]>(API_ENDPOINTS.VOICE.GROK_VOICES);
  },

  /**
   * Get voice service status
   */
  async getStatus(): Promise<VoiceServiceStatus> {
    return apiClient.get<VoiceServiceStatus>(API_ENDPOINTS.VOICE.STATUS);
  },

  /**
   * Create a WebSocket connection for voice streaming
   */
  createWebSocketConnection(
    sessionId: string,
    callbacks: VoiceWebSocketCallbacks
  ): VoiceWebSocketConnection {
    return new VoiceWebSocketConnection(sessionId, callbacks);
  },
};

// ============================================================================
// WebSocket Connection Manager
// ============================================================================

export interface VoiceWebSocketCallbacks {
  onStateChange?: (state: VoiceSessionState | number, reason?: string) => void;
  onTranscript?: (text: string, isFinal: boolean, confidence: number) => void;
  onAudioChunk?: (audioData: ArrayBuffer, sequence: number, isFinal: boolean, sampleRate?: number) => void;
  onError?: (code: string, message: string, recoverable: boolean) => void;
  onMetadata?: (event: string, data?: Record<string, unknown>) => void;
  onConnected?: () => void;
  onDisconnected?: (reason?: string) => void;
}

export class VoiceWebSocketConnection {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private callbacks: VoiceWebSocketCallbacks;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;
  private intentionalDisconnect = false;

  constructor(sessionId: string, callbacks: VoiceWebSocketCallbacks) {
    this.sessionId = sessionId;
    this.callbacks = callbacks;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  async connect(): Promise<void> {
    if (this.isConnecting || this.isConnected) {
      return;
    }

    this.isConnecting = true;
    this.intentionalDisconnect = false;
    this.reconnectAttempts = 0;

    try {
      // Get token from Zustand persisted auth store
      const authStorage = localStorage.getItem('auth-storage');
      let token: string | null = null;
      if (authStorage) {
        try {
          const parsed = JSON.parse(authStorage);
          token = parsed?.state?.token ?? null;
        } catch {
          console.error('[VoiceWebSocket] Failed to parse auth storage');
        }
      }

      if (!token) {
        console.error('[VoiceWebSocket] No token found in auth-storage');
        throw new Error('No authentication token available');
      }

      console.log('[VoiceWebSocket] Token found, length:', token.length);

      // Get the backend URL for WebSocket connection
      // In development, connect directly to the backend (port 5001)
      // In production, use the same host as the page
      let wsUrl: string;
      const isDev = import.meta.env.DEV;

      if (isDev) {
        // Development: connect directly to backend
        wsUrl = `ws://localhost:5001/api/voice/session?sessionId=${this.sessionId}&token=${token}`;
      } else {
        // Production: use same host with ws/wss based on protocol
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        wsUrl = `${protocol}//${host}/api/voice/session?sessionId=${this.sessionId}&token=${token}`;
      }

      console.log('[VoiceWebSocket] Connecting to:', wsUrl.replace(/token=[^&]+/, 'token=***'));
      console.log('[VoiceWebSocket] isDev:', isDev);

      this.ws = new WebSocket(wsUrl);

      await new Promise<void>((resolve, reject) => {
        if (!this.ws) {
          reject(new Error('WebSocket not initialized'));
          return;
        }

        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.reconnectAttempts = 0;
          this.startPingInterval();
          this.callbacks.onConnected?.();
          resolve();
        };

        this.ws.onerror = (event) => {
          clearTimeout(timeout);
          console.error('WebSocket error:', event);
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = (event) => {
          clearTimeout(timeout);
          this.handleClose(event);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };
      });
    } finally {
      this.isConnecting = false;
    }
  }

  disconnect(): void {
    this.intentionalDisconnect = true;
    this.stopPingInterval();

    // Clear any pending reconnection timeout to prevent memory leaks
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  /**
   * Send audio data chunk
   */
  sendAudio(audioData: ArrayBuffer, isFinal = false): void {
    if (!this.isConnected) {
      console.warn('Cannot send audio: WebSocket not connected');
      return;
    }

    const base64 = btoa(
      new Uint8Array(audioData).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const message: ClientVoiceMessage = {
      type: 'audio',
      payload: {
        data: base64,
        timestamp: Date.now(),
        isFinal,
      },
    };

    this.ws?.send(JSON.stringify(message));
  }

  /**
   * Send raw binary audio (more efficient for continuous streaming)
   */
  sendRawAudio(audioData: ArrayBuffer): void {
    if (!this.isConnected) {
      console.warn('Cannot send audio: WebSocket not connected');
      return;
    }

    this.ws?.send(audioData);
  }

  /**
   * Send control command
   */
  sendControl(action: 'start' | 'stop' | 'interrupt' | 'mute' | 'unmute'): void {
    if (!this.isConnected) {
      console.warn('Cannot send control: WebSocket not connected');
      return;
    }

    const message: ClientVoiceMessage = {
      type: 'control',
      payload: { action },
    };

    this.ws?.send(JSON.stringify(message));
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as ServerVoiceMessage;

      switch (message.type) {
        case 'state':
          this.callbacks.onStateChange?.(message.state, message.reason);
          break;

        case 'transcript':
          this.callbacks.onTranscript?.(message.text, message.isFinal, message.confidence);
          break;

        case 'audio': {
          const audioData = this.base64ToArrayBuffer(message.data);
          this.callbacks.onAudioChunk?.(audioData, message.sequence, message.isFinal, message.sampleRate);
          break;
        }

        case 'error':
          this.callbacks.onError?.(message.code, message.message, message.recoverable);
          break;

        case 'metadata':
          this.callbacks.onMetadata?.(message.event, message.data);
          break;

        case 'pong':
          // Pong received, connection is alive
          break;
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  private handleClose(event: CloseEvent): void {
    this.stopPingInterval();
    this.callbacks.onDisconnected?.(event.reason || 'Connection closed');

    // Attempt reconnection only if not an intentional disconnect and not a clean close
    if (!this.intentionalDisconnect && event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      // Store timeout ID so we can clear it on disconnect to prevent memory leaks
      this.reconnectTimeoutId = setTimeout(() => {
        this.reconnectTimeoutId = null;
        console.log(`Reconnecting... attempt ${this.reconnectAttempts}`);
        this.connect().catch(console.error);
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.isConnected) {
        const message: ClientVoiceMessage = {
          type: 'control',
          payload: { action: 'ping' },
        };
        this.ws?.send(JSON.stringify(message));
      }
    }, 25000); // Ping every 25 seconds
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
