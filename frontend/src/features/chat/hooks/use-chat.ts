import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../api/chat-api';
import { CreateConversationRequest, SendMessageRequest, UpdateConversationSettingsRequest } from '../types/chat';

import { DEFAULT_USER_ID } from '../../../lib/constants';

export function useChatConversations(userId: string = DEFAULT_USER_ID) {
  return useQuery({
    queryKey: ['conversations', userId],
    queryFn: () => chatApi.getConversations(userId),
  });
}

export function useChatConversation(id: string | null) {
  return useQuery({
    queryKey: ['conversation', id],
    queryFn: () => chatApi.getConversation(id!),
    enabled: !!id,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateConversationRequest) =>
      chatApi.createConversation(request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.setQueryData(['conversation', data.id], data);
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, request }: { conversationId: string; request: SendMessageRequest }) =>
      chatApi.sendMessage(conversationId, request),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['conversation', variables.conversationId], data.conversation);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useUpdateConversationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, request }: { conversationId: string; request: UpdateConversationSettingsRequest }) =>
      chatApi.updateConversationSettings(conversationId, request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.setQueryData(['conversation', data.id], data);
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => chatApi.deleteConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

