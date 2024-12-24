import React from 'react';
import { AIModel } from '../../../../../types/ai';
import { AgentConversation } from '../types';
import { MessageBubble } from './MessageBubble';
import { TypingAnimation } from './TypingAnimation';
import { handleMessageReaction, handleMessageCopy } from '../utils/handlers';
import { useTheme } from '../../../../../contexts/themeContextUtils';

interface ChatMessagesProps {
    conversation: AgentConversation | null | undefined;
    isSending: boolean;
    selectedAgent: AIModel;
    setConversations: React.Dispatch<React.SetStateAction<AgentConversation[]>>;
    messagesEndRef: React.RefObject<HTMLDivElement>;
}

const getContainerBackground = (theme: string) => {
    if (theme === 'dark') return 'bg-gray-900/20';
    if (theme === 'midnight') return 'bg-[#1e293b]/20';
    return 'bg-[color-mix(in_srgb,var(--color-background)_90%,var(--color-surface))]';
};

export const ChatMessages = ({
    conversation,
    isSending,
    selectedAgent,
    setConversations,
    messagesEndRef
}: ChatMessagesProps) => {
    const { theme } = useTheme();

    return (
        <div className={`
            relative flex-1 min-h-0
            ${getContainerBackground(theme)}
            backdrop-blur-xl 
            border-[0.5px] 
            border-white/10
            shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12)]
            dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.3)]
            ring-1
            ring-white/5
            transition-all 
            duration-300
        `}>
            {/* Gradient Overlay at Top */}
            <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-[var(--color-background)]/20 to-transparent pointer-events-none z-10" />

            {/* Messages Container */}
            <div className="absolute inset-0 overflow-y-auto px-4 py-6 space-y-6 scrollbar-thin scrollbar-thumb-[var(--color-border)] hover:scrollbar-thumb-[var(--color-textSecondary)] scrollbar-track-transparent">
                {conversation?.messages.map((message, index) => {
                    const isFirstInGroup = index === 0 ||
                        conversation.messages[index - 1].role !== message.role;
                    const isLastInGroup = index === conversation.messages.length - 1 ||
                        conversation.messages[index + 1].role !== message.role;

                    return (
                        <div
                            key={message.id}
                            className={`
                                animate-in fade-in slide-in-from-bottom-2 duration-300
                                ${index === 0 ? 'pt-2' : ''}
                                ${index === conversation.messages.length - 1 ? 'pb-2' : ''}
                                ${!isLastInGroup ? 'mb-2' : ''}
                            `}
                        >
                            <MessageBubble
                                message={message}
                                onReact={() => handleMessageReaction(message, selectedAgent, setConversations)}
                                onCopy={() => handleMessageCopy(message.content)}
                                agentName={selectedAgent.name}
                                agentColor={selectedAgent.color}
                            />
                        </div>
                    );
                })}

                {/* Typing Indicator */}
                {isSending && (
                    <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-[var(--color-surface)]/30 backdrop-blur-sm rounded-lg shadow-sm">
                            <TypingAnimation />
                        </div>
                    </div>
                )}

                {/* Scroll Anchor */}
                <div ref={messagesEndRef} className="h-1" />
            </div>

            {/* Gradient Overlay at Bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[var(--color-background)]/20 to-transparent pointer-events-none z-10" />
        </div>
    );
}; 