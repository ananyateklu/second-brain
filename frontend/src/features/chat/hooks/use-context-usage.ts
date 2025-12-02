import { useMemo } from 'react';
import { ChatConversation } from '../../../types/chat';
import { ToolExecution } from '../../agents/types/agent-types';
import { RagContextNote } from '../../../types/rag';
import {
  ContextUsageBreakdown,
  ContextUsageState,
  EMPTY_CONTEXT_BREAKDOWN,
  CONTEXT_ESTIMATION_CONSTANTS,
} from '../../../types/context-usage';
import {
  getModelContextLimit,
  getContextWarningLevel,
} from '../../../utils/model-context-limits';
import { estimateTokenCount } from '../../../utils/token-utils';

export interface UseContextUsageOptions {
  /** Current conversation */
  conversation: ChatConversation | undefined;
  /** Current model name */
  model: string;
  /** Whether agent mode is enabled */
  agentModeEnabled: boolean;
  /** Enabled agent capabilities */
  agentCapabilities: string[];
  /** Whether RAG is enabled */
  ragEnabled: boolean;
  /** Current user input (being typed) */
  currentInput: string;
  /** Streaming tool executions (during agent mode) */
  streamingToolExecutions?: ToolExecution[];
  /** Streaming retrieved notes (during RAG) */
  streamingRetrievedNotes?: RagContextNote[];
  /** Whether currently streaming */
  isStreaming?: boolean;
  /** Current streaming message */
  streamingMessage?: string;
}

/**
 * Helper to parse agent capabilities from JSON string stored per conversation.
 */
function parseConversationCapabilities(capabilitiesJson: string | null | undefined): string[] {
  if (!capabilitiesJson) return [];
  try {
    const parsed = JSON.parse(capabilitiesJson);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
      return parsed;
    }
  } catch {
    // Invalid JSON, return empty array
  }
  return [];
}

/**
 * Calculate context usage breakdown from conversation state.
 * This hook provides real-time context usage tracking for AI model interactions.
 */
export function useContextUsage(options: UseContextUsageOptions): ContextUsageState {
  const {
    conversation,
    model,
    agentModeEnabled,
    agentCapabilities,
    ragEnabled,
    currentInput,
    streamingToolExecutions = [],
    streamingRetrievedNotes = [],
    isStreaming = false,
    streamingMessage = '',
  } = options;

  // Derive agent settings from conversation as fallback for when UI state hasn't synced yet
  // This ensures context is correctly calculated immediately on page load
  const conversationAgentEnabled = conversation?.agentEnabled ?? false;
  const conversationCapabilities = useMemo(
    () => parseConversationCapabilities(conversation?.agentCapabilities),
    [conversation?.agentCapabilities]
  );
  const conversationRagEnabled = conversation?.ragEnabled ?? false;

  // Use effective settings: count if EITHER UI state OR conversation says enabled
  // This prevents context from appearing smaller during the brief window when
  // the page has loaded but UI state hasn't synced from the conversation yet
  const effectiveAgentEnabled = agentModeEnabled || conversationAgentEnabled;
  const effectiveCapabilities = agentCapabilities.length > 0
    ? agentCapabilities
    : conversationCapabilities;
  const effectiveRagEnabled = ragEnabled || conversationRagEnabled;

  const breakdown = useMemo((): ContextUsageBreakdown => {
    // Calculate system prompt tokens
    let systemPromptTokens = CONTEXT_ESTIMATION_CONSTANTS.BASE_SYSTEM_PROMPT;

    if (effectiveAgentEnabled) {
      systemPromptTokens += CONTEXT_ESTIMATION_CONSTANTS.AGENT_SYSTEM_PROMPT_ADDITION;
      systemPromptTokens += effectiveCapabilities.length * CONTEXT_ESTIMATION_CONSTANTS.TOKENS_PER_CAPABILITY;
    }

    // Calculate message history tokens
    let messageHistoryTokens = 0;
    const messages = conversation?.messages || [];

    for (const message of messages) {
      // Base content tokens
      messageHistoryTokens += estimateTokenCount(message.content);
      // Message overhead (role, formatting)
      messageHistoryTokens += CONTEXT_ESTIMATION_CONSTANTS.MESSAGE_OVERHEAD;
    }

    // Calculate tool definitions tokens (when agent mode is enabled)
    let toolDefinitionTokens = 0;
    if (effectiveAgentEnabled && effectiveCapabilities.length > 0) {
      // Each capability defines multiple tools with their schemas
      // Actual tool counts based on backend plugin implementations:
      // - Notes: 20 tools (CreateNote, GetNote, UpdateNote, DeleteNote, SearchNotes,
      //   SemanticSearch, ListAllNotes, ListRecentNotes, ArchiveNote, UnarchiveNote,
      //   DuplicateNote, AppendToNote, SearchByTags, GetNotesByDateRange, FindRelatedNotes,
      //   ListArchivedNotes, MoveToFolder, ListFolders, ListAllTags, GetNoteStats)
      const toolsPerCapability: Record<string, number> = {
        'notes': 20,
        'web': 2,
        'code': 3,
      };

      for (const capability of effectiveCapabilities) {
        const toolCount = toolsPerCapability[capability] || 2;
        toolDefinitionTokens += toolCount * CONTEXT_ESTIMATION_CONSTANTS.TOKENS_PER_TOOL_DEFINITION;
      }
    }

    // Calculate tool results tokens (from conversation history + streaming)
    let toolResultTokens = 0;

    // Build a set of persisted tool call signatures to detect duplicates
    // We use tool name + result length as a simple signature to detect same tool call
    const persistedToolSignatures = new Set<string>();

    // Count persisted tool calls from messages
    for (const message of messages) {
      if (message.toolCalls && message.toolCalls.length > 0) {
        for (const toolCall of message.toolCalls) {
          // Create a signature for this tool call to detect duplicates with streaming
          const signature = `${toolCall.toolName}_${toolCall.result?.length ?? 0}`;
          persistedToolSignatures.add(signature);

          toolResultTokens += estimateTokenCount(toolCall.result);
          toolResultTokens += estimateTokenCount(toolCall.arguments);
          // Overhead for tool call formatting
          toolResultTokens += 20;
        }
      }
    }

    // From streaming tool executions - ONLY count if not already in persisted messages
    // This prevents double-counting when the message is persisted but streaming state hasn't cleared
    for (const execution of streamingToolExecutions) {
      if (execution.status === 'completed' && execution.result) {
        // Check if this streaming execution is already in persisted data
        const signature = `${execution.tool}_${execution.result?.length ?? 0}`;
        if (!persistedToolSignatures.has(signature)) {
          // Not yet persisted, count it
          toolResultTokens += estimateTokenCount(execution.result);
          toolResultTokens += estimateTokenCount(execution.arguments || '');
          toolResultTokens += 20;
        }
        // If already persisted, skip to avoid double counting
      }
    }

    // Calculate RAG context tokens
    // Use effectiveRagEnabled to count historical RAG context even before UI state syncs
    let ragContextTokens = 0;

    if (effectiveRagEnabled) {
      // From persisted messages
      for (const message of messages) {
        if (message.retrievedNotes && message.retrievedNotes.length > 0) {
          ragContextTokens += CONTEXT_ESTIMATION_CONSTANTS.RAG_CONTEXT_OVERHEAD;
          for (const note of message.retrievedNotes) {
            ragContextTokens += estimateTokenCount(note.chunkContent);
            ragContextTokens += estimateTokenCount(note.title);
            // Metadata overhead
            ragContextTokens += 15;
          }
        }
      }

      // From streaming retrieved notes
      if (streamingRetrievedNotes.length > 0) {
        ragContextTokens += CONTEXT_ESTIMATION_CONSTANTS.RAG_CONTEXT_OVERHEAD;
        for (const note of streamingRetrievedNotes) {
          ragContextTokens += estimateTokenCount(note.chunkContent);
          ragContextTokens += estimateTokenCount(note.title);
          ragContextTokens += 15;
        }
      }
    }

    // Calculate current input tokens
    let currentInputTokens = estimateTokenCount(currentInput);

    // Add streaming message tokens if streaming
    if (isStreaming && streamingMessage) {
      currentInputTokens += estimateTokenCount(streamingMessage);
    }

    // Calculate total
    const total =
      systemPromptTokens +
      messageHistoryTokens +
      toolDefinitionTokens +
      toolResultTokens +
      ragContextTokens +
      currentInputTokens;

    return {
      systemPrompt: systemPromptTokens,
      messageHistory: messageHistoryTokens,
      toolDefinitions: toolDefinitionTokens,
      toolResults: toolResultTokens,
      ragContext: ragContextTokens,
      currentInput: currentInputTokens,
      total,
    };
  }, [
    conversation?.messages,
    effectiveAgentEnabled,
    effectiveCapabilities,
    effectiveRagEnabled,
    currentInput,
    streamingToolExecutions,
    streamingRetrievedNotes,
    isStreaming,
    streamingMessage,
  ]);

  // Get model context limit
  const maxTokens = useMemo(() => getModelContextLimit(model), [model]);

  // Calculate percentage and warning level
  const percentUsed = useMemo(() => {
    if (maxTokens === 0) return 0;
    return Math.min(100, (breakdown.total / maxTokens) * 100);
  }, [breakdown.total, maxTokens]);

  const warningLevel = useMemo(
    () => getContextWarningLevel(breakdown.total, maxTokens),
    [breakdown.total, maxTokens]
  );

  return {
    breakdown,
    maxTokens,
    percentUsed,
    warningLevel,
  };
}

/**
 * Create an empty context usage state (for loading/error states)
 */
export function createEmptyContextUsage(model: string): ContextUsageState {
  const maxTokens = getModelContextLimit(model);
  return {
    breakdown: EMPTY_CONTEXT_BREAKDOWN,
    maxTokens,
    percentUsed: 0,
    warningLevel: 'normal',
  };
}

