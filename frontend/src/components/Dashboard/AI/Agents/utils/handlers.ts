import { NavigateFunction } from 'react-router-dom';
import { AIModel } from '../../../../../types/ai';
import { AIMessage, AgentConversation, SendMessageParams } from '../types';
import { agentService } from '../../../../../services/ai/agent';
import { activityService } from '../../../../../api/services/activityService';

export const handleMessageReaction = async (
    message: AIMessage,
    selectedAgent: AIModel,
    setConversations: React.Dispatch<React.SetStateAction<AgentConversation[]>>
) => {
    setConversations(prev => prev.map(conv =>
        conv.model.id === selectedAgent?.id
            ? {
                ...conv,
                messages: conv.messages.map(msg =>
                    msg.id === message.id
                        ? { ...msg, reactions: [...(msg.reactions || []), '👍'] }
                        : msg
                )
            }
            : conv
    ));

    // Log activity for message reaction
    try {
        await activityService.createActivity({
            actionType: 'AI_MESSAGE_REACT',
            itemType: 'AI_MESSAGE',
            itemId: message.id,
            itemTitle: `Reaction to ${selectedAgent.name}'s message`,
            description: `Reacted to message from ${selectedAgent.name}`,
            metadata: {
                messageContent: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
                agentId: selectedAgent.id,
                agentName: selectedAgent.name,
                agentProvider: selectedAgent.provider,
                reaction: '👍'
            }
        });
    } catch (error) {
        console.error('Error logging message reaction:', error);
    }
};

export const handleMessageCopy = (content: string) => {
    navigator.clipboard.writeText(content);
};

export const handleAgentSelect = async (
    model: AIModel,
    conversations: AgentConversation[],
    setConversations: React.Dispatch<React.SetStateAction<AgentConversation[]>>,
    setSelectedAgent: React.Dispatch<React.SetStateAction<AIModel | null>>,
    navigate: NavigateFunction
) => {
    if (!model.isConfigured) {
        navigate('/dashboard/settings');
        return;
    }

    setSelectedAgent(model);

    // Find all conversations for this model
    const modelConversations = conversations.filter(conv => conv.model.id === model.id);

    if (modelConversations.length > 0) {
        // If there are existing conversations, set the most recent one as active
        const mostRecentConversation = [...modelConversations]
            .sort((a: AgentConversation, b: AgentConversation) =>
                b.lastUpdated.getTime() - a.lastUpdated.getTime()
            )[0];

        setConversations(prev => prev.map(conv =>
            conv.id === mostRecentConversation.id
                ? { ...conv, isActive: true }
                : { ...conv, isActive: false }
        ));
    } else {
        // If no conversations exist for this model, create a new one
        try {
            await handleNewConversation(model, setConversations);
        } catch (error) {
            console.error('Error creating new conversation:', error);
        }
    }
};

export const handleNewConversation = async (
    selectedAgent: AIModel | null,
    setConversations: React.Dispatch<React.SetStateAction<AgentConversation[]>>,
) => {
    if (!selectedAgent) return;

    try {
        // Create chat in database
        const newChat = await agentService.createChat(selectedAgent.id, "New Chat");
        console.log('Created new chat:', newChat);

        // Log activity for new chat creation
        await activityService.createActivity({
            actionType: 'AI_CHAT_CREATE',
            itemType: 'AI_CHAT',
            itemId: newChat.id,
            itemTitle: `Chat with ${selectedAgent.name}`,
            description: `Started new conversation with ${selectedAgent.name}`,
            metadata: {
                agentId: selectedAgent.id,
                agentName: selectedAgent.name,
                agentProvider: selectedAgent.provider,
                agentColor: selectedAgent.color
            }
        });

        // Add to local state
        const conversation: AgentConversation = {
            id: newChat.id,
            messages: [],
            model: selectedAgent,
            isActive: true,
            lastUpdated: new Date(newChat.lastUpdated),
            title: newChat.title
        };

        setConversations(prev => prev.map(c => ({ ...c, isActive: false })).concat(conversation));
        return conversation;
    } catch (error) {
        console.error('Error creating new conversation:', error);
        throw error;
    }
};

export const getCurrentConversation = (
    modelId: string,
    conversations: AgentConversation[]
): AgentConversation | undefined => {
    return conversations.find(conv => conv.model.id === modelId && conv.isActive);
};

export const handleSendMessage = async ({
    e,
    selectedAgent,
    currentMessage,
    setCurrentMessage,
    setIsSending,
    setConversations,
    isSending,
    conversations
}: SendMessageParams) => {
    e.preventDefault();
    if (!selectedAgent || !currentMessage.trim() || isSending) return;

    try {
        setIsSending(true);

        // Get active conversation
        const activeConversation = getCurrentConversation(selectedAgent.id, conversations);
        if (!activeConversation) {
            throw new Error('No active conversation');
        }

        // Add user message to database
        const userMessage = await agentService.addMessage(activeConversation.id, {
            role: 'user',
            content: currentMessage,
            status: 'sent'
        });

        // Log activity for user message
        await activityService.createActivity({
            actionType: 'AI_MESSAGE_SEND',
            itemType: 'AI_MESSAGE',
            itemId: userMessage.id,
            itemTitle: `Message to ${selectedAgent.name}`,
            description: `Sent message to ${selectedAgent.name}`,
            metadata: {
                messageContent: currentMessage.substring(0, 100) + (currentMessage.length > 100 ? '...' : ''),
                agentId: selectedAgent.id,
                agentName: selectedAgent.name,
                agentProvider: selectedAgent.provider,
                chatId: activeConversation.id
            }
        });

        // Update local state with user message
        setConversations(prev => prev.map(conv => {
            if (conv.id === activeConversation.id) {
                return {
                    ...conv,
                    messages: [...conv.messages, {
                        ...userMessage,
                        timestamp: new Date(userMessage.timestamp)
                    }],
                    lastUpdated: new Date()
                };
            }
            return conv;
        }));

        // Send message to AI
        const response = await agentService.sendMessage(
            currentMessage,
            selectedAgent.id,
            activeConversation.id
        );

        // Add AI response to database
        const assistantMessage = await agentService.addMessage(activeConversation.id, {
            role: 'assistant',
            content: response.content,
            status: 'sent',
            metadata: response.metadata
        });

        // Log activity for AI response
        await activityService.createActivity({
            actionType: 'AI_MESSAGE_RECEIVE',
            itemType: 'AI_MESSAGE',
            itemId: assistantMessage.id,
            itemTitle: `Response from ${selectedAgent.name}`,
            description: `Received response from ${selectedAgent.name}`,
            metadata: {
                messageContent: response.content.substring(0, 100) + (response.content.length > 100 ? '...' : ''),
                agentId: selectedAgent.id,
                agentName: selectedAgent.name,
                agentProvider: selectedAgent.provider,
                chatId: activeConversation.id,
                executionStats: response.metadata
            }
        });

        // Update local state with AI response
        setConversations(prev => prev.map(conv => {
            if (conv.id === activeConversation.id) {
                return {
                    ...conv,
                    messages: [...conv.messages, {
                        ...assistantMessage,
                        timestamp: new Date(assistantMessage.timestamp)
                    }],
                    lastUpdated: new Date()
                };
            }
            return conv;
        }));

        setCurrentMessage('');
    } catch (error) {
        console.error('Error sending message:', error);
    } finally {
        setIsSending(false);
    }
};

export const handleDeleteConversation = async (
    conversationId: string,
    selectedAgent: AIModel | null,
    setConversations: React.Dispatch<React.SetStateAction<AgentConversation[]>>
) => {
    try {
        // Delete from database
        await agentService.deleteChat(conversationId);

        if (selectedAgent) {
            // Log activity for chat deletion
            await activityService.createActivity({
                actionType: 'AI_CHAT_DELETE',
                itemType: 'AI_CHAT',
                itemId: conversationId,
                itemTitle: `Chat with ${selectedAgent.name}`,
                description: `Deleted conversation with ${selectedAgent.name}`,
                metadata: {
                    agentId: selectedAgent.id,
                    agentName: selectedAgent.name,
                    agentProvider: selectedAgent.provider
                }
            });
        }

        // Update local state
        setConversations(prev => {
            const newConversations = prev.filter(conv => conv.id !== conversationId);
            const wasActive = prev.find(conv => conv.id === conversationId)?.isActive;

            if (wasActive && selectedAgent) {
                const nextConversation = newConversations
                    .filter(conv => conv.model.id === selectedAgent.id)
                    .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())[0];

                if (nextConversation) {
                    return newConversations.map(conv =>
                        conv.id === nextConversation.id ? { ...conv, isActive: true } : conv
                    );
                }
            }
            return newConversations;
        });
    } catch (error) {
        console.error('Error deleting conversation:', error);
    }
}; 