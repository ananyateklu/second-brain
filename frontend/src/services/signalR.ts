import * as signalR from '@microsoft/signalr';
import { ExecutionStep } from '../types/ai';

export class SignalRService {
  private connection: signalR.HubConnection;
  private executionStepCallbacks: ((step: ExecutionStep) => void)[] = [];
  private isStarting: boolean = false;
  private readonly autoReconnect: boolean = true;

  constructor() {
    this.connection = this.buildConnection();
    this.setupConnectionHandlers();
  }

  private buildConnection(token?: string): signalR.HubConnection {
    const accessToken = token ?? localStorage.getItem('token') ?? '';
    
    return new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5127/toolHub', {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
        logger: signalR.LogLevel.Debug,
        withCredentials: true,
        accessTokenFactory: () => accessToken
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: retryContext => {
          if (retryContext.previousRetryCount === 0) {
            return 0;
          }
          return 1000;
        }
      })
      .build();
  }

  private setupConnectionHandlers() {
    this.connection.on('ReceiveExecutionStep', (step: ExecutionStep) => {
      console.log('[SignalR] Received step:', step);
      this.executionStepCallbacks.forEach(callback => callback(step));
    });

    this.connection.onreconnecting(() => {
      console.log('[SignalR] Reconnecting...');
    });

    this.connection.onreconnected(() => {
      console.log('[SignalR] Reconnected');
    });

    this.connection.onclose((error) => {
      console.log('[SignalR] Connection Closed', error);
      if (this.autoReconnect) {
        this.start();
      }
    });
  }

  async updateToken(newToken: string) {
    await this.stop();
    this.connection = this.buildConnection(newToken);
    this.setupConnectionHandlers();
    await this.start();
  }

  async start() {
    if (this.isStarting) {
      return;
    }

    if (this.connection.state === signalR.HubConnectionState.Connected) {
      console.log('[SignalR] Already connected');
      return;
    }

    try {
      this.isStarting = true;
      if (this.connection.state === signalR.HubConnectionState.Disconnected) {
        await this.connection.start();
        console.log('[SignalR] Connected successfully');
      } else {
        console.log(`[SignalR] Connection in ${this.connection.state} state, cannot start`);
      }
    } catch (err) {
      console.error('[SignalR] Connection Error:', err);
      // Reset connection state before retrying
      await this.connection.stop();
      setTimeout(() => this.start(), 1000);
    } finally {
      this.isStarting = false;
    }
  }

  onExecutionStep(callback: (step: ExecutionStep) => void) {
    this.executionStepCallbacks.push(callback);
    return () => {
      this.executionStepCallbacks = this.executionStepCallbacks.filter(cb => cb !== callback);
    };
  }

  async stop() {
    try {
      if (this.connection.state === signalR.HubConnectionState.Connected) {
        await this.connection.stop();
        console.log('SignalR Disconnected');
      }
    } catch (err) {
      console.error('Error stopping SignalR:', err);
    }
  }

  getConnectionState() {
    return this.connection.state;
  }
}

export const signalRService = new SignalRService();