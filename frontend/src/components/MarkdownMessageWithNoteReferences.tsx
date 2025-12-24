import { MarkdownMessage } from './MarkdownMessage';

interface MarkdownMessageWithNoteReferencesProps {
  content: string;
  showCursor?: boolean;
}

/**
 * Markdown message component that handles [[noteId|title]] note references.
 * Note: The actual rendering is now handled in MarkdownMessage.tsx directly,
 * which converts [[id|title]] to links and renders them inline within markdown.
 * This component is kept for backwards compatibility.
 */
export function MarkdownMessageWithNoteReferences({
  content,
  showCursor = false,
}: MarkdownMessageWithNoteReferencesProps) {
  return <MarkdownMessage content={content} showCursor={showCursor} />;
}

