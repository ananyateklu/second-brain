import React, { useMemo, useState, useEffect, useRef } from 'react';
import { AIMessage } from './ModernAIMessage';
import { AIModel } from '../../../../types/ai';
import { Message } from '../../../../types/message';
import { useTheme } from '../../../../contexts/themeContextUtils';

// Define ToolMetadata interface from AIMessage component
interface ToolMetadata {
    tools_used: Array<{
        name: string;
        type: string;
        description: string;
        parameters: Record<string, unknown>;
        required_permissions?: string[];
        status?: string;
        result?: string;
        error?: string;
        execution_time?: number;
    }>;
    execution_time?: number;
    agent_type?: string;
    base_agent?: string;
    research_parameters?: {
        topic: string;
        tools_used: string[];
    };
}

// Enhanced message type to match what AIMessage component expects
type EnhancedMessage = Message & { metadata?: ToolMetadata };

interface ModernMessageListProps { // Renamed props interface
    messages: Message[];
    isLoading: boolean;
    messagesEndRef: React.RefObject<HTMLDivElement>;
    themeColor: string;
    selectedModel: AIModel | null;
}

export function ModernMessageList(props: ModernMessageListProps) { // Renamed component
    // Add state to track if user has manually scrolled
    const [userHasScrolled, setUserHasScrolled] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const { theme } = useTheme();

    // Handle scroll events
    const handleScroll = () => {
        if (!props.isLoading) {
            const container = scrollContainerRef.current;
            if (!container) return;

            const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
            setUserHasScrolled(!isAtBottom);
        }
    };

    // Auto-scroll effect
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const shouldAutoScroll = props.isLoading || !userHasScrolled;
        if (shouldAutoScroll) {
            // Add a small delay to ensure content is fully rendered
            const timer = setTimeout(() => {
                container.scrollTo({
                    top: container.scrollHeight,
                    behavior: 'smooth'
                });
            }, 150);

            return () => clearTimeout(timer);
        }
    }, [props.messages, props.isLoading, userHasScrolled]);

    // Reset userHasScrolled when loading starts
    useEffect(() => {
        if (props.isLoading) {
            setUserHasScrolled(false);
        }
    }, [props.isLoading]);

    // Group messages by date and consecutive sender
    const groupedMessages = useMemo(() => {
        const groups: Message[][] = [];
        let currentGroup: Message[] = [];

        props.messages.forEach((message, index) => {
            const prevMessage = props.messages[index - 1];

            if (
                !prevMessage ||
                prevMessage.role !== message.role ||
                new Date(message.timestamp).getTime() - new Date(prevMessage.timestamp).getTime() > 5 * 60 * 1000 ||
                new Date(message.timestamp).toDateString() !== new Date(prevMessage.timestamp).toDateString()
            ) {
                if (currentGroup.length > 0) {
                    groups.push(currentGroup);
                }
                currentGroup = [message];
            } else {
                currentGroup.push(message);
            }
        });

        if (currentGroup.length > 0) {
            groups.push(currentGroup);
        }

        return groups;
    }, [props.messages]);

    return (
        <div className="h-full relative">
            {props.messages.length > 0 ? (
                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="h-full overflow-y-auto overflow-x-hidden px-1 sm:px-2 md:px-4 py-4 pb-16 space-y-4 custom-scrollbar"
                >
                    {groupedMessages.map((group, groupIndex) => {
                        const date = new Date(group[0].timestamp);
                        const showDateDivider = groupIndex === 0 ||
                            new Date(groupedMessages[groupIndex - 1][0].timestamp).toDateString() !== date.toDateString();
                        const groupKey = `group-${group[0].id}-${groupIndex}`;

                        return (
                            <div key={groupKey} className="space-y-1 max-w-full">
                                {showDateDivider && (
                                    <div className="flex items-center justify-center my-1">
                                        <div className={`px-3 py-0.5 rounded-full text-xs font-medium 
                      ${theme === 'midnight' ? 'bg-gray-900/50' :
                                                theme === 'full-dark' ? 'bg-zinc-900/50' : 'bg-gray-100/50 dark:bg-gray-800/50'} 
                      text-[var(--color-textSecondary)]
                      backdrop-blur-sm ${theme === 'midnight' || theme === 'full-dark' ? '' : 'border border-gray-200/30 dark:border-gray-700/30'}`}>
                                            {formatDate(date)}
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-1 mx-2 sm:mx-3 md:mx-5 lg:mx-10">
                                    {group.map((message, index) => (
                                        <AIMessage
                                            key={`${message.id}-${index}`}
                                            message={message as EnhancedMessage}
                                            themeColor={props.themeColor}
                                            isStreaming={props.isLoading && message.role === 'assistant'}
                                            isFirstInGroup={index === 0}
                                            isLastInGroup={index === group.length - 1}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                    <div ref={props.messagesEndRef} className="h-12" />
                </div>
            ) : null}
        </div>
    );
}

function formatDate(date: Date): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
    }
} 