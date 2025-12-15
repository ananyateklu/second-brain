/**
 * Notes Service Tests
 * Unit tests for notes service validation and filtering logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { notesService } from '../notes.service';
import type { Note, CreateNoteRequest } from '../../types/notes';
import { mockNotes, mockVersionHistory } from '../../test/mocks/handlers';

// Helper function to create test notes
function createTestNote(overrides: Partial<Note> = {}): Note {
    return {
        id: 'test-note-id',
        title: 'Test Note',
        content: 'Test content',
        tags: ['test-tag'],
        isArchived: false,
        createdAt: '2024-01-01T12:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
        ...overrides,
    };
}

describe('notesService', () => {
    // ============================================
    // validateNote Tests
    // ============================================
    describe('validateNote', () => {
        it('should return valid for a complete note', () => {
            // Arrange
            const input: Partial<CreateNoteRequest> = {
                title: 'Valid Title',
                content: 'Valid content',
                tags: ['tag1', 'tag2'],
            };

            // Act
            const result = notesService.validateNote(input);

            // Assert
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should return error when title is missing', () => {
            // Arrange
            const input: Partial<CreateNoteRequest> = {
                content: 'Valid content',
            };

            // Act
            const result = notesService.validateNote(input);

            // Assert
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Title is required');
        });

        it('should return error when title is empty string', () => {
            // Arrange
            const input: Partial<CreateNoteRequest> = {
                title: '   ',
                content: 'Valid content',
            };

            // Act
            const result = notesService.validateNote(input);

            // Assert
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Title is required');
        });

        it('should return error when title exceeds 200 characters', () => {
            // Arrange
            const input: Partial<CreateNoteRequest> = {
                title: 'a'.repeat(201),
                content: 'Valid content',
            };

            // Act
            const result = notesService.validateNote(input);

            // Assert
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Title must be less than 200 characters');
        });

        it('should accept title with exactly 200 characters', () => {
            // Arrange
            const input: Partial<CreateNoteRequest> = {
                title: 'a'.repeat(200),
                content: 'Valid content',
            };

            // Act
            const result = notesService.validateNote(input);

            // Assert
            expect(result.valid).toBe(true);
        });

        it('should return error when content exceeds 100,000 characters', () => {
            // Arrange
            const input: Partial<CreateNoteRequest> = {
                title: 'Valid Title',
                content: 'a'.repeat(100001),
            };

            // Act
            const result = notesService.validateNote(input);

            // Assert
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Content must be less than 100,000 characters');
        });

        it('should return error when more than 20 tags', () => {
            // Arrange
            const input: Partial<CreateNoteRequest> = {
                title: 'Valid Title',
                tags: Array.from({ length: 21 }, (_, i) => `tag${i}`),
            };

            // Act
            const result = notesService.validateNote(input);

            // Assert
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Maximum 20 tags allowed');
        });

        it('should return error when any tag exceeds 50 characters', () => {
            // Arrange
            const input: Partial<CreateNoteRequest> = {
                title: 'Valid Title',
                tags: ['valid-tag', 'a'.repeat(51)],
            };

            // Act
            const result = notesService.validateNote(input);

            // Assert
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Each tag must be less than 50 characters');
        });

        it('should return multiple errors when multiple validations fail', () => {
            // Arrange
            const input: Partial<CreateNoteRequest> = {
                title: '',
                content: 'a'.repeat(100001),
            };

            // Act
            const result = notesService.validateNote(input);

            // Assert
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(1);
        });
    });

    // ============================================
    // searchNotes Tests
    // ============================================
    describe('searchNotes', () => {
        let notes: Note[];

        beforeEach(() => {
            notes = [
                createTestNote({ id: '1', title: 'JavaScript Tutorial', content: 'Learn JavaScript basics' }),
                createTestNote({ id: '2', title: 'Python Guide', content: 'Python programming language' }),
                createTestNote({ id: '3', title: 'TypeScript Intro', content: 'TypeScript is a JavaScript superset' }),
            ];
        });

        it('should return all notes when query is empty', () => {
            // Act
            const result = notesService.searchNotes(notes, '');

            // Assert
            expect(result).toHaveLength(3);
        });

        it('should return all notes when query is whitespace', () => {
            // Act
            const result = notesService.searchNotes(notes, '   ');

            // Assert
            expect(result).toHaveLength(3);
        });

        it('should search by title and content by default (both mode)', () => {
            // Act
            const result = notesService.searchNotes(notes, 'JavaScript');

            // Assert
            expect(result).toHaveLength(2); // First note by title, third by content
        });

        it('should search only by title when mode is title', () => {
            // Act
            const result = notesService.searchNotes(notes, 'JavaScript', 'title');

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('JavaScript Tutorial');
        });

    it('should search only by content when mode is content', () => {
      // Act - search for "superset" which only appears in the TypeScript note's content
      const result = notesService.searchNotes(notes, 'superset', 'content');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('TypeScript Intro');
    });

        it('should be case insensitive', () => {
            // Act
            const result = notesService.searchNotes(notes, 'PYTHON');

            // Assert
            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Python Guide');
        });

        it('should return empty array when no matches found', () => {
            // Act
            const result = notesService.searchNotes(notes, 'Rust');

            // Assert
            expect(result).toHaveLength(0);
        });
    });

    // ============================================
    // filterByTags Tests
    // ============================================
    describe('filterByTags', () => {
        let notes: Note[];

        beforeEach(() => {
            notes = [
                createTestNote({ id: '1', tags: ['work', 'important'] }),
                createTestNote({ id: '2', tags: ['personal', 'todo'] }),
                createTestNote({ id: '3', tags: ['work', 'todo'] }),
            ];
        });

        it('should return all notes when tags array is empty', () => {
            // Act
            const result = notesService.filterByTags(notes, []);

            // Assert
            expect(result).toHaveLength(3);
        });

        it('should filter notes that have any of the specified tags', () => {
            // Act
            const result = notesService.filterByTags(notes, ['work']);

            // Assert
            expect(result).toHaveLength(2);
        });

        it('should return notes matching any of multiple tags (OR logic)', () => {
            // Act
            const result = notesService.filterByTags(notes, ['personal', 'important']);

            // Assert
            expect(result).toHaveLength(2);
        });

        it('should return empty array when no notes match the tags', () => {
            // Act
            const result = notesService.filterByTags(notes, ['nonexistent']);

            // Assert
            expect(result).toHaveLength(0);
        });
    });

    // ============================================
    // sortNotes Tests
    // ============================================
    describe('sortNotes', () => {
        let notes: Note[];

        beforeEach(() => {
            notes = [
                createTestNote({ id: '1', title: 'Banana', createdAt: '2024-01-02T12:00:00Z' }),
                createTestNote({ id: '2', title: 'Apple', createdAt: '2024-01-01T12:00:00Z' }),
                createTestNote({ id: '3', title: 'Cherry', createdAt: '2024-01-03T12:00:00Z' }),
            ];
        });

        it('should sort by newest first', () => {
            // Act
            const result = notesService.sortNotes(notes, 'newest');

            // Assert
            expect(result[0].title).toBe('Cherry');
            expect(result[1].title).toBe('Banana');
            expect(result[2].title).toBe('Apple');
        });

        it('should sort by oldest first', () => {
            // Act
            const result = notesService.sortNotes(notes, 'oldest');

            // Assert
            expect(result[0].title).toBe('Apple');
            expect(result[1].title).toBe('Banana');
            expect(result[2].title).toBe('Cherry');
        });

        it('should sort by title ascending', () => {
            // Act
            const result = notesService.sortNotes(notes, 'title-asc');

            // Assert
            expect(result[0].title).toBe('Apple');
            expect(result[1].title).toBe('Banana');
            expect(result[2].title).toBe('Cherry');
        });

        it('should sort by title descending', () => {
            // Act
            const result = notesService.sortNotes(notes, 'title-desc');

            // Assert
            expect(result[0].title).toBe('Cherry');
            expect(result[1].title).toBe('Banana');
            expect(result[2].title).toBe('Apple');
        });

        it('should not mutate the original array', () => {
            // Arrange
            const originalFirst = notes[0].title;

            // Act
            notesService.sortNotes(notes, 'title-asc');

            // Assert
            expect(notes[0].title).toBe(originalFirst);
        });

        it('should preserve original order for unknown sort option', () => {
            // Act - use an unknown sort option which triggers the default case
            const result = notesService.sortNotes(notes, 'unknown-sort' as never);

            // Assert - order should be preserved (stable sort with 0 comparison)
            expect(result[0].title).toBe('Banana');
            expect(result[1].title).toBe('Apple');
            expect(result[2].title).toBe('Cherry');
        });
    });

    // ============================================
    // getAllTags Tests
    // ============================================
    describe('getAllTags', () => {
        it('should return all unique tags sorted alphabetically', () => {
            // Arrange
            const notes: Note[] = [
                createTestNote({ id: '1', tags: ['zebra', 'apple'] }),
                createTestNote({ id: '2', tags: ['banana', 'apple'] }),
            ];

            // Act
            const result = notesService.getAllTags(notes);

            // Assert
            expect(result).toEqual(['apple', 'banana', 'zebra']);
        });

        it('should return empty array for notes without tags', () => {
            // Arrange
            const notes: Note[] = [
                createTestNote({ id: '1', tags: [] }),
                createTestNote({ id: '2', tags: [] }),
            ];

            // Act
            const result = notesService.getAllTags(notes);

            // Assert
            expect(result).toEqual([]);
        });

        it('should return empty array for empty notes array', () => {
            // Act
            const result = notesService.getAllTags([]);

            // Assert
            expect(result).toEqual([]);
        });
    });

    // ============================================
    // getTagCounts Tests
    // ============================================
    describe('getTagCounts', () => {
        it('should return correct count for each tag', () => {
            // Arrange
            const notes: Note[] = [
                createTestNote({ id: '1', tags: ['work', 'important'] }),
                createTestNote({ id: '2', tags: ['work', 'todo'] }),
                createTestNote({ id: '3', tags: ['personal'] }),
            ];

            // Act
            const result = notesService.getTagCounts(notes);

            // Assert
            expect(result).toEqual({
                work: 2,
                important: 1,
                todo: 1,
                personal: 1,
            });
        });

        it('should return empty object for notes without tags', () => {
            // Arrange
            const notes: Note[] = [
                createTestNote({ id: '1', tags: [] }),
            ];

            // Act
            const result = notesService.getTagCounts(notes);

            // Assert
            expect(result).toEqual({});
        });
    });

    // ============================================
    // createOptimisticNote Tests
    // ============================================
    describe('createOptimisticNote', () => {
        it('should create a note with temporary id', () => {
            // Arrange
            const input: CreateNoteRequest = {
                title: 'New Note',
                content: 'Content',
                tags: ['test'],
                isArchived: false,
            };

            // Act
            const result = notesService.createOptimisticNote(input);

            // Assert
            expect(result.id).toMatch(/^temp-\d+$/);
            expect(result.title).toBe('New Note');
            expect(result.content).toBe('Content');
            expect(result.tags).toEqual(['test']);
        });

        it('should set createdAt and updatedAt timestamps', () => {
            // Arrange
            const beforeTime = new Date().toISOString();
            const input: CreateNoteRequest = {
                title: 'New Note',
                content: 'Content',
                tags: [],
                isArchived: false,
            };

            // Act
            const result = notesService.createOptimisticNote(input);
            const afterTime = new Date().toISOString();

            // Assert
            expect(result.createdAt >= beforeTime).toBe(true);
            expect(result.createdAt <= afterTime).toBe(true);
            expect(result.updatedAt >= beforeTime).toBe(true);
            expect(result.updatedAt <= afterTime).toBe(true);
        });
    });

    // ============================================
    // applyOptimisticUpdate Tests
    // ============================================
    describe('applyOptimisticUpdate', () => {
        it('should apply update to note while preserving other fields', () => {
            // Arrange
            const note = createTestNote({ id: '123', title: 'Original Title' });
            const update = { title: 'Updated Title' };

            // Act
            const result = notesService.applyOptimisticUpdate(note, update);

            // Assert
            expect(result.id).toBe('123');
            expect(result.title).toBe('Updated Title');
            expect(result.content).toBe(note.content);
        });

        it('should update the updatedAt timestamp', () => {
            // Arrange
            const originalUpdatedAt = '2023-01-01T12:00:00Z';
            const note = createTestNote({ updatedAt: originalUpdatedAt });
            const beforeUpdate = new Date().toISOString();

            // Act
            const result = notesService.applyOptimisticUpdate(note, { title: 'New' });
            const afterUpdate = new Date().toISOString();

            // Assert
            expect(result.updatedAt).not.toBe(originalUpdatedAt);
            expect(result.updatedAt >= beforeUpdate).toBe(true);
            expect(result.updatedAt <= afterUpdate).toBe(true);
        });
    });

    // ============================================
    // API Methods Tests (Integration with MSW)
    // ============================================
    describe('API methods', () => {
        describe('getAll', () => {
            it('should fetch all notes', async () => {
                const result = await notesService.getAll();

                expect(result).toBeDefined();
                expect(Array.isArray(result)).toBe(true);
                expect(result.length).toBe(mockNotes.length);
            });
        });

        describe('getPaged', () => {
            it('should fetch paginated notes with default params', async () => {
                const result = await notesService.getPaged();

                expect(result).toBeDefined();
                expect(result.items).toBeDefined();
                expect(result.totalCount).toBeDefined();
                expect(result.page).toBe(1);
            });

            it('should fetch paginated notes with custom params', async () => {
                const result = await notesService.getPaged({
                    page: 1,
                    pageSize: 10,
                    search: 'First',
                });

                expect(result).toBeDefined();
                expect(result.page).toBe(1);
            });

            it('should handle folder filter', async () => {
                const result = await notesService.getPaged({
                    folder: 'Projects',
                });

                expect(result).toBeDefined();
            });

            it('should handle includeArchived flag', async () => {
                const result = await notesService.getPaged({
                    includeArchived: true,
                });

                expect(result).toBeDefined();
            });
        });

        describe('getById', () => {
            it('should fetch a note by ID', async () => {
                const result = await notesService.getById('note-1');

                expect(result).toBeDefined();
                expect(result.id).toBe('note-1');
                expect(result.title).toBe('First Note');
            });
        });

        describe('create', () => {
            it('should create a new note', async () => {
                const input: CreateNoteRequest = {
                    title: 'New Note',
                    content: 'New content',
                    tags: ['test'],
                    isArchived: false,
                };

                const result = await notesService.create(input);

                expect(result).toBeDefined();
                expect(result.title).toBe('New Note');
            });

            it('should throw error for invalid note', async () => {
                const input: CreateNoteRequest = {
                    title: '', // Invalid - empty title
                    content: 'Content',
                    tags: [],
                    isArchived: false,
                };

                await expect(notesService.create(input)).rejects.toThrow('Title is required');
            });
        });

        describe('update', () => {
            it('should update an existing note', async () => {
                const result = await notesService.update('note-1', {
                    title: 'Updated Title',
                });

                expect(result).toBeDefined();
                expect(result.title).toBe('Updated Title');
            });
        });

        describe('delete', () => {
            it('should delete a note', async () => {
                await expect(notesService.delete('note-1')).resolves.toBeUndefined();
            });
        });

        describe('bulkDelete', () => {
            it('should delete multiple notes', async () => {
                const result = await notesService.bulkDelete(['note-1', 'note-2']);

                expect(result).toBeDefined();
                expect(result.deletedCount).toBe(2);
            });
        });

        describe('archive', () => {
            it('should archive a note', async () => {
                const result = await notesService.archive('note-1');

                expect(result).toBeDefined();
                expect(result.isArchived).toBe(true);
            });
        });

        describe('unarchive', () => {
            it('should unarchive a note', async () => {
                const result = await notesService.unarchive('note-1');

                expect(result).toBeDefined();
                expect(result.isArchived).toBe(false);
            });
        });

        describe('import', () => {
            it('should import multiple notes', async () => {
                const result = await notesService.import([
                    { title: 'Imported 1', content: 'Content 1', tags: [] },
                    { title: 'Imported 2', content: 'Content 2', tags: ['imported'] },
                ]);

                expect(result).toBeDefined();
                expect(result.successCount).toBe(2);
            });
        });
    });

    // ============================================
    // Version History Tests (Integration with MSW)
    // ============================================
    describe('version history', () => {
        describe('getVersionHistory', () => {
            it('should fetch version history for a note', async () => {
                const result = await notesService.getVersionHistory('note-1');

                expect(result).toBeDefined();
                expect(result.noteId).toBe('note-1');
                expect(result.totalVersions).toBe(3);
                expect(result.currentVersion).toBe(3);
                expect(Array.isArray(result.versions)).toBe(true);
            });
        });

        describe('getVersionAtTime', () => {
            it('should fetch version at specific timestamp', async () => {
                const result = await notesService.getVersionAtTime(
                    'note-1',
                    '2024-01-01T12:00:00Z'
                );

                expect(result).toBeDefined();
                expect(result.noteId).toBe('note-1');
                expect(result.versionNumber).toBe(mockVersionHistory[2].versionNumber);
            });
        });

        describe('getVersionDiff', () => {
            it('should fetch diff between two versions', async () => {
                const result = await notesService.getVersionDiff('note-1', 1, 2);

                expect(result).toBeDefined();
                expect(result.noteId).toBe('note-1');
                expect(result.fromVersion).toBeDefined();
                expect(result.toVersion).toBeDefined();
                expect(typeof result.titleChanged).toBe('boolean');
                expect(typeof result.contentChanged).toBe('boolean');
            });
        });

        describe('restoreVersion', () => {
            it('should restore note to a previous version', async () => {
                const result = await notesService.restoreVersion('note-1', 1);

                expect(result).toBeDefined();
                expect(result.message).toContain('restored');
                expect(result.newVersionNumber).toBe(4);
                expect(result.noteId).toBe('note-1');
            });
        });
    });

    // ============================================
    // Summary Generation Tests (Integration with MSW)
    // ============================================
    describe('summary generation', () => {
        describe('generateSummaries', () => {
            it('should generate summaries for specific notes', async () => {
                const result = await notesService.generateSummaries(['note-1', 'note-2']);

                expect(result).toBeDefined();
                expect(result.totalProcessed).toBe(2);
                expect(result.successCount).toBe(2);
                expect(result.failureCount).toBe(0);
            });

            it('should generate summaries for all notes when no IDs provided', async () => {
                const result = await notesService.generateSummaries();

                expect(result).toBeDefined();
                expect(result.totalProcessed).toBeGreaterThan(0);
            });
        });

        describe('startSummaryGeneration', () => {
            it('should start a background summary job', async () => {
                const result = await notesService.startSummaryGeneration(['note-1']);

                expect(result).toBeDefined();
                expect(result.id).toBeDefined();
                expect(result.status).toBe('running');
            });

            it('should start job for all notes when no IDs provided', async () => {
                const result = await notesService.startSummaryGeneration();

                expect(result).toBeDefined();
                expect(result.id).toBeDefined();
            });
        });

        describe('getSummaryJobStatus', () => {
            it('should get status of a summary job', async () => {
                const result = await notesService.getSummaryJobStatus('test-job-id');

                expect(result).toBeDefined();
                expect(result.id).toBe('test-job-id');
                expect(result.status).toBe('completed');
                expect(result.totalNotes).toBe(5);
                expect(result.processedNotes).toBe(5);
            });
        });

        describe('cancelSummaryJob', () => {
            it('should cancel a summary job', async () => {
                const result = await notesService.cancelSummaryJob('test-job-id');

                expect(result).toBeDefined();
                expect(result.message).toContain('cancelled');
            });
        });
    });

    // ============================================
    // Constants Tests
    // ============================================
    describe('constants', () => {
        it('should expose ARCHIVED_FOLDER constant', () => {
            expect(notesService.ARCHIVED_FOLDER).toBe('Archived');
        });
    });
});

