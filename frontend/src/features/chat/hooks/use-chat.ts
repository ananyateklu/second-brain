import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { chatService } from '../../../services';
import { CreateConversationRequest, SendMessageRequest, UpdateConversationSettingsRequest } from '../../../types/chat';
import { DEFAULT_USER_ID, QUERY_KEYS } from '../../../lib/constants';

export function useChatConversations(userId: string = DEFAULT_USER_ID) {
  return useQuery({
    queryKey: QUERY_KEYS.conversations.list(userId),
    queryFn: () => chatService.getConversations(userId),
  });
}

export function useChatConversation(id: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.conversation(id),
    queryFn: () => chatService.getConversation(id!),
    enabled: !!id,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateConversationRequest) =>
      chatService.createConversation(request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations.all });
      queryClient.setQueryData(QUERY_KEYS.conversation(data.id), data);
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, request }: { conversationId: string; request: SendMessageRequest }) =>
      chatService.sendMessage(conversationId, request),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(QUERY_KEYS.conversation(variables.conversationId), data.conversation);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations.all });
    },
  });
}

export function useUpdateConversationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, request }: { conversationId: string; request: UpdateConversationSettingsRequest }) =>
      chatService.updateConversationSettings(conversationId, request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations.all });
      queryClient.setQueryData(QUERY_KEYS.conversation(data.id), data);
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => chatService.deleteConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations.all });
    },
  });
}

