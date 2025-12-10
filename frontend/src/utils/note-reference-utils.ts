/**
 * Utilities for parsing and handling note references in agent responses.
 * 
 * The agent outputs note IDs in the format: (ID: note-id)
 * We parse these and render them as interactive note cards.
 */

export interface NoteReference {
  noteId: string;
  noteTitle?: string;
  startIndex: number;
  endIndex: number;
  fullMatch: string;
}

/**
 * Regex to match note ID patterns in agent responses.
 * Matches: (ID: xxx), (Note ID: xxx), or "Note Title" (ID: xxx) or "Note Title" (Note ID: xxx)
 * Updated to match any non-whitespace characters as note IDs (more flexible than just hex UUIDs)
 */
const NOTE_ID_PATTERN = /(?:"([^"]+)")?\s*\((?:Note\s+)?ID:\s*([^\s)]+)\)/gi;

/**
 * Parse note references from text.
 * 
 * @param text - The text to parse
 * @returns Array of note references found
 */
export function parseNoteReferences(text: string): NoteReference[] {
  const references: NoteReference[] = [];
  const regex = new RegExp(NOTE_ID_PATTERN.source, 'gi');
  let match;

  while ((match = regex.exec(text)) !== null) {
    const fullMatch = match[0];
    const noteTitle = match[1]; // Captured title (if present)
    const noteId = match[2]; // Captured ID

    references.push({
      noteId,
      noteTitle,
      startIndex: match.index,
      endIndex: match.index + fullMatch.length,
      fullMatch,
    });
  }

  return references;
}

/**
 * Check if text contains note references.
 * 
 * @param text - The text to check
 * @returns True if note references are found
 */
export function hasNoteReferences(text: string): boolean {
  return NOTE_ID_PATTERN.test(text);
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

