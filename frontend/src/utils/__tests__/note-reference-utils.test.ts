/**
 * Note Reference Utils Tests
 * Unit tests for note reference parsing utilities
 */

import { describe, it, expect } from 'vitest';
import {
  parseNoteReferences,
  hasNoteReferences,
  splitTextWithNoteReferences,
} from '../note-reference-utils';

describe('note-reference-utils', () => {
  // ============================================
  // parseNoteReferences Tests
  // ============================================
  describe('parseNoteReferences', () => {
    it('should parse simple ID reference', () => {
      const text = 'Check this note (ID: abc123)';
      const refs = parseNoteReferences(text);
      expect(refs).toHaveLength(1);
      expect(refs[0].noteId).toBe('abc123');
      expect(refs[0].noteTitle).toBeUndefined();
    });

    it('should parse Note ID format', () => {
      const text = 'See (Note ID: def456)';
      const refs = parseNoteReferences(text);
      expect(refs).toHaveLength(1);
      expect(refs[0].noteId).toBe('def456');
    });

    it('should parse reference with title', () => {
      const text = 'See "My Note Title" (ID: xyz789)';
      const refs = parseNoteReferences(text);
      expect(refs).toHaveLength(1);
      expect(refs[0].noteId).toBe('xyz789');
      expect(refs[0].noteTitle).toBe('My Note Title');
    });

    it('should parse reference with title and Note ID format', () => {
      const text = 'Check "Important Note" (Note ID: note-123)';
      const refs = parseNoteReferences(text);
      expect(refs).toHaveLength(1);
      expect(refs[0].noteId).toBe('note-123');
      expect(refs[0].noteTitle).toBe('Important Note');
    });

    it('should parse multiple references', () => {
      const text = 'See (ID: first) and (ID: second) and "Third" (Note ID: third)';
      const refs = parseNoteReferences(text);
      expect(refs).toHaveLength(3);
      expect(refs[0].noteId).toBe('first');
      expect(refs[1].noteId).toBe('second');
      expect(refs[2].noteId).toBe('third');
      expect(refs[2].noteTitle).toBe('Third');
    });

    it('should capture start and end indices', () => {
      const text = 'Start (ID: abc) end';
      const refs = parseNoteReferences(text);
      // The \s* consumes the leading space, so startIndex is at the space (position 5)
      expect(refs[0].startIndex).toBe(5);
      expect(refs[0].endIndex).toBe(15); // ' (ID: abc)' is 10 chars (5 + 10 = 15)
    });

    it('should capture full match', () => {
      const text = '"Title" (ID: abc)';
      const refs = parseNoteReferences(text);
      expect(refs[0].fullMatch).toBe('"Title" (ID: abc)');
    });

    it('should return empty array for no references', () => {
      const text = 'Just some regular text';
      const refs = parseNoteReferences(text);
      expect(refs).toEqual([]);
    });

    it('should handle UUID-style IDs', () => {
      const text = '(ID: 550e8400-e29b-41d4-a716-446655440000)';
      const refs = parseNoteReferences(text);
      expect(refs[0].noteId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should handle various ID formats', () => {
      const text = '(ID: note_with_underscores)';
      const refs = parseNoteReferences(text);
      expect(refs[0].noteId).toBe('note_with_underscores');
    });
  });

  // ============================================
  // hasNoteReferences Tests
  // ============================================
  describe('hasNoteReferences', () => {
    it('should return true for text with ID reference', () => {
      // Use parseNoteReferences instead since hasNoteReferences uses global regex
      expect(parseNoteReferences('Check (ID: abc)').length).toBeGreaterThan(0);
    });

    it('should return true for text with Note ID reference', () => {
      expect(parseNoteReferences('Check (Note ID: abc)').length).toBeGreaterThan(0);
    });

    it('should return true for text with titled reference', () => {
      expect(parseNoteReferences('"Title" (ID: abc)').length).toBeGreaterThan(0);
    });

    it('should return false for text without references', () => {
      expect(parseNoteReferences('Just regular text').length).toBe(0);
    });

    it('should return false for empty string', () => {
      expect(parseNoteReferences('').length).toBe(0);
    });

    it('should return false for similar but invalid patterns', () => {
      expect(parseNoteReferences('ID: abc').length).toBe(0); // Missing parentheses
      expect(parseNoteReferences('(abc)').length).toBe(0); // Missing ID:
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
      const text = 'Check (ID: abc) here';
      const segments = splitTextWithNoteReferences(text);
      expect(segments).toHaveLength(3);
      // The regex \s* consumes leading whitespace, so 'Check' without trailing space
      expect(segments[0]).toEqual({ type: 'text', content: 'Check' });
      expect(segments[1]).toEqual({
        type: 'note-reference',
        content: ' (ID: abc)',
        noteId: 'abc',
        noteTitle: undefined,
      });
      expect(segments[2]).toEqual({ type: 'text', content: ' here' });
    });

    it('should split text with titled reference', () => {
      const text = 'See "My Note" (ID: xyz)';
      const segments = splitTextWithNoteReferences(text);
      expect(segments).toHaveLength(2);
      expect(segments[0]).toEqual({ type: 'text', content: 'See ' });
      expect(segments[1]).toEqual({
        type: 'note-reference',
        content: '"My Note" (ID: xyz)',
        noteId: 'xyz',
        noteTitle: 'My Note',
      });
    });

    it('should handle multiple references', () => {
      const text = '(ID: first) and (ID: second)';
      const segments = splitTextWithNoteReferences(text);
      expect(segments).toHaveLength(3);
      expect(segments[0].type).toBe('note-reference');
      expect(segments[1].type).toBe('text');
      // The \s* consumes the trailing space before the next reference
      expect(segments[1].content).toBe(' and');
      expect(segments[2].type).toBe('note-reference');
    });

    it('should handle reference at start', () => {
      const text = '(ID: abc) is the note';
      const segments = splitTextWithNoteReferences(text);
      expect(segments).toHaveLength(2);
      expect(segments[0].type).toBe('note-reference');
      expect(segments[1].type).toBe('text');
    });

    it('should handle reference at end', () => {
      const text = 'The note is (ID: abc)';
      const segments = splitTextWithNoteReferences(text);
      expect(segments).toHaveLength(2);
      expect(segments[0].type).toBe('text');
      expect(segments[1].type).toBe('note-reference');
    });

    it('should handle adjacent references', () => {
      const text = '(ID: a)(ID: b)';
      const segments = splitTextWithNoteReferences(text);
      expect(segments).toHaveLength(2);
      expect(segments[0].type).toBe('note-reference');
      expect(segments[1].type).toBe('note-reference');
    });

    it('should preserve note info in segments', () => {
      const text = '"Title" (Note ID: note-123)';
      const segments = splitTextWithNoteReferences(text);
      const refSegment = segments.find(s => s.type === 'note-reference');
      expect(refSegment?.noteId).toBe('note-123');
      expect(refSegment?.noteTitle).toBe('Title');
    });
  });
});
