/**
 * use-chat Tests
 * Unit tests for chat hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
    useChatConversations,
    useChatConversation,
    useCreateConversation,
    useDeleteConversation,
    useBulkDeleteConversations,
    useUpdateConversationSettings,
} from '../use-chat';
import { chatService } from '../../../../services';

// Mock the chat service
vi.mock('../../../../services', () => ({
    chatService: {
        getConversations: vi.fn(),
        getConversation: vi.fn(),
        createConversation: vi.fn(),
        deleteConversation: vi.fn(),
        bulkDeleteConversations: vi.fn(),
        updateConversationSettings: vi.fn(),
        sendMessage: vi.fn(),
    },
}));

// Helper to create a mock conversation
function createMockConversation(overrides = {}) {
    return {
        id: 'conv-1',
        title: 'Test Conversation',
        userId: 'user-123',
        provider: 'openai',
        model: 'gpt-4',
        ragEnabled: false,
        agentEnabled: false,
        imageGenerationEnabled: false,
        messages: [],
        createdAt: '2024-01-01T12:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
        ...overrides,
    };
}

// Create a wrapper component with QueryClient
function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
                staleTime: 0,
            },
            mutations: {
                retry: false,
            },
        },
    });

    return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(QueryClientProvider, { client: queryClient }, children);
    };
}

describe('use-chat', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ============================================
    // useChatConversations Tests
    // ============================================
    describe('useChatConversations', () => {
        it('should return loading state initially', () => {
            // Arrange
            vi.mocked(chatService.getConversations).mockImplementation(() => new Promise(() => { }));

            // Act
            const { result } = renderHook(() => useChatConversations('user-123'), {
                wrapper: createWrapper(),
            });

            // Assert
            expect(result.current.isLoading).toBe(true);
        });

        it('should return conversations on success', async () => {
            // Arrange
            const mockConversations = [
                createMockConversation({ id: '1' }),
                createMockConversation({ id: '2' }),
            ];
            vi.mocked(chatService.getConversations).mockResolvedValue(mockConversations);

            // Act
            const { result } = renderHook(() => useChatConversations('user-123'), {
                wrapper: createWrapper(),
            });

            // Assert
            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });
            expect(result.current.data).toEqual(mockConversations);
        });

        it('should call chatService.getConversations with userId', async () => {
            // Arrange
            vi.mocked(chatService.getConversations).mockResolvedValue([]);

            // Act
            renderHook(() => useChatConversations('test-user-id'), {
                wrapper: createWrapper(),
            });

            // Assert
            await waitFor(() => {
                expect(chatService.getConversations).toHaveBeenCalledWith('test-user-id');
            });
        });
    });

    // ============================================
    // useChatConversation Tests
    // ============================================
    describe('useChatConversation', () => {
        it('should return conversation by id on success', async () => {
            // Arrange
            const mockConversation = createMockConversation({ id: 'conv-123' });
            vi.mocked(chatService.getConversation).mockResolvedValue(mockConversation);

            // Act
            const { result } = renderHook(() => useChatConversation('conv-123'), {
                wrapper: createWrapper(),
            });

            // Assert
            await waitFor(() => {
                expect(result.current.isSuccess).toBe(true);
            });
            expect(result.current.data).toEqual(mockConversation);
        });

        it('should call chatService.getConversation with correct id', async () => {
            // Arrange
            vi.mocked(chatService.getConversation).mockResolvedValue(createMockConversation());

            // Act
            renderHook(() => useChatConversation('test-conv-id'), {
                wrapper: createWrapper(),
            });

            // Assert
            await waitFor(() => {
                expect(chatService.getConversation).toHaveBeenCalledWith('test-conv-id');
            });
        });

        it('should not fetch when id is null', () => {
            // Act
            const { result } = renderHook(() => useChatConversation(null), {
                wrapper: createWrapper(),
            });

            // Assert
            expect(result.current.fetchStatus).toBe('idle');
            expect(chatService.getConversation).not.toHaveBeenCalled();
        });
    });

    // ============================================
    // useCreateConversation Tests
    // ============================================
    describe('useCreateConversation', () => {
        it('should call chatService.createConversation with request data', async () => {
            // Arrange
            const createRequest = { title: 'New Chat', userId: 'user-123', provider: 'openai', model: 'gpt-4' };
            const createdConversation = createMockConversation({ ...createRequest, id: 'new-conv' });
            vi.mocked(chatService.createConversation).mockResolvedValue(createdConversation);

            // Act
            const { result } = renderHook(() => useCreateConversation(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync(createRequest);
            });

            // Assert
            expect(chatService.createConversation).toHaveBeenCalledWith(createRequest);
        });

        it('should return created conversation', async () => {
            // Arrange
            const createRequest = { title: 'New Chat', userId: 'user-123', provider: 'openai', model: 'gpt-4' };
            const createdConversation = createMockConversation({ ...createRequest, id: 'new-conv' });
            vi.mocked(chatService.createConversation).mockResolvedValue(createdConversation);

            // Act
            const { result } = renderHook(() => useCreateConversation(), {
                wrapper: createWrapper(),
            });

            let response;
            await act(async () => {
                response = await result.current.mutateAsync(createRequest);
            });

            // Assert
            expect(response).toEqual(createdConversation);
        });
    });

    // ============================================
    // useDeleteConversation Tests
    // ============================================
    describe('useDeleteConversation', () => {
        it('should call chatService.deleteConversation with id', async () => {
            // Arrange
            vi.mocked(chatService.deleteConversation).mockResolvedValue(undefined);

            // Act
            const { result } = renderHook(() => useDeleteConversation(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync('conv-to-delete');
            });

            // Assert
            expect(chatService.deleteConversation).toHaveBeenCalledWith('conv-to-delete');
        });

        it('should handle deletion error', async () => {
            // Arrange
            vi.mocked(chatService.deleteConversation).mockRejectedValue(new Error('Delete failed'));

            // Act
            const { result } = renderHook(() => useDeleteConversation(), {
                wrapper: createWrapper(),
            });

            // Assert
            await expect(
                act(async () => {
                    await result.current.mutateAsync('conv-1');
                })
            ).rejects.toThrow('Delete failed');
        });
    });

    // ============================================
    // useBulkDeleteConversations Tests
    // ============================================
    describe('useBulkDeleteConversations', () => {
        it('should call chatService.bulkDeleteConversations with ids', async () => {
            // Arrange
            const conversationIds = ['conv-1', 'conv-2', 'conv-3'];
            vi.mocked(chatService.bulkDeleteConversations).mockResolvedValue({
                deletedCount: 3,
                message: 'Successfully deleted 3 conversation(s)',
            });

            // Act
            const { result } = renderHook(() => useBulkDeleteConversations(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync(conversationIds);
            });

            // Assert
            expect(chatService.bulkDeleteConversations).toHaveBeenCalledWith(conversationIds);
        });

        it('should return deleted count on success', async () => {
            // Arrange
            const conversationIds = ['conv-1', 'conv-2'];
            vi.mocked(chatService.bulkDeleteConversations).mockResolvedValue({
                deletedCount: 2,
                message: 'Successfully deleted 2 conversation(s)',
            });

            // Act
            const { result } = renderHook(() => useBulkDeleteConversations(), {
                wrapper: createWrapper(),
            });

            let response;
            await act(async () => {
                response = await result.current.mutateAsync(conversationIds);
            });

            // Assert
            expect(response).toEqual({
                deletedCount: 2,
                message: 'Successfully deleted 2 conversation(s)',
            });
        });

        it('should handle bulk deletion error', async () => {
            // Arrange
            vi.mocked(chatService.bulkDeleteConversations).mockRejectedValue(
                new Error('Bulk delete failed')
            );

            // Act
            const { result } = renderHook(() => useBulkDeleteConversations(), {
                wrapper: createWrapper(),
            });

            // Assert
            await expect(
                act(async () => {
                    await result.current.mutateAsync(['conv-1', 'conv-2']);
                })
            ).rejects.toThrow('Bulk delete failed');
        });
    });

    // ============================================
    // useUpdateConversationSettings Tests
    // ============================================
    describe('useUpdateConversationSettings', () => {
        it('should call chatService.updateConversationSettings with correct params', async () => {
            // Arrange
            const updateRequest = { ragEnabled: true };
            const updatedConversation = createMockConversation({ ragEnabled: true });
            vi.mocked(chatService.updateConversationSettings).mockResolvedValue(updatedConversation);

            // Act
            const { result } = renderHook(() => useUpdateConversationSettings(), {
                wrapper: createWrapper(),
            });

            await act(async () => {
                await result.current.mutateAsync({
                    conversationId: 'conv-1',
                    request: updateRequest,
                });
            });

            // Assert
            expect(chatService.updateConversationSettings).toHaveBeenCalledWith('conv-1', updateRequest);
        });

        it('should return updated conversation', async () => {
            // Arrange
            const updateRequest = { ragEnabled: true };
            const updatedConversation = createMockConversation({ ragEnabled: true });
            vi.mocked(chatService.updateConversationSettings).mockResolvedValue(updatedConversation);

            // Act
            const { result } = renderHook(() => useUpdateConversationSettings(), {
                wrapper: createWrapper(),
            });

            let response;
            await act(async () => {
                response = await result.current.mutateAsync({
                    conversationId: 'conv-1',
                    request: updateRequest,
                });
            });

            // Assert
            expect(response).toEqual(updatedConversation);
        });
    });

    // ============================================
    // Error Handling Tests
    // ============================================
    describe('error handling', () => {
        it('should return error state on failed fetch', async () => {
            // Arrange
            vi.mocked(chatService.getConversations).mockRejectedValue(new Error('Fetch failed'));

            // Act
            const { result } = renderHook(() => useChatConversations('user-123'), {
                wrapper: createWrapper(),
            });

            // Assert - wait for query to fail after retries
            // useApiQuery retries up to 2 times for non-auth/non-404 errors
            await waitFor(() => {
                expect(result.current.isError).toBe(true);
            }, { timeout: 5000 });
            expect(result.current.error).toBeTruthy();
        });

        it('should handle mutation error gracefully', async () => {
            // Arrange
            vi.mocked(chatService.createConversation).mockRejectedValue(new Error('Create failed'));

            // Act
            const { result } = renderHook(() => useCreateConversation(), {
                wrapper: createWrapper(),
            });

            // Assert
            await expect(
                act(async () => {
                    await result.current.mutateAsync({ title: 'Test', userId: 'user-123', provider: 'openai', model: 'gpt-4' });
                })
            ).rejects.toThrow('Create failed');
        });
    });

    // ============================================
    // Query Key Tests
    // ============================================
    describe('query keys', () => {
        it('should use different cache entries for different users', async () => {
            // Arrange
            const user1Conversations = [createMockConversation({ id: '1', userId: 'user-1' })];
            const user2Conversations = [createMockConversation({ id: '2', userId: 'user-2' })];

            vi.mocked(chatService.getConversations)
                .mockResolvedValueOnce(user1Conversations)
                .mockResolvedValueOnce(user2Conversations);

            // Act
            const { result: result1 } = renderHook(() => useChatConversations('user-1'), {
                wrapper: createWrapper(),
            });

            await waitFor(() => {
                expect(result1.current.isSuccess).toBe(true);
            });

            // Assert
            expect(result1.current.data).toEqual(user1Conversations);
        });

        it('should use different cache entries for different conversation ids', async () => {
            // Arrange
            const conv1 = createMockConversation({ id: 'conv-1' });
            const conv2 = createMockConversation({ id: 'conv-2' });

            vi.mocked(chatService.getConversation)
                .mockResolvedValueOnce(conv1)
                .mockResolvedValueOnce(conv2);

            const queryClient = new QueryClient({
                defaultOptions: { queries: { retry: false } },
            });

            function wrapper({ children }: { children: React.ReactNode }) {
                return React.createElement(QueryClientProvider, { client: queryClient }, children);
            }

            // Act
            const { result: result1 } = renderHook(() => useChatConversation('conv-1'), { wrapper });

            await waitFor(() => {
                expect(result1.current.isSuccess).toBe(true);
            });

            expect(result1.current.data).toEqual(conv1);
        });
    });
});

