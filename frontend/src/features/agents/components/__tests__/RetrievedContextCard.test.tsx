/**
 * RetrievedContextCard Component Tests
 * Unit tests for the RetrievedContextCard component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { RetrievedContextCard } from '../RetrievedContextCard';
import type { RetrievedNoteContext } from '../../../../types/agent';

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

// Mock the notes hooks
const mockUseNotes = vi.fn();
vi.mock('../../../notes/hooks/use-notes-query', () => ({
  useNotes: () => mockUseNotes(),
  useDeleteNote: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useArchiveNote: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUnarchiveNote: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

// Mock toast
vi.mock('../../../../hooks/use-toast', () => ({
  toast: {
    confirm: vi.fn().mockResolvedValue(false),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Helper to create mock retrieved note context
function createMockRetrievedNote(overrides: Partial<RetrievedNoteContext> = {}): RetrievedNoteContext {
  return {
    noteId: 'note-1',
    title: 'Test Note',
    preview: 'This is a preview of the note content.',
    tags: ['test', 'sample'],
    relevanceScore: 0.85,
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

describe('RetrievedContextCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNotes.mockReturnValue({ data: [], isLoading: false });
  });

  // ============================================
  // Rendering Tests
  // ============================================
  describe('rendering', () => {
    it('should render null when retrievedNotes is empty', () => {
      const { container } = render(
        <RetrievedContextCard retrievedNotes={[]} />,
        { wrapper: createWrapper() }
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render note count for single note', () => {
      render(
        <RetrievedContextCard retrievedNotes={[createMockRetrievedNote()]} />,
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('1 note retrieved')).toBeInTheDocument();
    });

    it('should render note count for multiple notes', () => {
      render(
        <RetrievedContextCard
          retrievedNotes={[
            createMockRetrievedNote({ noteId: '1' }),
            createMockRetrievedNote({ noteId: '2' }),
            createMockRetrievedNote({ noteId: '3' }),
          ]}
        />,
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('3 notes retrieved')).toBeInTheDocument();
    });

    it('should render relevance score percentage', () => {
      const fullNote = {
        id: 'note-1',
        title: 'Test Note',
        content: 'Content',
        tags: [],
        isArchived: false,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      mockUseNotes.mockReturnValue({ data: [fullNote], isLoading: false });

      render(
        <RetrievedContextCard retrievedNotes={[createMockRetrievedNote({ relevanceScore: 0.92 })]} />,
        { wrapper: createWrapper() }
      );
      // The header button contains "X% match" - check that the button has this text
      const button = screen.getByRole('button');
      expect(button.textContent).toContain('92%');
      expect(button.textContent).toContain('match');
    });

    it('should render timeline icon', () => {
      const { container } = render(
        <RetrievedContextCard retrievedNotes={[createMockRetrievedNote()]} />,
        { wrapper: createWrapper() }
      );
      const iconContainer = container.querySelector('.absolute.left-2\\.5');
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer?.querySelector('svg')).toBeInTheDocument();
    });
  });

  // ============================================
  // Expand/Collapse Tests
  // ============================================
  describe('expand and collapse', () => {
    it('should be collapsed by default', () => {
      const fullNote = {
        id: 'note-1',
        title: 'Test Note',
        content: 'Content',
        tags: [],
        isArchived: false,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      mockUseNotes.mockReturnValue({ data: [fullNote], isLoading: false });

      render(
        <RetrievedContextCard retrievedNotes={[createMockRetrievedNote()]} />,
        { wrapper: createWrapper() }
      );

      // Should NOT show the note card when collapsed
      expect(screen.queryByText('Test Note')).not.toBeInTheDocument();
    });

    it('should expand when button is clicked', () => {
      const fullNote = {
        id: 'note-1',
        title: 'Test Note',
        content: 'Content',
        tags: [],
        isArchived: false,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      mockUseNotes.mockReturnValue({ data: [fullNote], isLoading: false });

      render(
        <RetrievedContextCard retrievedNotes={[createMockRetrievedNote()]} />,
        { wrapper: createWrapper() }
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Note should be visible when expanded
      expect(screen.getByText('Test Note')).toBeInTheDocument();
    });

    it('should collapse when clicked again after expanding', () => {
      const fullNote = {
        id: 'note-1',
        title: 'Test Note',
        content: 'Content',
        tags: [],
        isArchived: false,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      mockUseNotes.mockReturnValue({ data: [fullNote], isLoading: false });

      render(
        <RetrievedContextCard retrievedNotes={[createMockRetrievedNote()]} />,
        { wrapper: createWrapper() }
      );

      const button = screen.getByRole('button');
      fireEvent.click(button); // Expand
      fireEvent.click(button); // Collapse

      expect(screen.queryByText('Test Note')).not.toBeInTheDocument();
    });

    it('should show chevron rotation when expanded', () => {
      mockUseNotes.mockReturnValue({ data: [], isLoading: false });

      render(
        <RetrievedContextCard retrievedNotes={[createMockRetrievedNote()]} />,
        { wrapper: createWrapper() }
      );

      const button = screen.getByRole('button');
      const chevron = button.querySelector('svg:last-of-type');

      expect(chevron).not.toHaveClass('rotate-180'); // Collapsed by default

      fireEvent.click(button);
      expect(chevron).toHaveClass('rotate-180'); // Expanded
    });
  });

  // ============================================
  // Loading State Tests
  // ============================================
  describe('loading state', () => {
    it('should show loading message when notes are loading and expanded', () => {
      mockUseNotes.mockReturnValue({ data: undefined, isLoading: true });

      render(
        <RetrievedContextCard retrievedNotes={[createMockRetrievedNote()]} />,
        { wrapper: createWrapper() }
      );

      // Need to expand first
      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByText('Loading notes data...')).toBeInTheDocument();
    });
  });

  // ============================================
  // Notes Display Tests
  // ============================================
  describe('notes display', () => {
    it('should display notes when expanded and full note data is available', () => {
      const fullNote = {
        id: 'note-1',
        title: 'Full Note Title',
        content: 'Full note content here',
        tags: ['tag1', 'tag2'],
        isArchived: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      mockUseNotes.mockReturnValue({ data: [fullNote], isLoading: false });

      render(
        // Pass title: undefined so the component falls back to fullNote.title
        <RetrievedContextCard retrievedNotes={[createMockRetrievedNote({ noteId: 'note-1', title: undefined })]} />,
        { wrapper: createWrapper() }
      );

      // Expand to see the note
      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByText('Full Note Title')).toBeInTheDocument();
    });

    it('should use retrieved note data when full note not found', () => {
      mockUseNotes.mockReturnValue({ data: [], isLoading: false });

      render(
        <RetrievedContextCard
          retrievedNotes={[createMockRetrievedNote({ title: 'Retrieved Title', preview: 'Preview content' })]}
        />,
        { wrapper: createWrapper() }
      );

      // Expand to see the note
      const button = screen.getByRole('button');
      fireEvent.click(button);

      // The component creates a minimal note object from retrieved data
      expect(screen.getByText('Retrieved Title')).toBeInTheDocument();
    });

    it('should sort notes by relevance score (highest first)', () => {
      const fullNotes = [
        { id: 'note-1', title: 'Low Score Note', content: '', tags: [], isArchived: false, createdAt: '', updatedAt: '' },
        { id: 'note-2', title: 'High Score Note', content: '', tags: [], isArchived: false, createdAt: '', updatedAt: '' },
      ];

      mockUseNotes.mockReturnValue({ data: fullNotes, isLoading: false });

      render(
        <RetrievedContextCard
          retrievedNotes={[
            // Pass title: undefined so component uses fullNotes titles
            createMockRetrievedNote({ noteId: 'note-1', relevanceScore: 0.5, title: undefined }),
            createMockRetrievedNote({ noteId: 'note-2', relevanceScore: 0.9, title: undefined }),
          ]}
        />,
        { wrapper: createWrapper() }
      );

      // Expand to see notes
      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Find all note title elements and verify high score (90%) comes first
      const titles = screen.getAllByText(/Score Note/);
      expect(titles[0]).toHaveTextContent('High Score Note');
      expect(titles[1]).toHaveTextContent('Low Score Note');
    });
  });

  // ============================================
  // Streaming Tests
  // ============================================
  describe('streaming behavior', () => {
    it('should show pulsing animation when streaming', () => {
      const { container } = render(
        <RetrievedContextCard retrievedNotes={[createMockRetrievedNote()]} isStreaming={true} />,
        { wrapper: createWrapper() }
      );

      const iconContainer = container.querySelector('.absolute.left-2\\.5');
      expect(iconContainer).toBeInTheDocument();
      // Uses animate-pulse class when streaming
      expect(iconContainer).toHaveClass('animate-pulse');
    });

    it('should not show pulsing animation when not streaming', () => {
      const { container } = render(
        <RetrievedContextCard retrievedNotes={[createMockRetrievedNote()]} isStreaming={false} />,
        { wrapper: createWrapper() }
      );

      const iconContainer = container.querySelector('.absolute.left-2\\.5');
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer).not.toHaveClass('animate-pulse');
    });
  });

  // ============================================
  // Top Score Display Tests
  // ============================================
  describe('top score display', () => {
    it('should display 0% when notes have zero score', () => {
      mockUseNotes.mockReturnValue({ data: [], isLoading: false });

      render(
        <RetrievedContextCard retrievedNotes={[createMockRetrievedNote({ relevanceScore: 0 })]} />,
        { wrapper: createWrapper() }
      );

      // The header button contains "X% match"
      const button = screen.getByRole('button');
      expect(button.textContent).toContain('0%');
      expect(button.textContent).toContain('match');
    });

    it('should display highest relevance score', () => {
      const notes = [
        { id: 'n1', title: 'N1', content: '', tags: [], isArchived: false, createdAt: '', updatedAt: '' },
        { id: 'n2', title: 'N2', content: '', tags: [], isArchived: false, createdAt: '', updatedAt: '' },
      ];

      mockUseNotes.mockReturnValue({ data: notes, isLoading: false });

      render(
        <RetrievedContextCard
          retrievedNotes={[
            createMockRetrievedNote({ noteId: 'n1', relevanceScore: 0.75 }),
            createMockRetrievedNote({ noteId: 'n2', relevanceScore: 0.95 }),
          ]}
        />,
        { wrapper: createWrapper() }
      );

      // The header button shows the highest score as "X% match"
      const button = screen.getByRole('button');
      expect(button.textContent).toContain('95%');
      expect(button.textContent).toContain('match');
    });
  });

  // ============================================
  // Styling Tests
  // ============================================
  describe('styling', () => {
    it('should have proper wrapper classes', () => {
      const { container } = render(
        <RetrievedContextCard retrievedNotes={[createMockRetrievedNote()]} />,
        { wrapper: createWrapper() }
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('relative', 'pl-12', 'py-2');
    });

    it('should use grid layout for NoteCards when expanded', () => {
      const fullNote = {
        id: 'note-1',
        title: 'Test Note',
        content: 'Content',
        tags: [],
        isArchived: false,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };

      mockUseNotes.mockReturnValue({ data: [fullNote], isLoading: false });

      const { container } = render(
        <RetrievedContextCard retrievedNotes={[createMockRetrievedNote({ noteId: 'note-1' })]} />,
        { wrapper: createWrapper() }
      );

      // Expand first
      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Should render in a grid layout
      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
    });
  });
});
