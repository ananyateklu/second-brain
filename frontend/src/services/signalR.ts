import * as signalR from '@microsoft/signalr';
import { ExecutionStep } from '../types/ai';

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

  constructor() {
    this.connection = this.buildConnection();
    this.setupConnectionHandlers();
  }

  private buildConnection(token?: string): signalR.HubConnection {
    const accessToken = token ?? localStorage.getItem('access_token') ?? '';

    if (!accessToken) {
      console.warn('[SignalR] No access token available');
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
            return null;
          }

          // Start with a small delay and increase exponentially
          const baseDelay = 1000; // 1 second
          const delay = Math.min(
            baseDelay * Math.pow(2, retryContext.previousRetryCount),
            30000 // Max 30 seconds
          );

          this.reconnectAttempts++;
          console.log(`[SignalR] Next retry in ${delay}ms (attempt ${this.reconnectAttempts})`);
          return delay;
        }
      })
      .configureLogging(signalR.LogLevel.Warning) // Reduce logging noise
      .build();
  }

  private setupConnectionHandlers() {
    this.connection.on('ReceiveExecutionStep', (step: ExecutionStep) => {
      console.log('[SignalR] Received step:', step);
      this.executionStepCallbacks.forEach(callback => callback(step));
    });

    this.connection.onreconnecting((error) => {
      console.log('[SignalR] Reconnecting...', error);
    });

    this.connection.onreconnected((connectionId) => {
      console.log('[SignalR] Reconnected with connectionId:', connectionId);
      this.reconnectAttempts = 0;
      this.reregisterEvents();
    });

    this.connection.onclose((error) => {
      console.log('[SignalR] Connection Closed', error);
      if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => this.start(), 2000);
      } else {
        console.log('[SignalR] Max reconnection attempts reached or auto-reconnect disabled');
      }
    });
  }

  private async reregisterEvents() {
    console.log('[SignalR] Reregistering events:', this.pendingEvents);
    // Re-register all pending events after reconnection
    for (const event of this.pendingEvents) {
      console.log('[SignalR] Reregistering event:', event.eventName);
      this.connection.on(event.eventName, event.callback);
    }
  }

  async updateToken(newToken: string) {
    try {
      await this.stop();
      await new Promise(resolve => setTimeout(resolve, 1000));

      this.connection = this.buildConnection(newToken);
      this.setupConnectionHandlers();
      if (newToken) {
        await this.start();
      }
    } catch (error) {
      console.error('[SignalR] Error updating token:', error);
      throw error;
    }
  }

  async start() {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      console.warn('[SignalR] Cannot start connection without access token');
      return;
    }

    if (this.isStarting) {
      console.log('[SignalR] Connection start already in progress');
      return;
    }

    if (this.connection.state === signalR.HubConnectionState.Connected) {
      console.log('[SignalR] Already connected');
      await this.reregisterEvents();
      return;
    }

    try {
      this.isStarting = true;

      if (this.connection.state !== signalR.HubConnectionState.Disconnected) {
        await this.connection.stop();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Always create a fresh connection
      this.connection = this.buildConnection();
      this.setupConnectionHandlers();

      let retryCount = 0;
      const maxRetries = 3;
      let lastError = null;

      while (retryCount < maxRetries) {
        try {
          console.log(`[SignalR] Attempting connection (attempt ${retryCount + 1}/${maxRetries})`);
          await this.connection.start();
          console.log('[SignalR] Connected successfully');
          this.reconnectAttempts = 0;
          await this.reregisterEvents();
          return; // Success, exit the function
        } catch (err) {
          lastError = err;
          retryCount++;
          if (retryCount === maxRetries) {
            console.error('[SignalR] Max retries reached:', lastError);
            break;
          }
          const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
          console.log(`[SignalR] Connection attempt ${retryCount} failed, retrying in ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      // If we get here, all retries failed
      throw lastError;
    } catch (err) {
      console.error('[SignalR] Connection Error:', err);
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        console.log(`[SignalR] Scheduling retry in ${delay}ms`);
        setTimeout(() => this.start(), delay);
      } else {
        console.error('[SignalR] Max reconnection attempts reached');
      }
    } finally {
      this.isStarting = false;
    }
  }

  async stop() {
    try {
      this.autoReconnect = false;
      if (this.connection.state !== signalR.HubConnectionState.Disconnected) {
        await this.connection.stop();
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('[SignalR] Disconnected');
      }
    } catch (err) {
      console.error('[SignalR] Error stopping connection:', err);
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
    console.log('[SignalR] Registering event:', eventName);
    // Store the event for reconnection
    this.pendingEvents.push({
      eventName,
      callback: callback as (...args: unknown[]) => void
    });

    // Register the event immediately if connected
    if (this.isConnected()) {
      console.log('[SignalR] Connection is active, registering immediately:', eventName);
      this.connection.on(eventName, callback);
    } else {
      console.log('[SignalR] Connection not active, event will be registered when connected:', eventName);
    }
  }

  off<T extends unknown[]>(eventName: string, callback: (...args: T) => void) {
    console.log('[SignalR] Removing event:', eventName);
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