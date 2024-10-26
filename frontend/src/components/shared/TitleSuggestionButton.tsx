import React, { useState } from 'react';
import { Sparkles, Loader } from 'lucide-react';
import { namingService } from '../../services/ai/namingService';

interface TitleSuggestionButtonProps {
  content?: string;
  description?: string;
  title?: string;
  type: 'note' | 'idea' | 'task' | 'reminder';
  onSuggestion: (title: string) => void;
  disabled?: boolean;
  context?: {
    currentTitle?: string;
    tags?: string[];
    dueDate?: string;
    priority?: string;
  };
}

export function TitleSuggestionButton({ 
  content,
  description,
  title,
  type, 
  onSuggestion, 
  disabled,
  context 
}: TitleSuggestionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateTitle = async () => {
    // Combine all available content for context
    const combinedContent = [
      description,
      content,
      title
    ].filter(Boolean).join('\n\n');

    if (!combinedContent.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const suggestion = await namingService.generateTitle(combinedContent, type, context);
      onSuggestion(suggestion);
    } catch (error) {
      console.error('Failed to generate title:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if there's any content to generate from
  const hasContent = Boolean(content?.trim() || description?.trim() || title?.trim());

  return (
    <button
      type="button"
      onClick={handleGenerateTitle}
      disabled={disabled || isLoading || !hasContent}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isLoading ? (
        <>
          <Loader className="w-4 h-4 animate-spin" />
          <span>Generating...</span>
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4" />
          <span>Suggest Title</span>
        </>
      )}
    </button>
  );
}