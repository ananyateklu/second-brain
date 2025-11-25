import { ToolCall } from '../types/chat';
import { ToolExecution } from '../../agents/types/agent-types';

/**
 * Convert a ToolCall (from persisted message) to ToolExecution format (for display).
 */
export function convertToolCallToExecution(toolCall: ToolCall): ToolExecution {
  return {
    tool: toolCall.toolName,
    arguments: toolCall.arguments,
    result: toolCall.result,
    status: 'completed',
    timestamp: new Date(toolCall.executedAt),
  };
}

