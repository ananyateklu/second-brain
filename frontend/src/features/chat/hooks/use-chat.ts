import { useQueryClient } from '@tanstack/react-query';
import { chatService } from '../../../services';
import { ChatConversation, ChatResponseWithRag, CreateConversationRequest, SendMessageRequest, UpdateConversationSettingsRequest } from '../../../types/chat';
import { DEFAULT_USER_ID, QUERY_KEYS } from '../../../lib/constants';
import { useApiQuery, useConditionalQuery } from '../../../hooks/use-api-query';
import { useApiMutation } from '../../../hooks/use-api-mutation';

export function useChatConversations(userId: string = DEFAULT_USER_ID) {
  return useApiQuery<ChatConversation[]>(
    QUERY_KEYS.conversations.list(userId),
    () => chatService.getConversations(userId)
  );
}

export function useChatConversation(id: string | null) {
  return useConditionalQuery<ChatConversation>(
    !!id,
    QUERY_KEYS.conversation(id),
    () => chatService.getConversation(id!)
  );
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useApiMutation<ChatConversation, CreateConversationRequest>(
    (request) => chatService.createConversation(request),
    {
      invalidateQueries: [QUERY_KEYS.conversations.all],
      onSuccess: (data) => {
        queryClient.setQueryData(QUERY_KEYS.conversation(data.id), data);
      },
    }
  );
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useApiMutation<ChatResponseWithRag, { conversationId: string; request: SendMessageRequest }>(
    ({ conversationId, request }) => chatService.sendMessage(conversationId, request),
    {
      invalidateQueries: [QUERY_KEYS.conversations.all],
      onSuccess: (data, { conversationId }) => {
        queryClient.setQueryData(QUERY_KEYS.conversation(conversationId), data.conversation);
      },
    }
  );
}

export function useUpdateConversationSettings() {
  const queryClient = useQueryClient();

  return useApiMutation<ChatConversation, { conversationId: string; request: UpdateConversationSettingsRequest }>(
    ({ conversationId, request }) => chatService.updateConversationSettings(conversationId, request),
    {
      invalidateQueries: [QUERY_KEYS.conversations.all],
      onSuccess: (data) => {
        queryClient.setQueryData(QUERY_KEYS.conversation(data.id), data);
      },
    }
  );
}

export function useDeleteConversation() {
  return useApiMutation<void, string>(
    (id) => chatService.deleteConversation(id),
    {
      invalidateQueries: [QUERY_KEYS.conversations.all],
    }
  );
}

export function useBulkDeleteConversations() {
  return useApiMutation<{ deletedCount: number; message: string }, string[]>(
    (conversationIds) => chatService.bulkDeleteConversations(conversationIds),
    {
      invalidateQueries: [QUERY_KEYS.conversations.all],
    }
  );
}

