import { NavigateFunction } from 'react-router-dom';
import { AIModel } from '../../../../../types/ai';
import { AIMessage, AgentConversation, SendMessageParams } from '../types';

export const handleMessageReaction = (
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
};

export const handleMessageCopy = (content: string) => {
    navigator.clipboard.writeText(content);
};

export const handleAgentSelect = (
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
    if (!conversations.find(conv => conv.model.id === model.id && conv.isActive)) {
        setConversations(prev => [...prev, {
            id: Date.now().toString(),
            messages: [],
            model: model,
            isActive: true,
            lastUpdated: new Date()
        }]);
    } else {
        setConversations(prev => prev.map(conv =>
            conv.model.id === model.id
                ? { ...conv, isActive: true }
                : { ...conv, isActive: false }
        ));
    }
};

export const handleNewConversation = (
    selectedAgent: AIModel | null,
    setConversations: React.Dispatch<React.SetStateAction<AgentConversation[]>>
) => {
    if (!selectedAgent) return;
    
    setConversations(prev => [
        ...prev.map(conv => ({ ...conv, isActive: false })),
        {
            id: Date.now().toString(),
            messages: [],
            model: selectedAgent,
            isActive: true,
            lastUpdated: new Date()
        }
    ]);
};

export const getCurrentConversation = (
    selectedAgent: AIModel | null,
    conversations: AgentConversation[]
) => {
    return selectedAgent
        ? conversations.find(conv => conv.model.id === selectedAgent.id && conv.isActive)
        : null;
};

export const handleSendMessage = async ({
    e,
    selectedAgent,
    currentMessage,
    setCurrentMessage,
    setIsSending,
    setConversations,
    sendMessage,
    isSending
}: SendMessageParams) => {
    e.preventDefault();
    if (!selectedAgent || !currentMessage.trim() || isSending) return;

    const message = currentMessage.trim();
    setCurrentMessage('');
    setIsSending(true);

    try {
        const userMessage: AIMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: message,
            timestamp: new Date(),
            status: 'sending'
        };

        setConversations(prev => prev.map(conv =>
            conv.model.id === selectedAgent.id
                ? {
                    ...conv,
                    messages: [...conv.messages, userMessage],
                    lastUpdated: new Date()
                }
                : conv
        ));

        const response = await sendMessage(message, selectedAgent.id);

        setConversations(prev => prev.map(conv =>
            conv.model.id === selectedAgent.id
                ? {
                    ...conv,
                    messages: conv.messages.map(msg =>
                        msg.id === userMessage.id
                            ? { ...msg, status: 'sent' }
                            : msg
                    )
                }
                : conv
        ));

        const aiMessage: AIMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: response.content,
            timestamp: new Date(),
            status: 'sent'
        };

        setConversations(prev => prev.map(conv =>
            conv.model.id === selectedAgent.id
                ? {
                    ...conv,
                    messages: [...conv.messages, aiMessage],
                    lastUpdated: new Date()
                }
                : conv
        ));
    } catch (error) {
        console.error('Error sending message:', error);
        const errorMessage: AIMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: 'Sorry, I encountered an error processing your request.',
            timestamp: new Date(),
            status: 'error'
        };

        setConversations(prev => prev.map(conv =>
            conv.model.id === selectedAgent.id
                ? {
                    ...conv,
                    messages: [...conv.messages, errorMessage],
                    lastUpdated: new Date()
                }
                : conv
        ));
    } finally {
        setIsSending(false);
    }
};

export const handleDeleteConversation = (
    conversationId: string,
    selectedAgent: AIModel | null,
    setConversations: React.Dispatch<React.SetStateAction<AgentConversation[]>>
) => {
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
}; 