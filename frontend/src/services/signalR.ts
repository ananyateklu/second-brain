import * as signalR from '@microsoft/signalr';
import { ExecutionStep } from '../types/ai';

export class SignalRService {
  private connection: signalR.HubConnection;
  private executionStepCallbacks: ((step: ExecutionStep) => void)[] = [];
  private isStarting: boolean = false;
  private autoReconnect: boolean = true;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 5;

  constructor() {
    this.connection = this.buildConnection();
    this.setupConnectionHandlers();
  }

  private buildConnection(token?: string): signalR.HubConnection {
    const accessToken = token ?? localStorage.getItem('token') ?? '';

    return new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5127/toolHub', {
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets,
        logger: signalR.LogLevel.Information,
        withCredentials: true,
        accessTokenFactory: () => accessToken
      })
      .withHubProtocol(new signalR.JsonHubProtocol())
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            return null;
          }

          const delayMap = [0, 2000, 10000, 30000];
          const delay = delayMap[retryContext.previousRetryCount] ?? 30000;

          this.reconnectAttempts++;
          return delay;
        }
      })
      .configureLogging(signalR.LogLevel.Information)
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

  async updateToken(newToken: string) {
    try {
      await this.stop();
      this.connection = this.buildConnection(newToken);
      this.setupConnectionHandlers();
      await this.start();
    } catch (error) {
      console.error('[SignalR] Error updating token:', error);
      throw error;
    }
  }

  async start() {
    if (this.isStarting) {
      console.log('[SignalR] Connection start already in progress');
      return;
    }

    if (this.connection.state === signalR.HubConnectionState.Connected) {
      console.log('[SignalR] Already connected');
      return;
    }

    try {
      this.isStarting = true;

      if (this.connection.state !== signalR.HubConnectionState.Disconnected) {
        await this.connection.stop();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await this.connection.start();
      console.log('[SignalR] Connected successfully');
      this.reconnectAttempts = 0;
    } catch (err) {
      console.error('[SignalR] Connection Error:', err);

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        setTimeout(() => this.start(), delay);
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
}

export const signalRService = new SignalRService();