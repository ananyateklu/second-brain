import { Message } from '../../../../types/message';
import { TextContent } from './TextContent';
import { ImageContent } from './ImageContent';
import { AudioContent } from './AudioContent';
import { EmbeddingContent } from './EmbeddingContent';
import { LoadingContent } from './LoadingContent';

interface MessageContentProps {
    message: Message;
    themeColor: string;
}

export function MessageContent({ message, themeColor }: MessageContentProps) {
    if (message.type === 'audio' && message.role === 'user') {
        return <AudioContent message={message} />;
    }

    if (message.isLoading) {
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
            return <TextContent message={message} themeColor={themeColor} />;
    }
} 