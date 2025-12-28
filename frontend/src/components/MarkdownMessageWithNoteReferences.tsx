import { UnifiedMarkdownRenderer } from './UnifiedMarkdownRenderer';

interface MarkdownMessageWithNoteReferencesProps {
  content: string;
  showCursor?: boolean;
  isStreaming?: boolean;
}

/**
 * Markdown message component that handles [[noteId|title]] note references.
 * Uses UnifiedMarkdownRenderer to switch between custom and llm-ui renderers
 * based on user preference.
 */
export function MarkdownMessageWithNoteReferences({
  content,
  showCursor = false,
  isStreaming = false,
}: MarkdownMessageWithNoteReferencesProps) {
  return (
    <UnifiedMarkdownRenderer
      content={content}
      showCursor={showCursor}
      isStreaming={isStreaming}
    />
  );
}

