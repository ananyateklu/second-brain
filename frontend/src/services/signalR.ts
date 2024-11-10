import * as signalR from '@microsoft/signalr';
import { ExecutionStep } from '../types/ai';

class SignalRService {
  private connection: signalR.HubConnection;
  private executionStepCallbacks: ((step: ExecutionStep) => void)[] = [];
  private isStarting: boolean = false;

  constructor() {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5127/toolHub')
      .withAutomaticReconnect()
      .build();

    this.connection.on('ReceiveExecutionStep', (step: ExecutionStep) => {
      console.log('[SignalR] Received step:', step);
      this.executionStepCallbacks.forEach(callback => callback(step));
    });

    // Handle reconnection
    this.connection.onreconnecting(() => {
      console.log('SignalR Reconnecting...');
    });

    this.connection.onreconnected(() => {
      console.log('SignalR Reconnected');
    });

    this.connection.onclose(() => {
      console.log('SignalR Connection Closed');
    });
  }

  async start() {
    try {
      // Check if already starting
      if (this.isStarting) {
        console.log('SignalR connection start already in progress');
        return;
      }

      // Check current state
      if (this.connection.state === signalR.HubConnectionState.Connected) {
        console.log('SignalR already connected');
        return;
      }

      if (this.connection.state !== signalR.HubConnectionState.Disconnected) {
        console.log('SignalR connection is not in Disconnected state');
        return;
      }

      this.isStarting = true;

      await this.connection.start();
      console.log('SignalR Connected');
    } catch (err) {
      console.error('SignalR Connection Error:', err);
      // Wait before trying to reconnect
      setTimeout(() => {
        this.isStarting = false;
        this.start();
      }, 5000);
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