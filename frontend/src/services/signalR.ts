import * as signalR from '@microsoft/signalr';
import { ExecutionStep } from '../types/ai';

export class SignalRService {
  private connection: signalR.HubConnection;
  private executionStepCallbacks: ((step: ExecutionStep) => void)[] = [];
  private isStarting: boolean = false;
  private autoReconnect: boolean = true;

  constructor() {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5127/toolHub')
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: retryContext => {
          return 1000; // Retry every second
        }
      })
      .build();

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

  async start() {
    if (this.isStarting || this.connection.state === signalR.HubConnectionState.Connected) {
      return;
    }

    try {
      this.isStarting = true;
      await this.connection.start();
      console.log('[SignalR] Connected successfully');
    } catch (err) {
      console.error('[SignalR] Connection Error:', err);
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