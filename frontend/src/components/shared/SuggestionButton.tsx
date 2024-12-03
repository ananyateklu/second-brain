import { useState } from 'react';
import { Sparkles, Loader } from 'lucide-react';
import { contentSuggestionService } from '../../services/ai/contentSuggestionService';

interface SuggestionButtonProps {
  type: 'title' | 'content' | 'tags';
  itemType: 'note' | 'idea' | 'task' | 'reminder';
  input: {
    title?: string;
    content?: string;
    description?: string;
  };
  onSuggestion: (suggestion: string | string[]) => void;
  disabled?: boolean;
  context?: {
    currentTitle?: string;
    currentContent?: string;
    currentTags?: string[];
    tags?: string[];
    dueDate?: string;
    priority?: string;
  };
}

export function SuggestionButton({ 
  type,
  itemType,
  input,
  onSuggestion,
  disabled,
  context
}: SuggestionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateSuggestion = async () => {
    if (type === 'tags') {
      if (!input.title && !input.content) return;
    } else {
      const combinedContent = [
        input.description,
        input.content,
        input.title
      ].filter(Boolean).join('\n\n');

      if (!combinedContent.trim() || isLoading) return;
    }

    setIsLoading(true);
    try {
      let suggestion;
      switch (type) {
        case 'title':
          suggestion = await contentSuggestionService.generateTitle(
            [input.description, input.content, input.title].filter(Boolean).join('\n\n'),
            itemType,
            context
          );
          break;
        case 'content':
          suggestion = await contentSuggestionService.generateContent(
            input.title || '',
            itemType,
            context
          );
          break;
        case 'tags':
          suggestion = await contentSuggestionService.generateTags(
            { 
              title: input.title || '', 
              content: [input.description, input.content].filter(Boolean).join('\n\n')
            },
            itemType,
            { currentTags: context?.currentTags }
          );
          break;
      }
      onSuggestion(suggestion);
    } catch (error) {
      console.error('Failed to generate suggestion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasContent = type === 'tags' 
    ? Boolean(input.title || input.content || input.description)
    : Boolean(input.content?.trim() || input.description?.trim() || input.title?.trim());

  const getButtonText = () => {
    switch (type) {
      case 'title':
        return 'Suggest Title';
      case 'content':
        return 'Suggest Content';
      case 'tags':
        return 'Suggest Tags';
      default:
        return 'Generate';
    }
  };

  return (
    <button
      type="button"
      onClick={handleGenerateSuggestion}
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
          <span>{getButtonText()}</span>
        </>
      )}
    </button>
  );
}