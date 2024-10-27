import { Bot, User } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'image' | 'audio';
  timestamp: string;
  model?: string;
}

interface AIMessageProps {
  message: Message;
}

export function AIMessage({ message }: AIMessageProps) {
  const isUser = message.role === 'user';

  const renderContent = () => {
    switch (message.type) {
      case 'image':
        return (
          <img
            src={message.content}
            alt="AI Generated"
            className="max-w-lg rounded-lg shadow-lg"
            loading="lazy"
          />
        );
      case 'audio':
        return (
          <audio controls className="max-w-md">
            <source src={message.content} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        );
      default:
        return <p className="whitespace-pre-wrap">{message.content}</p>;
    }
  };

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`p-2 rounded-lg ${isUser
          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
        }`}>
        {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
      </div>

      <div className={`flex-1 ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block max-w-[85%] p-4 rounded-xl ${isUser
            ? 'bg-primary-600 text-white'
            : 'bg-white dark:bg-dark-card text-gray-900 dark:text-white'
          }`}>
          {renderContent()}
        </div>
        {message.model && (
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            via {message.model}
          </div>
        )}
      </div>
    </div>
  );
}