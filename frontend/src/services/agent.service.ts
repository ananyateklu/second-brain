/**
 * Agent Service
 * Handles AI agent operations and streaming
 */

import { API_ENDPOINTS, getApiBaseUrl } from '../lib/constants';
import { useAuthStore } from '../store/auth-store';
import type {
  AgentMessageRequest,
  AgentStreamingCallbacks,
  ToolExecution,
  ThinkingStep,
} from '../types/agent';

/**
 * Agent service for AI agent operations
 */
export const agentService = {
  /**
   * Send a message to the agent with streaming response
   */
  async streamAgentMessage(
    conversationId: string,
    request: AgentMessageRequest,
    callbacks: AgentStreamingCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    const apiUrl = getApiBaseUrl();
    const url = `${apiUrl}${API_ENDPOINTS.AGENT.STREAM(conversationId)}`;

    const authStore = useAuthStore.getState();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    };
    
    if (authStore.token) {
      headers['Authorization'] = `Bearer ${authStore.token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      await this.processAgentStream(reader, callbacks);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return;
        }
        callbacks.onError?.(error);
      } else {
        callbacks.onError?.(new Error('Unknown error occurred during streaming'));
      }
      throw error;
    }
  },

  /**
   * Process agent SSE stream
   */
  async processAgentStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    callbacks: AgentStreamingCallbacks
  ): Promise<void> {
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      const messages = buffer.split('\n\n');
      buffer = messages.pop() || '';

      for (const message of messages) {
        if (!message.trim()) continue;

        const lines = message.split('\n');
        let eventType = 'message';
        let data = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.substring(7).trim();
          } else if (line.startsWith('data: ')) {
            data = line.substring(6);
          }
        }

        this.handleAgentEvent(eventType, data, callbacks);
      }
    }
  },

  /**
   * Handle individual agent SSE event
   */
  handleAgentEvent(
    eventType: string,
    data: string,
    callbacks: AgentStreamingCallbacks
  ): void {
    switch (eventType) {
      case 'start':
        callbacks.onStart?.();
        break;

      case 'thinking':
        if (data) {
          try {
            const thinkingData = JSON.parse(data);
            const step: ThinkingStep = {
              content: thinkingData.content || thinkingData,
              timestamp: new Date(),
            };
            callbacks.onThinking?.(step);
          } catch {
            const step: ThinkingStep = {
              content: data.replace(/\\n/g, '\n'),
              timestamp: new Date(),
            };
            callbacks.onThinking?.(step);
          }
        }
        break;

      case 'tool_start':
      case 'tool_executing':
        if (data) {
          try {
            const toolData = JSON.parse(data);
            const execution: ToolExecution = {
              tool: toolData.tool || toolData.toolName,
              arguments: toolData.arguments,
              result: '',
              status: 'executing',
              timestamp: new Date(),
            };
            callbacks.onToolExecution?.(execution);
          } catch (e) {
            console.error('Failed to parse tool start data:', { data, error: e });
          }
        }
        break;

      case 'tool_result':
      case 'tool_completed':
        if (data) {
          try {
            const toolData = JSON.parse(data);
            const execution: ToolExecution = {
              tool: toolData.tool || toolData.toolName,
              arguments: toolData.arguments,
              result: toolData.result,
              status: 'completed',
              timestamp: new Date(),
            };
            callbacks.onToolExecution?.(execution);
          } catch (e) {
            console.error('Failed to parse tool result data:', { data, error: e });
          }
        }
        break;

      case 'message':
      case 'token':
      case 'data':
        if (data) {
          const unescapedData = data.replace(/\\n/g, '\n');
          callbacks.onToken(unescapedData);
        }
        break;

      case 'end':
        if (data) {
          try {
            const endData = JSON.parse(data);
            callbacks.onEnd?.({
              inputTokens: endData.inputTokens,
              outputTokens: endData.outputTokens,
              durationMs: endData.durationMs,
              toolExecutions: endData.toolExecutions,
            });
          } catch {
            callbacks.onEnd?.({});
          }
        } else {
          callbacks.onEnd?.({});
        }
        break;

      case 'error':
        if (data) {
          try {
            const errorData = JSON.parse(data);
            callbacks.onError?.(new Error(errorData.error || errorData.message || 'Agent error'));
          } catch {
            callbacks.onError?.(new Error(data));
          }
        }
        break;

      default:
        // Handle unrecognized events as potential tokens
        if (data) {
          const unescapedData = data.replace(/\\n/g, '\n');
          callbacks.onToken(unescapedData);
        }
        break;
    }
  },

  // ============================================
  // Utility Functions
  // ============================================

  /**
   * Build agent capabilities array
   */
  buildCapabilities(options: {
    notes?: boolean;
    web?: boolean;
    code?: boolean;
  }): string[] {
    const capabilities: string[] = [];
    if (options.notes) capabilities.push('notes');
    if (options.web) capabilities.push('web');
    if (options.code) capabilities.push('code');
    return capabilities;
  },

  /**
   * Parse capabilities string to array
   */
  parseCapabilities(capabilitiesStr: string | undefined): string[] {
    if (!capabilitiesStr) return [];
    try {
      return JSON.parse(capabilitiesStr);
    } catch {
      return [];
    }
  },

  /**
   * Stringify capabilities array
   */
  stringifyCapabilities(capabilities: string[]): string {
    return JSON.stringify(capabilities);
  },

  /**
   * Format tool execution for display
   */
  formatToolExecution(execution: ToolExecution): string {
    const argsStr = execution.arguments
      ? ` with ${this.truncateString(execution.arguments, 50)}`
      : '';
    return `${execution.tool}${argsStr}`;
  },

  /**
   * Truncate string with ellipsis
   */
  truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
  },

  /**
   * Calculate total tool execution time
   */
  calculateToolExecutionTime(executions: ToolExecution[]): number {
    if (executions.length < 2) return 0;
    const start = executions[0].timestamp;
    const end = executions[executions.length - 1].timestamp;
    return end.getTime() - start.getTime();
  },

  /**
   * Get tool execution summary
   */
  getToolExecutionSummary(executions: ToolExecution[]): {
    total: number;
    completed: number;
    failed: number;
  } {
    const total = executions.length;
    const completed = executions.filter((e) => e.status === 'completed').length;
    const failed = executions.filter((e) => e.status === 'failed').length;
    return { total, completed, failed };
  },
};

