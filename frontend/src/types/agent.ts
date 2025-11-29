/**
 * Agent Types
 * Types for AI agent operations, tool executions, and capabilities
 */

/**
 * Tool execution status
 */
export type ToolExecutionStatus = 'executing' | 'completed' | 'failed';

/**
 * Tool execution record
 */
export interface ToolExecution {
  tool: string;
  arguments?: string;
  result: string;
  status: ToolExecutionStatus;
  timestamp: Date;
  error?: string;
}

/**
 * Thinking step during agent reasoning
 */
export interface ThinkingStep {
  content: string;
  timestamp: Date;
}

/**
 * Agent stream state
 */
export interface AgentStreamState {
  isStreaming: boolean;
  streamingMessage: string;
  toolExecutions: ToolExecution[];
  thinkingSteps: ThinkingStep[];
  error: Error | null;
  inputTokens?: number;
  outputTokens?: number;
  streamDuration?: number;
}

/**
 * Agent message request
 */
export interface AgentMessageRequest {
  content: string;
  temperature?: number;
  maxTokens?: number;
  capabilities?: string[];
}

/**
 * Agent capability definition
 */
export interface AgentCapability {
  id: string;
  displayName: string;
  description?: string;
  enabled?: boolean;
  icon?: React.ReactNode;
  color?: {
    enabledBg: string;
    enabledText: string;
    enabledBorder: string;
    enabledDot: string;
  };
  onChange?: (enabled: boolean) => void;
}

/**
 * Tool call record (from chat messages)
 */
export interface AgentToolCall {
  toolName: string;
  arguments: string;
  result: string;
  executedAt: string;
  success: boolean;
}

/**
 * Agent supported provider info
 */
export interface AgentSupportedProvider {
  name: string;
  supported: boolean;
  reason: string;
}

/**
 * Agent note result (from note operations)
 */
export interface AgentNoteResult {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Agent notes response
 */
export interface AgentNotesResponse {
  type: 'notes';
  message: string;
  notes: AgentNoteResult[];
}

/**
 * Agent streaming callbacks
 */
export interface AgentStreamingCallbacks {
  onToken: (token: string) => void;
  onThinking?: (step: ThinkingStep) => void;
  onToolExecution?: (execution: ToolExecution) => void;
  onStart?: () => void;
  onEnd?: (data: AgentEndData) => void;
  onError?: (error: Error) => void;
}

/**
 * Data received at end of agent streaming
 */
export interface AgentEndData {
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  toolExecutions?: ToolExecution[];
}

