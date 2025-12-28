/**
 * Note Reference Utils Tests
 * Unit tests for note reference parsing utilities
 *
 * Format: [[uuid|Note Title]]
 */

import { describe, it, expect } from 'vitest';
import {
  parseNoteReferences,
  hasNoteReferences,
  splitTextWithNoteReferences,
} from '../note-reference-utils';

// Sample UUIDs for testing
const UUID1 = '550e8400-e29b-41d4-a716-446655440000';
const UUID2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const UUID3 = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

describe('note-reference-utils', () => {
  // ============================================
  // parseNoteReferences Tests
  // ============================================
  describe('parseNoteReferences', () => {
    it('should parse simple reference with title', () => {
      const text = `Check this note [[${UUID1}|My Note Title]]`;
      const refs = parseNoteReferences(text);
      expect(refs).toHaveLength(1);
      expect(refs[0].noteId).toBe(UUID1);
      expect(refs[0].noteTitle).toBe('My Note Title');
    });

    it('should parse reference with special characters in title', () => {
      const text = `See [[${UUID1}|Note with "quotes" & symbols!]]`;
      const refs = parseNoteReferences(text);
      expect(refs).toHaveLength(1);
      expect(refs[0].noteId).toBe(UUID1);
      expect(refs[0].noteTitle).toBe('Note with "quotes" & symbols!');
    });

    it('should parse multiple references', () => {
      const text = `See [[${UUID1}|First Note]] and [[${UUID2}|Second Note]] and [[${UUID3}|Third Note]]`;
      const refs = parseNoteReferences(text);
      expect(refs).toHaveLength(3);
      expect(refs[0].noteId).toBe(UUID1);
      expect(refs[0].noteTitle).toBe('First Note');
      expect(refs[1].noteId).toBe(UUID2);
      expect(refs[1].noteTitle).toBe('Second Note');
      expect(refs[2].noteId).toBe(UUID3);
      expect(refs[2].noteTitle).toBe('Third Note');
    });

    it('should capture start and end indices', () => {
      const text = `Start [[${UUID1}|Test]] end`;
      const refs = parseNoteReferences(text);
      expect(refs[0].startIndex).toBe(6);
      expect(refs[0].endIndex).toBe(6 + `[[${UUID1}|Test]]`.length);
    });

    it('should capture full match', () => {
      const text = `[[${UUID1}|Title]]`;
      const refs = parseNoteReferences(text);
      expect(refs[0].fullMatch).toBe(`[[${UUID1}|Title]]`);
    });

    it('should return empty array for no references', () => {
      const text = 'Just some regular text';
      const refs = parseNoteReferences(text);
      expect(refs).toEqual([]);
    });

    it('should handle reference at start of text', () => {
      const text = `[[${UUID1}|First]] is the beginning`;
      const refs = parseNoteReferences(text);
      expect(refs).toHaveLength(1);
      expect(refs[0].startIndex).toBe(0);
    });

    it('should handle reference at end of text', () => {
      const text = `The note is [[${UUID1}|Last]]`;
      const refs = parseNoteReferences(text);
      expect(refs).toHaveLength(1);
      expect(refs[0].noteTitle).toBe('Last');
    });

    it('should not match invalid UUID format', () => {
      const text = '[[not-a-uuid|Title]]';
      const refs = parseNoteReferences(text);
      expect(refs).toEqual([]);
    });

    it('should not match malformed references', () => {
      expect(parseNoteReferences(`[${UUID1}|Title]`)).toEqual([]); // Single brackets
      expect(parseNoteReferences(`[[${UUID1}]]`)).toEqual([]); // No pipe/title
      expect(parseNoteReferences(`[[|Title]]`)).toEqual([]); // No UUID
    });
  });

  // ============================================
  // hasNoteReferences Tests
  // ============================================
  describe('hasNoteReferences', () => {
    it('should return true for text with reference', () => {
      expect(hasNoteReferences(`Check [[${UUID1}|Note]]`)).toBe(true);
    });

    it('should return true for text with multiple references', () => {
      expect(hasNoteReferences(`[[${UUID1}|One]] and [[${UUID2}|Two]]`)).toBe(true);
    });

    it('should return false for text without references', () => {
      expect(hasNoteReferences('Just regular text')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(hasNoteReferences('')).toBe(false);
    });

    it('should return false for similar but invalid patterns', () => {
      expect(hasNoteReferences('[abc|Title]')).toBe(false); // Single brackets
      expect(hasNoteReferences('[[abc|Title]]')).toBe(false); // Invalid UUID
    });
  });

  // ============================================
  // splitTextWithNoteReferences Tests
  // ============================================
  describe('splitTextWithNoteReferences', () => {
    it('should return single text segment for no references', () => {
      const text = 'Just plain text';
      const segments = splitTextWithNoteReferences(text);
      expect(segments).toHaveLength(1);
      expect(segments[0].type).toBe('text');
      expect(segments[0].content).toBe('Just plain text');
    });

    it('should split text with one reference', () => {
      const text = `Check [[${UUID1}|Note]] here`;
      const segments = splitTextWithNoteReferences(text);
      expect(segments).toHaveLength(3);
      expect(segments[0]).toEqual({ type: 'text', content: 'Check ' });
      expect(segments[1]).toEqual({
        type: 'note-reference',
        content: `[[${UUID1}|Note]]`,
        noteId: UUID1,
        noteTitle: 'Note',
      });
      expect(segments[2]).toEqual({ type: 'text', content: ' here' });
    });

    it('should split text with titled reference', () => {
      const text = `See [[${UUID1}|My Note Title]]`;
      const segments = splitTextWithNoteReferences(text);
      expect(segments).toHaveLength(2);
      expect(segments[0]).toEqual({ type: 'text', content: 'See ' });
      expect(segments[1]).toEqual({
        type: 'note-reference',
        content: `[[${UUID1}|My Note Title]]`,
        noteId: UUID1,
        noteTitle: 'My Note Title',
      });
    });

    it('should handle multiple references', () => {
      const text = `[[${UUID1}|First]] and [[${UUID2}|Second]]`;
      const segments = splitTextWithNoteReferences(text);
      expect(segments).toHaveLength(3);
      expect(segments[0].type).toBe('note-reference');
      expect(segments[0].noteId).toBe(UUID1);
      expect(segments[1].type).toBe('text');
      expect(segments[1].content).toBe(' and ');
      expect(segments[2].type).toBe('note-reference');
      expect(segments[2].noteId).toBe(UUID2);
    });

    it('should handle reference at start', () => {
      const text = `[[${UUID1}|First]] is the note`;
      const segments = splitTextWithNoteReferences(text);
      expect(segments).toHaveLength(2);
      expect(segments[0].type).toBe('note-reference');
      expect(segments[1].type).toBe('text');
    });

    it('should handle reference at end', () => {
      const text = `The note is [[${UUID1}|Last]]`;
      const segments = splitTextWithNoteReferences(text);
      expect(segments).toHaveLength(2);
      expect(segments[0].type).toBe('text');
      expect(segments[1].type).toBe('note-reference');
    });

    it('should handle adjacent references', () => {
      const text = `[[${UUID1}|A]][[${UUID2}|B]]`;
      const segments = splitTextWithNoteReferences(text);
      expect(segments).toHaveLength(2);
      expect(segments[0].type).toBe('note-reference');
      expect(segments[1].type).toBe('note-reference');
    });

    it('should preserve note info in segments', () => {
      const text = `[[${UUID1}|Important Title]]`;
      const segments = splitTextWithNoteReferences(text);
      const refSegment = segments.find(s => s.type === 'note-reference');
      expect(refSegment?.noteId).toBe(UUID1);
      expect(refSegment?.noteTitle).toBe('Important Title');
    });
  });
});
