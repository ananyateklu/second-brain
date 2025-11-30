import { useEffect } from 'react';
import { useChatStream } from './use-chat-stream';
import { useAgentStream } from '../../agents/hooks/use-agent-stream';
import { ToolExecution, ThinkingStep } from '../../agents/types/agent-types';
import { RagContextNote } from '../../rag/types';
import { MessageImage } from '../types/chat';

export interface CombinedStreamingState {
  isStreaming: boolean;
  streamingMessage: string;
  streamingError: Error | null;
  retrievedNotes: RagContextNote[];
  toolExecutions: ToolExecution[];
  thinkingSteps: ThinkingStep[];
  processingStatus: string | null;
  inputTokens?: number;
  outputTokens?: number;
  streamDuration?: number;
}

export interface CombinedStreamingActions {
  sendMessage: (conversationId: string, content: string, options: SendMessageOptions) => Promise<void>;
  cancelStream: () => void;
  resetStream: () => void;
}

export interface SendMessageOptions {
  agentMode: boolean;
  ragEnabled: boolean;
  userId: string;
  vectorStoreProvider?: string;
  capabilities?: string[];
  /** Attached images for multimodal messages */
  images?: MessageImage[];
}

/**
 * Combines regular chat streaming and agent streaming into a unified interface.
 * Automatically switches between the two based on agent mode.
 */
export function useCombinedStreaming(agentModeEnabled: boolean) {
  // Regular chat streaming
  const chatStream = useChatStream();

  // Agent streaming
  const agentStream = useAgentStream();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chatStream.isStreaming) {
        chatStream.cancelStream();
      }
      if (agentStream.isStreaming) {
        agentStream.cancelStream();
      }
    };
  }, []);

  // Combined state based on current mode
  const state: CombinedStreamingState = {
    isStreaming: agentModeEnabled ? agentStream.isStreaming : chatStream.isStreaming,
    streamingMessage: agentModeEnabled ? agentStream.streamingMessage : chatStream.streamingMessage,
    streamingError: agentModeEnabled ? agentStream.streamingError : chatStream.streamingError,
    retrievedNotes: agentModeEnabled ? [] : chatStream.retrievedNotes,
    toolExecutions: agentModeEnabled ? agentStream.toolExecutions : [],
    thinkingSteps: agentModeEnabled ? agentStream.thinkingSteps : [],
    processingStatus: agentModeEnabled ? agentStream.processingStatus : null,
    inputTokens: agentModeEnabled ? agentStream.inputTokens : chatStream.inputTokens,
    outputTokens: agentModeEnabled ? agentStream.outputTokens : chatStream.outputTokens,
    streamDuration: agentModeEnabled ? agentStream.streamDuration : chatStream.streamDuration,
  };

  // Unified send message function
  const sendMessage = async (
    conversationId: string,
    content: string,
    options: SendMessageOptions
  ): Promise<void> => {
    if (options.agentMode) {
      agentStream.resetStream();
      await agentStream.sendAgentMessage(conversationId, {
        content,
        capabilities: options.capabilities,
      });
    } else {
      chatStream.resetStream();
      await chatStream.sendStreamingMessage(conversationId, {
        content,
        useRag: options.ragEnabled,
        userId: options.userId,
        vectorStoreProvider: options.vectorStoreProvider,
        images: options.images,
      });
    }
  };

  // Unified cancel
  const cancelStream = () => {
    if (agentModeEnabled) {
      agentStream.cancelStream();
    } else {
      chatStream.cancelStream();
    }
  };

  // Unified reset
  const resetStream = () => {
    if (agentModeEnabled) {
      agentStream.resetStream();
    } else {
      chatStream.resetStream();
    }
  };

  const actions: CombinedStreamingActions = {
    sendMessage,
    cancelStream,
    resetStream,
  };

  return {
    ...state,
    ...actions,
    // Also expose individual stream hooks for advanced use cases
    chatStream,
    agentStream,
  };
}

