export interface ToolExecution {
  tool: string;
  arguments?: string;
  result: string;
  status: 'executing' | 'completed';
  timestamp: Date;
}

export interface ThinkingStep {
  content: string;
  timestamp: Date;
}

export interface AgentStreamState {
  isStreaming: boolean;
  streamingMessage: string;
  toolExecutions: ToolExecution[];
  error: Error | null;
}

export interface AgentMessageRequest {
  content: string;
  temperature?: number;
  maxTokens?: number;
  capabilities?: string[];
}

export interface AgentCapability {
  id: string;
  displayName: string;
  description: string;
}

export interface ToolCall {
  toolName: string;
  arguments: string;
  result: string;
  executedAt: string;
  success: boolean;
}

export interface AgentSupportedProvider {
  name: string;
  supported: boolean;
  reason: string;
}

export interface AgentNoteResult {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentNotesResponse {
  type: 'notes';
  message: string;
  notes: AgentNoteResult[];
}
