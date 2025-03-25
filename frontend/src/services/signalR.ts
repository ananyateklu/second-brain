import * as signalR from '@microsoft/signalr';
import { ExecutionStep } from '../types/ai';

// Interface for token management
export interface ITokenManager {
  getAccessToken(): string | null;
}

// Default implementation using localStorage (will be replaced)
let tokenManager: ITokenManager = {
  getAccessToken: () => localStorage.getItem('access_token')
};

// Function to set the token manager implementation
export function setTokenManager(manager: ITokenManager) {
  tokenManager = manager;
}

// Custom error class for SignalR errors
export class SignalRError extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'SignalRError';
  }
}

// Connection state events for external listeners
export type ConnectionState = 'connected' | 'disconnected' | 'reconnecting' | 'error';
export type ConnectionStateHandler = (state: ConnectionState, error?: Error) => void;

interface EventCallback {
  eventName: string;
  callback: (...args: unknown[]) => void;
}

export class SignalRService {
  private connection: signalR.HubConnection;
  private executionStepCallbacks: ((step: ExecutionStep) => void)[] = [];
  private isStarting: boolean = false;
  private autoReconnect: boolean = true;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 5;
  private pendingEvents: EventCallback[] = [];
  private connectionStateHandlers: ConnectionStateHandler[] = [];

  constructor() {
    this.connection = this.buildConnection();
    this.setupConnectionHandlers();
  }

  private buildConnection(token?: string): signalR.HubConnection {
    // Use provided token or get from TokenManager
    const accessToken = token ?? tokenManager.getAccessToken() ?? '';

    if (!accessToken) {
      this.notifyStateChange('error', new SignalRError('No access token available'));
    }

    return new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5127/toolHub', {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
        logger: signalR.LogLevel.Information,
        withCredentials: false,
        accessTokenFactory: () => accessToken
      })
      .withHubProtocol(new signalR.JsonHubProtocol())
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.notifyStateChange('error', new SignalRError('Max reconnection attempts reached'));
            return null;
          }

          // Start with a small delay and increase exponentially
          const baseDelay = 1000; // 1 second
          const delay = Math.min(
            baseDelay * Math.pow(2, retryContext.previousRetryCount),
            30000 // Max 30 seconds
          );

          this.reconnectAttempts++;
          return delay;
        }
      })
      .configureLogging(signalR.LogLevel.Warning) // Reduce logging noise
      .build();
  }

  private setupConnectionHandlers() {
    this.connection.on('ReceiveExecutionStep', (step: ExecutionStep) => {
      this.executionStepCallbacks.forEach(callback => callback(step));
    });

    this.connection.onreconnecting((error) => {
      this.notifyStateChange('reconnecting', error ? new SignalRError('Reconnecting', error) : undefined);
    });

    this.connection.onreconnected(() => {
      this.reconnectAttempts = 0;
      this.reregisterEvents();
      this.notifyStateChange('connected');
    });

    this.connection.onclose((error) => {
      this.notifyStateChange('disconnected', error ? new SignalRError('Connection closed', error) : undefined);

      if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => this.start(), 2000);
      } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.notifyStateChange('error', new SignalRError('Max reconnection attempts reached'));
      }
    });
  }

  private notifyStateChange(state: ConnectionState, error?: Error) {
    this.connectionStateHandlers.forEach(handler => handler(state, error));
  }

  private async reregisterEvents() {

    try {
      // Re-register all pending events after reconnection
      for (const event of this.pendingEvents) {
        this.connection.on(event.eventName, event.callback);
      }
    } catch (error) {
      console.error('[SignalR] Error reregistering events:', error);
      this.notifyStateChange('error', new SignalRError('Failed to reregister events', error instanceof Error ? error : undefined));
    }
  }

  // Subscribe to connection state changes
  onConnectionStateChange(handler: ConnectionStateHandler) {
    this.connectionStateHandlers.push(handler);
    return () => {
      this.connectionStateHandlers = this.connectionStateHandlers.filter(h => h !== handler);
    };
  }

  async updateToken(newToken: string) {
    try {
      if (!newToken) {
        throw new SignalRError('Cannot update connection with empty token');
      }

      await this.stop();
      await new Promise(resolve => setTimeout(resolve, 500)); // Reduced delay

      this.connection = this.buildConnection(newToken);
      this.setupConnectionHandlers();
      await this.start();
      return true;
    } catch (error) {
      console.error('[SignalR] Error updating token:', error);
      this.notifyStateChange('error', new SignalRError('Failed to update token', error instanceof Error ? error : undefined));
      throw error;
    }
  }

  async start() {
    const accessToken = tokenManager.getAccessToken();
    if (!accessToken) {
      const error = new SignalRError('Cannot start connection without access token');
      this.notifyStateChange('error', error);
      return Promise.reject(error);
    }

    if (this.isStarting) {
      return;
    }

    if (this.connection.state === signalR.HubConnectionState.Connected) {
      await this.reregisterEvents();
      this.notifyStateChange('connected');
      return;
    }

    try {
      this.isStarting = true;

      if (this.connection.state !== signalR.HubConnectionState.Disconnected) {
        await this.connection.stop();
        await new Promise(resolve => setTimeout(resolve, 500)); // Reduced delay
      }

      // Always create a fresh connection
      this.connection = this.buildConnection();
      this.setupConnectionHandlers();

      let retryCount = 0;
      const maxRetries = 3;
      let lastError = null;

      while (retryCount < maxRetries) {
        try {
          await this.connection.start();
          this.reconnectAttempts = 0;
          await this.reregisterEvents();
          this.notifyStateChange('connected');
          return; // Success, exit the function
        } catch (err) {
          lastError = err;
          retryCount++;
          if (retryCount === maxRetries) {
            console.error('[SignalR] Max retries reached:', lastError);
            break;
          }
          const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      // If we get here, all retries failed
      const error = new SignalRError('Failed to connect after multiple attempts', lastError instanceof Error ? lastError : undefined);
      this.notifyStateChange('error', error);
      throw error;
    } catch (err) {
      console.error('[SignalR] Connection Error:', err);
      const error = new SignalRError('Connection error', err instanceof Error ? err : undefined);
      this.notifyStateChange('error', error);

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        setTimeout(() => this.start(), delay);
      } else {
        this.notifyStateChange('error', new SignalRError('Max reconnection attempts reached'));
      }
      throw error;
    } finally {
      this.isStarting = false;
    }
  }

  async stop() {
    try {
      this.autoReconnect = false;
      if (this.connection.state !== signalR.HubConnectionState.Disconnected) {
        await this.connection.stop();
        await new Promise(resolve => setTimeout(resolve, 500)); // Reduced delay
        this.notifyStateChange('disconnected');
      }
    } catch (err) {
      console.error('[SignalR] Error stopping connection:', err);
      this.notifyStateChange('error', new SignalRError('Error stopping connection', err instanceof Error ? err : undefined));
    } finally {
      this.autoReconnect = true;
    }
  }

  onExecutionStep(callback: (step: ExecutionStep) => void) {
    this.executionStepCallbacks.push(callback);
    return () => {
      this.executionStepCallbacks = this.executionStepCallbacks.filter(cb => cb !== callback);
    };
  }

  getConnectionState() {
    return this.connection.state;
  }

  isConnected() {
    return this.connection.state === signalR.HubConnectionState.Connected;
  }

  on<T extends unknown[]>(eventName: string, callback: (...args: T) => void) {
    // Store the event for reconnection
    this.pendingEvents.push({
      eventName,
      callback: callback as (...args: unknown[]) => void
    });

    // Register the event immediately if connected
    if (this.isConnected()) {
      this.connection.on(eventName, callback);
    }
  }

  off<T extends unknown[]>(eventName: string, callback: (...args: T) => void) {
    // Remove from pending events
    this.pendingEvents = this.pendingEvents.filter(
      event => event.eventName !== eventName || event.callback !== callback
    );

    // Remove from connection if connected
    if (this.isConnected()) {
      this.connection.off(eventName, callback);
    }
  }
}

export const signalRService = new SignalRService();