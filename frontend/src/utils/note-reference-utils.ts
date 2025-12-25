/**
 * Utilities for parsing note references in agent responses.
 *
 * All AI models are instructed to use the format: [[noteId|Note Title]]
 * This is a simple, unambiguous format that's easy to parse.
 */

export interface NoteReference {
  noteId: string;
  noteTitle?: string;
  startIndex: number;
  endIndex: number;
  fullMatch: string;
}

// UUID pattern (hex with dashes)
const UUID_PATTERN = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';

// Standard format: [[noteId|Note Title]]
const NOTE_REF_PATTERN = new RegExp(`\\[\\[(${UUID_PATTERN})\\|([^\\]]+)\\]\\]`, 'gi');

/**
 * Parse note references from text.
 */
export function parseNoteReferences(text: string): NoteReference[] {
  const references: NoteReference[] = [];
  const regex = new RegExp(NOTE_REF_PATTERN.source, 'gi');
  let match;

  while ((match = regex.exec(text)) !== null) {
    references.push({
      noteId: match[1],
      noteTitle: match[2],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      fullMatch: match[0],
    });
  }

  return references;
}

/**
 * Check if text contains note references.
 */
export function hasNoteReferences(text: string): boolean {
  return NOTE_REF_PATTERN.test(text);
}

/**
 * Split text into segments, separating note references from regular text.
 * This allows us to render note references as components while keeping
 * the rest as markdown.
 * 
 * @param text - The text to split
 * @returns Array of segments with their type
 */
export interface TextSegment {
  type: 'text' | 'note-reference';
  content: string;
  noteId?: string;
  noteTitle?: string;
}

export function splitTextWithNoteReferences(text: string): TextSegment[] {
  const references = parseNoteReferences(text);

  if (references.length === 0) {
    return [{ type: 'text', content: text }];
  }

  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const ref of references) {
    // Add text before the reference
    if (ref.startIndex > lastIndex) {
      const textBefore = text.substring(lastIndex, ref.startIndex);
      if (textBefore) {
        segments.push({ type: 'text', content: textBefore });
      }
    }

    // Add the note reference
    segments.push({
      type: 'note-reference',
      content: ref.fullMatch,
      noteId: ref.noteId,
      noteTitle: ref.noteTitle,
    });

    lastIndex = ref.endIndex;
  }

  // Add remaining text after the last reference
  if (lastIndex < text.length) {
    const textAfter = text.substring(lastIndex);
    if (textAfter) {
      segments.push({ type: 'text', content: textAfter });
    }
  }

  return segments;
}

