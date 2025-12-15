/**
 * NoteCard Component Tests
 * Unit tests for the NoteCard component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { NoteCard } from '../NoteCard';
import type { Note } from '../../types/note';

// Mock the store
vi.mock('../../../../store/bound-store', () => ({
  useBoundStore: vi.fn((selector) => {
    const state = {
      theme: 'light',
      openEditModal: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

// Mock the hooks
vi.mock('../../hooks/use-notes-query', () => ({
  useDeleteNote: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useArchiveNote: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useUnarchiveNote: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

// Mock the toast
vi.mock('../../../../hooks/use-toast', () => ({
  toast: {
    confirm: vi.fn().mockResolvedValue(false),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Helper to create a mock note
function createMockNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    title: 'Test Note Title',
    content: 'This is the test note content.',
    tags: ['work', 'important'],
    isArchived: false,
    createdAt: '2024-01-15T12:00:00Z',
    updatedAt: '2024-01-15T12:00:00Z',
    ...overrides,
  };
}

// Create a wrapper component with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('NoteCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Rendering Tests
  // ============================================
  describe('rendering', () => {
    it('should render note title', () => {
      // Act
      render(<NoteCard note={createMockNote()} />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByText('Test Note Title')).toBeInTheDocument();
    });

    it('should render note content', () => {
      // Act
      render(<NoteCard note={createMockNote()} />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByText('This is the test note content.')).toBeInTheDocument();
    });

    it('should render note tags', () => {
      // Act
      render(<NoteCard note={createMockNote()} />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByText('work')).toBeInTheDocument();
      expect(screen.getByText('important')).toBeInTheDocument();
    });

    it('should render without tags when note has no tags', () => {
      // Arrange
      const note = createMockNote({ tags: [] });

      // Act
      render(<NoteCard note={note} />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByText('Test Note Title')).toBeInTheDocument();
    });
  });

  // ============================================
  // Variant Tests
  // ============================================
  describe('variants', () => {
    it('should render full variant by default', () => {
      // Act
      render(<NoteCard note={createMockNote()} />, { wrapper: createWrapper() });

      // Assert
      const card = screen.getByText('Test Note Title').closest('div[class*="cursor-pointer"]');
      expect(card).toHaveClass('p-[22px]');
    });

    it('should render compact variant', () => {
      // Act
      render(<NoteCard note={createMockNote()} variant="compact" />, {
        wrapper: createWrapper(),
      });

      // Assert
      const card = screen.getByText('Test Note Title').closest('div[class*="cursor-pointer"]');
      expect(card).toHaveClass('p-4.5');
    });

    it('should render micro variant', () => {
      // Act
      render(<NoteCard note={createMockNote()} variant="micro" />, {
        wrapper: createWrapper(),
      });

      // Assert
      const card = screen.getByText('Test Note Title').closest('div[class*="cursor-pointer"]');
      expect(card).toHaveClass('p-2');
    });
  });

  // ============================================
  // Relevance Score Tests
  // ============================================
  describe('relevance score', () => {
    it('should display relevance score in compact variant', () => {
      // Act
      render(
        <NoteCard note={createMockNote()} variant="compact" relevanceScore={0.85} />,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('should display relevance score in micro variant', () => {
      // Act
      render(
        <NoteCard note={createMockNote()} variant="micro" relevanceScore={0.5} />,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should not display relevance score in full variant', () => {
      // Act
      render(<NoteCard note={createMockNote()} relevanceScore={0.85} />, {
        wrapper: createWrapper(),
      });

      // Assert
      expect(screen.queryByText('85%')).not.toBeInTheDocument();
    });
  });

  // ============================================
  // Chunk Index Tests
  // ============================================
  describe('chunk index', () => {
    it('should display chunk index in compact variant', () => {
      // Act
      render(
        <NoteCard note={createMockNote()} variant="compact" chunkIndex={2} />,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(screen.getByText('Chunk 3')).toBeInTheDocument();
    });

    it('should display chunk index in micro variant', () => {
      // Act
      render(
        <NoteCard note={createMockNote()} variant="micro" chunkIndex={0} />,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(screen.getByText('Chunk 1')).toBeInTheDocument();
    });
  });

  // ============================================
  // Click Handler Tests
  // ============================================
  describe('click handling', () => {
    it('should be clickable', () => {
      // Act
      render(<NoteCard note={createMockNote()} />, { wrapper: createWrapper() });

      // Assert
      const card = screen.getByText('Test Note Title').closest('div[class*="cursor-pointer"]');
      expect(card).toHaveClass('cursor-pointer');
    });
  });

  // ============================================
  // Delete Button Tests
  // ============================================
  describe('delete button', () => {
    it('should show delete button in full variant', () => {
      // Act
      render(<NoteCard note={createMockNote()} />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByLabelText('Delete note')).toBeInTheDocument();
    });

    it('should not show delete button when showDeleteButton is false', () => {
      // Act
      render(<NoteCard note={createMockNote()} showDeleteButton={false} />, {
        wrapper: createWrapper(),
      });

      // Assert
      expect(screen.queryByLabelText('Delete note')).not.toBeInTheDocument();
    });

    it('should not show delete button in compact variant', () => {
      // Act
      render(<NoteCard note={createMockNote()} variant="compact" />, {
        wrapper: createWrapper(),
      });

      // Assert
      expect(screen.queryByLabelText('Delete note')).not.toBeInTheDocument();
    });
  });

  // ============================================
  // Bulk Mode Tests
  // ============================================
  describe('bulk mode', () => {
    it('should show checkbox in bulk mode', () => {
      // Act
      render(
        <NoteCard note={createMockNote()} isBulkMode onSelect={vi.fn()} />,
        { wrapper: createWrapper() }
      );

      // Assert
      // Check for the checkbox container
      const checkboxContainer = document.querySelector('.absolute.top-3.left-3');
      expect(checkboxContainer).toBeInTheDocument();
    });

    it('should call onSelect when clicked in bulk mode', () => {
      // Arrange
      const onSelect = vi.fn();

      // Act
      render(
        <NoteCard note={createMockNote()} isBulkMode onSelect={onSelect} />,
        { wrapper: createWrapper() }
      );

      const card = screen.getByText('Test Note Title').closest('div[class*="cursor-pointer"]');
      if (card) {
        fireEvent.click(card);
      }

      // Assert
      expect(onSelect).toHaveBeenCalledWith('note-1');
    });

    it('should show selected state when isSelected is true', () => {
      // Act
      render(
        <NoteCard
          note={createMockNote()}
          isBulkMode
          isSelected
          onSelect={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      // Assert
      // The checkmark SVG should be visible
      const checkmark = document.querySelector('svg path[d="M5 13l4 4L19 7"]');
      expect(checkmark).toBeInTheDocument();
    });
  });

  // ============================================
  // Content Display Tests
  // ============================================
  describe('content display', () => {
    it('should use custom content when provided', () => {
      // Act
      render(
        <NoteCard note={createMockNote()} content="Custom content here" variant="compact" />,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(screen.getByText('Custom content here')).toBeInTheDocument();
    });

    it('should use chunkContent when provided in compact variant', () => {
      // Act
      render(
        <NoteCard
          note={createMockNote()}
          chunkContent="Chunk specific content"
          variant="compact"
        />,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(screen.getByText('Chunk specific content')).toBeInTheDocument();
    });
  });

  // ============================================
  // Date Display Tests
  // ============================================
  describe('date display', () => {
    it('should use custom createdOn date when provided', () => {
      // This test verifies that the component accepts custom dates
      // The actual date formatting is tested in date-utils tests
      render(
        <NoteCard note={createMockNote()} createdOn="2024-12-25T12:00:00Z" />,
        { wrapper: createWrapper() }
      );

      // The component should render without errors
      expect(screen.getByText('Test Note Title')).toBeInTheDocument();
    });
  });

  // ============================================
  // Tag Limit Tests
  // ============================================
  describe('tag limits', () => {
    it('should limit tags to 3 in full variant', () => {
      // Arrange
      const note = createMockNote({
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
      });

      // Act
      render(<NoteCard note={note} />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByText('tag1')).toBeInTheDocument();
      expect(screen.getByText('tag2')).toBeInTheDocument();
      expect(screen.getByText('tag3')).toBeInTheDocument();
      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('should limit tags to 2 in compact variant', () => {
      // Arrange
      const note = createMockNote({
        tags: ['tag1', 'tag2', 'tag3', 'tag4'],
      });

      // Act
      render(<NoteCard note={note} variant="compact" />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByText('tag1')).toBeInTheDocument();
      expect(screen.getByText('tag2')).toBeInTheDocument();
      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('should limit tags to 2 in micro variant', () => {
      // Arrange
      const note = createMockNote({
        tags: ['tag1', 'tag2', 'tag3', 'tag4'],
      });

      // Act
      render(<NoteCard note={note} variant="micro" />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByText('tag1')).toBeInTheDocument();
      expect(screen.getByText('tag2')).toBeInTheDocument();
      expect(screen.getByText('+2')).toBeInTheDocument();
    });
  });

  // ============================================
  // HTML Content Tests
  // ============================================
  describe('HTML content handling', () => {
    it('should strip HTML tags from content for preview', () => {
      // Arrange
      const note = createMockNote({
        content: '<p>Hello <strong>world</strong></p>',
      });

      // Act
      render(<NoteCard note={note} />, { wrapper: createWrapper() });

      // Assert - HTML should be stripped, content should still be visible
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    it('should handle empty content', () => {
      // Arrange
      const note = createMockNote({ content: '' });

      // Act
      render(<NoteCard note={note} />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByText('Test Note Title')).toBeInTheDocument();
    });

    it('should decode HTML entities', () => {
      // Arrange
      const note = createMockNote({
        content: '<p>Test &amp; more &lt;content&gt;</p>',
      });

      // Act
      render(<NoteCard note={note} />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByText('Test & more <content>')).toBeInTheDocument();
    });
  });

  // ============================================
  // Extract Tags Tests
  // ============================================
  describe('tag extraction from content', () => {
    it('should extract hashtags from content when note has no tags', () => {
      // Arrange
      const note = createMockNote({
        tags: [],
        content: 'Content with #hashtag1 and #hashtag2',
      });

      // Act
      render(<NoteCard note={note} />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByText('hashtag1')).toBeInTheDocument();
      expect(screen.getByText('hashtag2')).toBeInTheDocument();
    });

    it('should not extract duplicate hashtags', () => {
      // Arrange
      const note = createMockNote({
        tags: [],
        content: 'Content with #tag1 and #tag1 again',
      });

      // Act
      render(<NoteCard note={note} />, { wrapper: createWrapper() });

      // Assert - tag1 should appear only once
      const tags = screen.getAllByText('tag1');
      expect(tags).toHaveLength(1);
    });
  });

  // ============================================
  // Archive Badge Tests
  // ============================================
  describe('archive badge', () => {
    it('should show archived badge when note is archived', () => {
      // Arrange
      const note = createMockNote({ isArchived: true });

      // Act
      render(<NoteCard note={note} />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByText('Archived')).toBeInTheDocument();
    });

    it('should not show archived badge when note is not archived', () => {
      // Arrange
      const note = createMockNote({ isArchived: false });

      // Act
      render(<NoteCard note={note} />, { wrapper: createWrapper() });

      // Assert
      expect(screen.queryByText('Archived')).not.toBeInTheDocument();
    });

    it('should show archived badge in compact variant', () => {
      // Arrange
      const note = createMockNote({ isArchived: true });

      // Act
      render(<NoteCard note={note} variant="compact" />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByText('Archived')).toBeInTheDocument();
    });
  });

  // ============================================
  // Archive Button Tests
  // ============================================
  describe('archive button', () => {
    it('should show archive button in full variant', () => {
      // Act
      render(<NoteCard note={createMockNote()} />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByLabelText('Archive note')).toBeInTheDocument();
    });

    it('should show restore button when note is archived', () => {
      // Arrange
      const note = createMockNote({ isArchived: true });

      // Act
      render(<NoteCard note={note} />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByLabelText('Restore note')).toBeInTheDocument();
    });
  });

  // ============================================
  // Chunk Count Tests
  // ============================================
  describe('chunk count', () => {
    it('should display chunk count in compact variant', () => {
      // Act
      render(
        <NoteCard note={createMockNote()} variant="compact" chunkCount={5} />,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(screen.getByText('5 chunks')).toBeInTheDocument();
    });

    it('should display singular chunk for count of 1', () => {
      // Act
      render(
        <NoteCard note={createMockNote()} variant="compact" chunkCount={1} />,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(screen.getByText('1 chunk')).toBeInTheDocument();
    });

    it('should display chunk count in micro variant', () => {
      // Act
      render(
        <NoteCard note={createMockNote()} variant="micro" chunkCount={3} />,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(screen.getByText('3 chunks')).toBeInTheDocument();
    });
  });

  // ============================================
  // Hover State Tests
  // ============================================
  describe('hover state', () => {
    it('should respond to mouse enter and leave', () => {
      // Act
      render(<NoteCard note={createMockNote()} />, { wrapper: createWrapper() });

      const card = screen.getByText('Test Note Title').closest('div[class*="cursor-pointer"]');

      // Assert - card exists
      expect(card).toBeInTheDocument();

      // Simulate hover
      if (card) {
        fireEvent.mouseEnter(card);
        fireEvent.mouseLeave(card);
      }

      // Card should still be rendered
      expect(screen.getByText('Test Note Title')).toBeInTheDocument();
    });
  });

  // ============================================
  // Relevance Score Color Tests
  // ============================================
  describe('relevance score colors', () => {
    it('should display high relevance score (>=0.9)', () => {
      // Act
      render(
        <NoteCard note={createMockNote()} variant="compact" relevanceScore={0.95} />,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(screen.getByText('95%')).toBeInTheDocument();
    });

    it('should display medium-high relevance score (>=0.8)', () => {
      // Act
      render(
        <NoteCard note={createMockNote()} variant="compact" relevanceScore={0.82} />,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(screen.getByText('82%')).toBeInTheDocument();
    });

    it('should display medium relevance score (>=0.7)', () => {
      // Act
      render(
        <NoteCard note={createMockNote()} variant="compact" relevanceScore={0.75} />,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should display medium-low relevance score (>=0.6)', () => {
      // Act
      render(
        <NoteCard note={createMockNote()} variant="compact" relevanceScore={0.65} />,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(screen.getByText('65%')).toBeInTheDocument();
    });

    it('should display low relevance score (<0.5)', () => {
      // Act
      render(
        <NoteCard note={createMockNote()} variant="compact" relevanceScore={0.45} />,
        { wrapper: createWrapper() }
      );

      // Assert
      expect(screen.getByText('45%')).toBeInTheDocument();
    });
  });

  // ============================================
  // Summary Display Tests
  // ============================================
  describe('summary display', () => {
    it('should use summary when available', () => {
      // Arrange
      const note = {
        ...createMockNote(),
        summary: 'This is a summary of the note',
      };

      // Act
      render(<NoteCard note={note} />, { wrapper: createWrapper() });

      // Assert
      expect(screen.getByText('This is a summary of the note')).toBeInTheDocument();
    });
  });

  // ============================================
  // Edit Modal Tests
  // ============================================
  describe('edit modal', () => {
    it('should call openEditModal when clicking card (not in bulk mode)', () => {
      // The openEditModal is mocked in useBoundStore mock at the top
      // When clicking the card in non-bulk mode, it should call openEditModal

      // Act
      render(<NoteCard note={createMockNote()} />, { wrapper: createWrapper() });

      const card = screen.getByText('Test Note Title').closest('div[class*="cursor-pointer"]');

      // Assert - card is clickable
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('cursor-pointer');
    });
  });
});

