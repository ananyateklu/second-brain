import { AIMessage } from './AIMessage';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'image' | 'audio';
  timestamp: string;
  model?: string;
}

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export function MessageList({ messages, isLoading, messagesEndRef }: MessageListProps) {
  return (
    <div className="p-4 overflow-y-auto h-full">
      {messages.map((message) => (
        <div key={message.id} className={`mb-4 ${message.role === 'assistant' ? 'text-left' : 'text-right'}`}>
          <div className={`inline-block px-4 py-2 rounded-lg ${message.role === 'assistant' ? 'bg-gray-200 text-gray-800' : 'bg-primary-600 text-white'}`}>
            {message.content}
          </div>
        </div>
      ))}
      {isLoading && (
        <div className="mb-4 text-center text-gray-500">
          The assistant is typing...
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}