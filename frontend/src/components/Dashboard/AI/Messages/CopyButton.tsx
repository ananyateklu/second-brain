import { useState } from 'react';
import { Copy, Check, Loader } from 'lucide-react';
import { motion } from 'framer-motion';

interface CopyButtonProps {
  content: string;
  isUser: boolean;
}

export function CopyButton({ content, isUser }: CopyButtonProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'copied'>('idle');

  const handleCopy = async () => {
    if (copyState !== 'idle') return;

    setCopyState('copying');
    try {
      await navigator.clipboard.writeText(content);
      await new Promise(resolve => setTimeout(resolve, 500));
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
      setCopyState('idle');
    }
  };

  const getIcon = () => {
    switch (copyState) {
      case 'copying':
        return <Loader className="w-4 h-4 animate-spin" />;
      case 'copied':
        return <Check className="w-4 h-4" />;
      default:
        return <Copy className="w-4 h-4" />;
    }
  };

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      onClick={handleCopy}
      disabled={copyState !== 'idle'}
      className={`absolute 
        ${isUser ? '-left-3 top-4 -translate-y-1/2' : '-right-3 -bottom-2'}
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
      {getIcon()}
    </motion.button>
  );
} 