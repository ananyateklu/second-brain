import { useQueryClient } from '@tanstack/react-query';
import { chatService, type GetConversationsPagedParams } from '../../../services/chat.service';
import { ChatConversation, ChatResponseWithRag, CreateConversationRequest, SendMessageRequest, UpdateConversationSettingsRequest } from '../../../types/chat';
import type { PaginatedResult } from '../../../types/api';
import { DEFAULT_USER_ID } from '../../../lib/constants';
import { conversationKeys, type ConversationPaginationParams } from '../../../lib/query-keys';
import { useApiQuery, useConditionalQuery } from '../../../hooks/use-api-query';
import { useApiMutation } from '../../../hooks/use-api-mutation';

export function useChatConversations(userId: string = DEFAULT_USER_ID) {
  return useApiQuery<ChatConversation[]>(
    conversationKeys.list({ userId }),
    () => chatService.getConversations(userId)
  );
}

/**
 * Query: Get paginated conversation headers (without messages) for better performance
 * Use this instead of useChatConversations() when dealing with many conversations.
 *
 * @param params - Pagination parameters
 * @param enabled - Whether the query should be enabled (default: true)
 * @returns Paginated result with conversation headers and pagination metadata
 */
export function useChatConversationsPaged(
  params: GetConversationsPagedParams,
  enabled = true
) {
  const queryParams: ConversationPaginationParams = {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
  };

  return useApiQuery<PaginatedResult<ChatConversation>>(
    conversationKeys.paged(queryParams),
    () => chatService.getConversationsPaged(params),
    {
      enabled,
      // Keep previous data while fetching new page for smoother UX
      placeholderData: (previousData) => previousData,
    }
  );
}

export function useChatConversation(id: string | null) {
  return useConditionalQuery<ChatConversation>(
    !!id,
    conversationKeys.detail(id ?? ''),
    () => {
      if (!id) throw new Error('Conversation ID is required');
      return chatService.getConversation(id);
    }
  );
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useApiMutation<ChatConversation, CreateConversationRequest>(
    (request) => chatService.createConversation(request),
    {
      invalidateQueries: [conversationKeys.all],
      onSuccess: (data) => {
        queryClient.setQueryData(conversationKeys.detail(data.id), data);
      },
    }
  );
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useApiMutation<ChatResponseWithRag, { conversationId: string; request: SendMessageRequest }>(
    ({ conversationId, request }) => chatService.sendMessage(conversationId, request),
    {
      invalidateQueries: [conversationKeys.all],
      onSuccess: (data, { conversationId }) => {
        queryClient.setQueryData(conversationKeys.detail(conversationId), data.conversation);
      },
    }
  );
}

export function useUpdateConversationSettings() {
  const queryClient = useQueryClient();

  return useApiMutation<ChatConversation, { conversationId: string; request: UpdateConversationSettingsRequest }>(
    ({ conversationId, request }) => chatService.updateConversationSettings(conversationId, request),
    {
      invalidateQueries: [conversationKeys.all],
      onSuccess: (data) => {
        queryClient.setQueryData(conversationKeys.detail(data.id), data);
      },
    }
  );
}

export function useDeleteConversation() {
  return useApiMutation<void, string>(
    (id) => chatService.deleteConversation(id),
    {
      invalidateQueries: [conversationKeys.all],
    }
  );
}

export function useBulkDeleteConversations() {
  return useApiMutation<{ deletedCount: number; message: string }, string[]>(
    (conversationIds) => chatService.bulkDeleteConversations(conversationIds),
    {
      invalidateQueries: [conversationKeys.all],
    }
  );
}

