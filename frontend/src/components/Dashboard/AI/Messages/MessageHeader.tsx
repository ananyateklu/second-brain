import React from 'react';
import { BotMessageSquareIcon, UserCircle } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { Message } from '../../../../types/message';

interface MessageHeaderProps {
  message: Message;
  isUser: boolean;
}

export function MessageHeader({ message, isUser }: MessageHeaderProps) {
  const { user } = useAuth();
  const assistantThemeColor = message.model?.color || '#6B7280';

  return (
    <div className={`flex items-center pb-1 gap-2 mb-1 ${isUser ? 'flex-row-reverse' : ''}`}>
      {isUser ? (
        <>
          {user?.avatar && (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-6 h-6 rounded-full border"
              style={{ borderColor: `${assistantThemeColor}`, borderWidth: '1px' }}
            />
          )}
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {user?.name}
          </span>
        </>
      ) : (
        <>
          <BotMessageSquareIcon className="w-4 h-4" style={{ color: assistantThemeColor }} />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {message.model?.name || 'Assistant'}
          </span>
        </>
      )}
    </div>
  );
} 