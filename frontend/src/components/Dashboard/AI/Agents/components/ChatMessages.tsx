import React from 'react';
import { AIModel } from '../../../../../types/ai';
import { AgentConversation } from '../types';
import { MessageBubble } from './MessageBubble';
import { TypingAnimation } from './TypingAnimation';
import { handleMessageReaction, handleMessageCopy } from '../utils/handlers';

interface ChatMessagesProps {
    conversation: AgentConversation | null | undefined;
    isSending: boolean;
    selectedAgent: AIModel;
    setConversations: React.Dispatch<React.SetStateAction<AgentConversation[]>>;
    messagesEndRef: React.RefObject<HTMLDivElement>;
}

export const ChatMessages = ({
    conversation,
    isSending,
    selectedAgent,
    setConversations,
    messagesEndRef
}: ChatMessagesProps) => (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-[var(--color-border)] scrollbar-track-transparent">
        {conversation?.messages.map((message) => (
            <MessageBubble
                key={message.id}
                message={message}
                onReact={() => handleMessageReaction(message, selectedAgent, setConversations)}
                onCopy={() => handleMessageCopy(message.content)}
            />
        ))}
        {isSending && (
            <div className="flex justify-start">
                <div className="bg-[var(--color-surface)] rounded-lg">
                    <TypingAnimation />
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
    </div>
); 