import React, { useState, useEffect } from 'react';
import { Bot, User, Copy, Check, Sparkles, MessageSquare, Image, Mic, Settings2, Download, Brain, Terminal, Database, CheckCircle, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CodeBlock } from './CodeBlock';
import { useAuth } from '../../../contexts/AuthContext';
import { AIModel, ExecutionStep } from '../../../types/ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ImageGenerationLoading } from './ImageGenerationLoading';
import { ThoughtProcess } from './ThoughtProcess';
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import { useAI } from '../../../contexts/AIContext';


interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string | Blob | number[];
  type: 'text' | 'image' | 'audio' | 'embedding' | 'code' | 'function';
  timestamp: string;
  model?: AIModel;
  isLoading?: boolean;
  executionSteps?: ExecutionStep[];
  language?: string;
  inputText?: string;
}

interface AIMessageProps {
  message: Message;
  themeColor: string;
  isStreaming?: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
}

export function AIMessage({
  message,
  themeColor,
  isStreaming,
  isFirstInGroup,
  isLastInGroup
}: AIMessageProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied'>('idle');
  const isUser = message.role === 'user';
  const { user } = useAuth();
  const assistantThemeColor = message.model?.color || '#6B7280';
  const [progress, setProgress] = useState(0);
  const { executionSteps } = useAI();

  // Combine steps from both sources
  const messageSteps = message.executionSteps || executionSteps[message.id] || [];

  // Show thought process only for function category and when steps exist
  const shouldShowThoughtProcess = !isUser &&
    message.model?.category === 'function' &&
    messageSteps.length > 0;

  console.log('[AIMessage] Rendering message:', {
    id: message.id,
    steps: messageSteps,
    shouldShow: shouldShowThoughtProcess,
    isStreaming
  });

  const getModelIcon = () => {
    const modelColor = message.model?.color || '#6B7280';
    const iconClass = "w-6 h-6 ml-2"; // Consistent icon size

    switch (message.model?.category) {
      case 'chat':
        return message.model.provider === 'anthropic' ? (
          <Sparkles className={iconClass} style={{ color: modelColor }} />
        ) : (
          <MessageSquare className={iconClass} style={{ color: modelColor }} />
        );
      case 'image':
        return <Image className={iconClass} style={{ color: modelColor }} />;
      case 'audio':
        return <Mic className={iconClass} style={{ color: modelColor }} />;
      case 'function':
        return <Settings2 className={iconClass} style={{ color: modelColor }} />;
      default:
        return <Bot className={iconClass} style={{ color: modelColor }} />;
    }
  };

  const handleCopy = async () => {
    if (copyState !== 'idle') return;

    setCopyState('copying');

    try {
      // Copy to clipboard
      await navigator.clipboard.writeText(message.content);

      // Force minimum duration for loading state
      await new Promise(resolve => setTimeout(resolve, 500));

      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch (error) {
      setCopyState('idle');
    }
  };

  const getCopyButtonContent = () => {
    switch (copyState) {
      case 'copying':
        return (
          <motion.div
            className="w-3.5 h-3.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <svg
              className="animate-spin"
              viewBox="0 0 24 24"
              style={{ color: themeColor }}
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </motion.div>
        );
      case 'copied':
        return <Check className="w-3.5 h-3.5" style={{ color: themeColor }} />;
      default:
        return <Copy className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />;
    }
  };

  const handleDownloadAudio = async () => {
    if (!message.content) return;

    try {
      // Create blob URL if content is a blob
      const blobUrl = typeof message.content === 'string'
        ? message.content
        : URL.createObjectURL(message.content);

      // Create temporary link
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `audio-${message.id}.mp3`; // or appropriate extension
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL
      if (typeof message.content !== 'string') {
        URL.revokeObjectURL(blobUrl);
      }
    } catch (error) {
      console.error('Error downloading audio:', error);
    }
  };

  const renderContent = () => {
    if (message.model?.category === 'function' && message.role === 'assistant') {
      const steps = executionSteps[message.id] || [];

      console.log('[AIMessage] Function message steps:', {
        messageId: message.id,
        steps,
        stepsFromContext: executionSteps,
        isStreaming,
        isComplete: !isStreaming && steps.length > 0
      });

      // Always show steps if we have them
      if (steps.length > 0) {
        return (
          <div className="w-full space-y-2">
            {steps.map((step, index) => (
              <motion.div
                key={`${step.type}-${step.timestamp}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`
                  flex items-start gap-3 p-3 rounded-lg
                  ${index === steps.length - 1 && isStreaming
                    ? 'bg-white/70 dark:bg-gray-800/70 animate-pulse'
                    : 'bg-white/50 dark:bg-gray-800/50'}
                  border border-gray-200/30 dark:border-gray-700/30
                `}
              >
                <div className="flex-shrink-0 mt-1">
                  {getStepIcon(step.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">
                      {step.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(step.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {step.content}
                  </div>

                  {step.metadata && Object.keys(step.metadata).length > 0 && (
                    <div className="mt-2 max-w-full">
                      <div className="relative">
                        <pre className="text-xs bg-gray-100 dark:bg-gray-900 rounded p-2">
                          <code className="block custom-scrollbar overflow-x-auto whitespace-pre">
                            {JSON.stringify(step.metadata, null, 2)}
                          </code>
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {isStreaming && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 py-2"
              >
                <Settings2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Processing...</span>
              </motion.div>
            )}
          </div>
        );
      }

      // Show loading state if we're streaming but have no steps yet
      if (isStreaming) {
        return (
          <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 py-2">
            <Settings2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Processing...</span>
          </div>
        );
      }
    }

    // Handle embeddings
    if (message.type === 'embedding') {
      try {
        // Parse the embedding data if it's a string
        const embeddingData = typeof message.content === 'string'
          ? JSON.parse(message.content)
          : message.content;

        // Ensure it's an array
        const embeddings = Array.isArray(embeddingData)
          ? embeddingData
          : embeddingData.embeddings || [];

        return (
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Embedding Vector ({embeddings.length} dimensions)
            </div>

            {/* Embedding Visualization */}
            <div className="relative overflow-hidden rounded-lg 
              border border-gray-200/30 dark:border-gray-700/30
              bg-white/50 dark:bg-gray-800/50 
              backdrop-blur-sm p-4">

              {/* Vector Preview */}
              <div className="text-xs font-mono overflow-x-auto whitespace-nowrap
                text-gray-600 dark:text-gray-400">
                [{embeddings.slice(0, 10).map(n => n.toFixed(6)).join(', ')}
                {embeddings.length > 10 ? ', ...' : ''}]
              </div>

              {/* Visual representation */}
              <div className="mt-3 h-20 flex items-end gap-px">
                {embeddings.slice(0, 100).map((value, index) => (
                  <div
                    key={index}
                    className="flex-1 bg-gradient-to-t from-gray-200/50 to-gray-300/50 
                      dark:from-gray-700/50 dark:to-gray-600/50 
                      rounded-t transition-all duration-200 hover:opacity-80"
                    style={{
                      height: `${Math.abs(value) * 100}%`,
                      backgroundColor: value > 0 ? themeColor : undefined,
                      opacity: value > 0 ? 0.5 : undefined
                    }}
                  />
                ))}
              </div>

              {/* Stats */}
              <div className="mt-3 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Dimensions: {embeddings.length}</span>
                <span>Range: [{Math.min(...embeddings).toFixed(6)}, {Math.max(...embeddings).toFixed(6)}]</span>
              </div>
            </div>

            {/* Download Button */}
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(embeddings)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `embedding-${message.id}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md
                text-sm text-gray-600 dark:text-gray-300
                hover:bg-gray-100 dark:hover:bg-gray-700/50
                border border-gray-200/30 dark:border-gray-700/30
                transition-colors duration-200"
            >
              <Download className="w-4 h-4" />
              Download Embedding
            </button>
          </div>
        );
      } catch (error) {
        console.error('Error rendering embedding:', error);
        return (
          <div className="text-red-500 dark:text-red-400">
            Error displaying embedding data
          </div>
        );
      }
    }

    // Special handling for audio generation
    if (message.model?.category === 'audio' && message.role === 'assistant') {
      return (
        <div className="w-full space-y-2">
          {message.isLoading ? (
            // Loading state
            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
              <div className="w-4 h-4 relative">
                <div
                  className="absolute inset-0 border-2 border-current rounded-full animate-spin"
                  style={{ borderTopColor: 'transparent' }}
                />
              </div>
              <span>Generating audio...</span>
            </div>
          ) : (
            // Audio player
            <div className="audio-player-wrapper rounded-lg overflow-hidden">
              <AudioPlayer
                src={typeof message.content === 'string'
                  ? message.content
                  : URL.createObjectURL(message.content)}
                onPlay={e => console.log("Playing")}
                showJumpControls={false}
                customVolumeControls={[]}
                customAdditionalControls={[
                  <button
                    key="download"
                    onClick={handleDownloadAudio}
                    className="p-2 rounded-full 
                      hover:bg-gray-100/50 dark:hover:bg-gray-700/50
                      text-gray-600 dark:text-gray-300
                      transition-colors duration-200"
                    title="Download audio"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                ]}
                className="custom-audio-player"
                style={{
                  background: 'transparent',
                  boxShadow: 'none',
                  width: '100%',
                  minWidth: '300px',
                  maxWidth: '400px'
                }}
              />
            </div>
          )}

          {/* Show input text if available */}
          {message.inputText && (
            <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              <span className="font-medium text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Text:
              </span>
              <p className="mt-1">{message.inputText}</p>
            </div>
          )}
        </div>
      );
    }

    // Handle other message types...
    switch (message.type) {
      case 'image':
        if (message.isLoading) {
          return <ImageGenerationLoading progress={message.progress || 0} />;
        }
        return (
          <img
            src={message.content}
            alt="AI Generated"
            className="max-w-lg rounded-lg shadow-lg animate-fade-in"
            loading="lazy"
          />
        );
      case 'function':
        return (
          <ThoughtProcess
            steps={message.executionSteps || []}
            isComplete={!isStreaming}
            themeColor={themeColor}
          />
        );
      default:
        return (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <CodeBlock
                    code={String(children)}
                    language={match[1]}
                    themeColor={themeColor}
                  />
                ) : (
                  <code className="px-1.5 py-0.5 rounded-md 
                    bg-black/10 dark:bg-white/10 
                    text-gray-800 dark:text-gray-200
                    text-xs font-mono" {...props}>
                    {children}
                  </code>
                );
              },
              p: ({ children }) => (
                <p className="mb-2 last:mb-0 text-gray-900 dark:text-gray-100">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="mb-2 last:mb-0 pl-4 space-y-1 text-gray-900 dark:text-gray-100">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-2 last:mb-0 pl-4 space-y-1 text-gray-900 dark:text-gray-100">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="list-disc marker:text-gray-400 dark:marker:text-gray-500 text-gray-900 dark:text-gray-100">
                  {children}
                </li>
              ),
              a: ({ children, href }) => (
                <a href={href}
                  className="text-primary-600 dark:text-primary-400 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer">
                  {children}
                </a>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-gray-900 dark:text-white">
                  {children}
                </strong>
              ),
              em: ({ children }) => (
                <em className="text-gray-800 dark:text-gray-200">
                  {children}
                </em>
              ),
            }}
          >
            {message.content || (isStreaming ? 'Thinking...' : '')}
          </ReactMarkdown>
        );
    }
  };

  // Don't show copy button for certain message types or when loading
  const shouldShowCopyButton =
    message.type !== 'image' &&
    message.type !== 'audio' &&
    message.type !== 'function' &&
    !message.isLoading &&
    message.content;

  return (
    <div className={`flex items-end ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-message-slide-in`}>
      <div className={`flex flex-col max-w-xs mx-2 ${isUser ? 'items-end' : 'items-start'}`}>
        {/* User/Bot Header */}
        <div className={`flex items-center ${isUser ? 'flex-row-reverse' : ''} mb-1`}>
          {isUser ? (
            <>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 mr-3">
                {user?.name || 'You'}
              </span>
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user?.name || 'You'}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <User className="w-6 h-6 mr-2" style={{ color: themeColor }} />
              )}
            </>
          ) : (
            <>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 mr-2">
                {message.model?.name || 'Assistant'}
              </span>
              {getModelIcon()}
            </>
          )}
        </div>

        {/* Message Content */}
        <div className={`relative group ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`px-4 py-2.5 rounded-2xl
            backdrop-blur-md shadow-lg
            border border-gray-200/30 dark:border-gray-700/30
            ${isUser
              ? 'bg-gradient-to-br from-primary-500/70 to-primary-600/70 text-white pl-8'
              : 'bg-gradient-to-br from-white/70 to-white/40 dark:from-gray-800/70 dark:to-gray-800/40 text-gray-900 dark:text-gray-100'
            }
            ${!isLastInGroup && isUser ? 'rounded-br-md' : ''}
            ${!isLastInGroup && !isUser ? 'rounded-bl-md' : ''}
            hover:shadow-xl transition-shadow duration-200
            text-sm
            max-w-[600px] overflow-hidden`}
            style={isUser ? {
              background: `linear-gradient(135deg, ${themeColor}70, ${themeColor}80)`
            } : undefined}
          >
            <div className="overflow-x-auto custom-scrollbar">
              {renderContent()}
            </div>
          </div>

          {/* Copy Button */}
          {shouldShowCopyButton && message.content && (
            <AnimatePresence>
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={handleCopy}
                disabled={copyState !== 'idle'}
                className={`absolute 
                  ${isUser 
                    ? '-left-2 top-1/2 -translate-y-1/2' 
                    : '-right-3 -bottom-3'
                  }
                  opacity-0 group-hover:opacity-100
                  rounded-full shadow-lg p-2
                  bg-white/50 dark:bg-gray-800/50
                  border border-gray-200/30 dark:border-gray-700/30
                  backdrop-blur-sm
                  transition-all duration-200
                  hover:scale-105 active:scale-95
                  hover:bg-white/70 dark:hover:bg-gray-800/70
                  disabled:opacity-50 disabled:cursor-not-allowed
                  z-10`}
              >
                {getCopyButtonContent()}
              </motion.button>
            </AnimatePresence>
          )}
        </div>

        {/* Timestamp */}
        {isLastInGroup && (
          <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Thought process section */}
      {shouldShowThoughtProcess && (
        <div className="ml-4 flex-1 max-w-2xl max-h-[60vh] overflow-hidden">
          <div className="flex items-center mb-1">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {message.model?.name || 'Assistant'}
            </span>
            <Bot
              className="w-6 h-6 ml-2"
              style={{ color: assistantThemeColor }}
            />
          </div>
          <div className="overflow-y-auto custom-scrollbar">
            <ThoughtProcess
              steps={messageSteps}
              isComplete={!isStreaming}
              themeColor={themeColor}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function for step icons
const getStepIcon = (type: string) => {
  switch (type) {
    case 'processing':
      return <Settings2 className="w-4 h-4 text-blue-500" />;
    case 'thinking':
      return <Brain className="w-4 h-4 text-purple-500" />;
    case 'function_call':
      return <Terminal className="w-4 h-4 text-yellow-500" />;
    case 'database_operation':
      return <Database className="w-4 h-4 text-green-500" />;
    case 'result':
      return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    default:
      return <Circle className="w-4 h-4 text-gray-500" />;
  }
};