import { Message } from '../../../../types/message';
import { ThoughtProcess } from '../ThoughtProcess';
import { useAI } from '../../../../contexts/AIContext';
import { Settings2 } from 'lucide-react';

interface FunctionContentProps {
  message: Message;
  isStreaming?: boolean;
  themeColor: string;
}

export function FunctionContent({ message, isStreaming, themeColor }: FunctionContentProps) {
  const { executionSteps } = useAI();
  
  // Get steps from both sources and combine them
  const messageSteps = message.executionSteps || [];
  const contextSteps = executionSteps[message.id] || [];
  const steps = [...messageSteps, ...contextSteps];

  console.log('[FunctionContent] Rendering with:', {
    messageId: message.id,
    messageSteps,
    contextSteps,
    combinedSteps: steps,
    isStreaming
  });

  if (steps.length === 0 && isStreaming) {
    return (
      <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 py-4">
        <Settings2 className="w-4 h-4 animate-spin" />
        <span>Processing...</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      <ThoughtProcess
        steps={steps}
        isComplete={!isStreaming}
        themeColor={themeColor}
      />
    </div>
  );
} 