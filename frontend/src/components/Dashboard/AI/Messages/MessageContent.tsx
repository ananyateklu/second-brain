import { Message } from '../../../../types/message';
import { TextContent } from './TextContent';
import { ImageContent } from './ImageContent';
import { AudioContent } from './AudioContent';
import { EmbeddingContent } from './EmbeddingContent';
import { LoadingContent } from './LoadingContent';

interface MessageContentProps {
    message: Message;
    themeColor: string;
    isStreaming?: boolean;
    streamingCursorColor?: string;
}

export function MessageContent({ message, themeColor, isStreaming, streamingCursorColor }: MessageContentProps) {
    if (message.type === 'audio' && message.role === 'user') {
        return <AudioContent message={message} />;
    }

    // Check if the message is from Ollama - if so, we don't need a loading indicator
    // as we're already showing the streaming content
    const isOllamaModel = message.model?.provider === 'ollama';

    // Debug log to track message state
    console.log('Message loading state:', {
        isLoading: message.isLoading,
        content: message.content,
        modelProvider: message.model?.provider,
        shouldShowLoading: message.isLoading && (!isOllamaModel || (typeof message.content === 'string' && message.content.trim() === ''))
    });

    // Never show loading for Ollama, and show loading for other providers only if content is empty
    if (message.isLoading && !isOllamaModel) {
        switch (message.type) {
            case 'image':
                return <ImageContent message={message} />;
            case 'embedding':
                return <LoadingContent type="embedding" themeColor={themeColor} />;
            case 'audio':
                return <LoadingContent type="audio" themeColor={themeColor} />;
            case 'text':
            default:
                return <LoadingContent type="text" themeColor={themeColor} />;
        }
    }

    switch (message.type) {
        case 'image':
            return <ImageContent message={message} />;
        case 'audio':
            return <AudioContent message={message} />;
        case 'embedding':
            return <EmbeddingContent message={message} />;
        case 'text':
        default:
            return <TextContent message={message} themeColor={themeColor} isStreaming={isStreaming} streamingCursorColor={streamingCursorColor} />;
    }
} 