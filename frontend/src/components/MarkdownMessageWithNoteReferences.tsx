import { MarkdownMessage } from './MarkdownMessage';
import { InlineNoteReference } from '../features/chat/components/InlineNoteReference';
import { splitTextWithNoteReferences } from '../utils/note-reference-utils';

interface MarkdownMessageWithNoteReferencesProps {
  content: string;
  showCursor?: boolean;
}

/**
 * Enhanced markdown message component that detects and renders note references
 * as interactive components instead of plain text IDs.
 * 
 * Parses patterns like: (ID: note-id) or "Note Title" (ID: note-id)
 * and renders them as expandable note cards.
 */
export function MarkdownMessageWithNoteReferences({
  content,
  showCursor = false,
}: MarkdownMessageWithNoteReferencesProps) {
  const segments = splitTextWithNoteReferences(content);

  // If no note references, just render regular markdown
  if (segments.length === 1 && segments[0].type === 'text') {
    return <MarkdownMessage content={content} showCursor={showCursor} />;
  }

  // Render mixed content with note references
  return (
    <span className="markdown-with-note-references inline-flex flex-wrap items-baseline gap-1">
      {segments.map((segment, index) => {
        if (segment.type === 'note-reference' && segment.noteId) {
          return (
            <InlineNoteReference
              key={`${segment.noteId}-${index}`}
              noteId={segment.noteId}
              noteTitle={segment.noteTitle}
            />
          );
        }

        // For text segments, render markdown
        // We need to handle cursor only on the last text segment
        const isLastTextSegment =
          index === segments.length - 1 ||
          !segments.slice(index + 1).some((s) => s.type === 'text');

        return (
          <span key={`text-${index}`} className="inline">
            <MarkdownMessage
              content={segment.content}
              showCursor={isLastTextSegment && showCursor}
            />
          </span>
        );
      })}
    </span>
  );
}

