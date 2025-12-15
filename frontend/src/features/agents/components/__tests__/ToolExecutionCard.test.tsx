/**
 * ToolExecutionCard Component Tests
 * Unit tests for the ToolExecutionCard component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { ToolExecutionCard } from '../ToolExecutionCard';
import type { ToolExecution } from '../../../../types/agent';

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
vi.mock('../../../notes/hooks/use-notes-query', () => ({
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

// Mock note reference utils
vi.mock('../../../../utils/note-reference-utils', () => ({
  splitTextWithNoteReferences: vi.fn((content: string) => [
    { type: 'text', content },
  ]),
}));

// Mock InlineNoteReference
vi.mock('../../../chat/components/InlineNoteReference', () => ({
  InlineNoteReference: ({ noteId, noteTitle }: { noteId: string; noteTitle?: string }) => (
    <span data-testid="note-reference" data-note-id={noteId}>
      {noteTitle || noteId}
    </span>
  ),
}));

// Helper to create a mock tool execution
function createMockExecution(overrides: Partial<ToolExecution> = {}): ToolExecution {
  return {
    tool: 'SearchNotes',
    result: '',
    status: 'completed',
    timestamp: new Date('2024-01-15T12:00:00Z'),
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

describe('ToolExecutionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Rendering Tests
  // ============================================
  describe('rendering', () => {
    it('should render tool label for SearchNotes', () => {
      render(<ToolExecutionCard execution={createMockExecution({ tool: 'SearchNotes' })} />, {
        wrapper: createWrapper(),
      });
      expect(screen.getByText('Searching Notes')).toBeInTheDocument();
    });

    it('should render tool label for CreateNote', () => {
      render(<ToolExecutionCard execution={createMockExecution({ tool: 'CreateNote' })} />, {
        wrapper: createWrapper(),
      });
      expect(screen.getByText('Creating Note')).toBeInTheDocument();
    });

    it('should render tool label for UpdateNote', () => {
      render(<ToolExecutionCard execution={createMockExecution({ tool: 'UpdateNote' })} />, {
        wrapper: createWrapper(),
      });
      expect(screen.getByText('Updating Note')).toBeInTheDocument();
    });

    it('should render tool label for GetNote', () => {
      render(<ToolExecutionCard execution={createMockExecution({ tool: 'GetNote' })} />, {
        wrapper: createWrapper(),
      });
      expect(screen.getByText('Reading Note')).toBeInTheDocument();
    });

    it('should render tool label for ListRecentNotes', () => {
      render(<ToolExecutionCard execution={createMockExecution({ tool: 'ListRecentNotes' })} />, {
        wrapper: createWrapper(),
      });
      expect(screen.getByText('Listing Notes')).toBeInTheDocument();
    });

    it('should render tool label for GetNoteStats', () => {
      render(<ToolExecutionCard execution={createMockExecution({ tool: 'GetNoteStats' })} />, {
        wrapper: createWrapper(),
      });
      expect(screen.getByText('Getting Note Statistics')).toBeInTheDocument();
    });

    it('should render tool label for DeleteNote', () => {
      render(<ToolExecutionCard execution={createMockExecution({ tool: 'DeleteNote' })} />, {
        wrapper: createWrapper(),
      });
      expect(screen.getByText('Deleting Note')).toBeInTheDocument();
    });

    it('should render tool label for ArchiveNote', () => {
      render(<ToolExecutionCard execution={createMockExecution({ tool: 'ArchiveNote' })} />, {
        wrapper: createWrapper(),
      });
      expect(screen.getByText('Archiving Note')).toBeInTheDocument();
    });

    it('should render tool label for SemanticSearch', () => {
      render(<ToolExecutionCard execution={createMockExecution({ tool: 'SemanticSearch' })} />, {
        wrapper: createWrapper(),
      });
      expect(screen.getByText('Semantic Search (RAG)')).toBeInTheDocument();
    });

    it('should render default label for unknown tool', () => {
      render(<ToolExecutionCard execution={createMockExecution({ tool: 'UnknownTool' })} />, {
        wrapper: createWrapper(),
      });
      expect(screen.getByText('UnknownTool')).toBeInTheDocument();
    });

    it('should render timestamp', () => {
      render(<ToolExecutionCard execution={createMockExecution()} />, {
        wrapper: createWrapper(),
      });
      const button = screen.getByRole('button');
      expect(button.textContent).toContain(':');
    });
  });

  // ============================================
  // Status Tests
  // ============================================
  describe('status display', () => {
    it('should show "Running..." when status is executing', () => {
      render(
        <ToolExecutionCard execution={createMockExecution({ status: 'executing' })} />,
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('Running...')).toBeInTheDocument();
    });

    it('should show "Done" when status is completed', () => {
      render(
        <ToolExecutionCard execution={createMockExecution({ status: 'completed' })} />,
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('Done')).toBeInTheDocument();
    });

    it('should show "Done" when status is failed', () => {
      render(
        <ToolExecutionCard execution={createMockExecution({ status: 'failed' })} />,
        { wrapper: createWrapper() }
      );
      expect(screen.getByText('Done')).toBeInTheDocument();
    });

    it('should have animate-pulse class on icon when executing', () => {
      const { container } = render(
        <ToolExecutionCard execution={createMockExecution({ status: 'executing' })} />,
        { wrapper: createWrapper() }
      );
      const iconContainer = container.querySelector('.absolute.left-2\\.5');
      expect(iconContainer).toHaveClass('animate-pulse');
    });
  });

  // ============================================
  // Expand/Collapse Tests
  // ============================================
  describe('expand and collapse', () => {
    it('should be collapsed by default', () => {
      render(
        <ToolExecutionCard execution={createMockExecution({ result: 'Some result' })} />,
        { wrapper: createWrapper() }
      );
      expect(screen.queryByText('Some result')).not.toBeInTheDocument();
    });

    it('should expand when clicked', () => {
      render(
        <ToolExecutionCard execution={createMockExecution({ result: 'Test result' })} />,
        { wrapper: createWrapper() }
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByText('Test result')).toBeInTheDocument();
    });

    it('should collapse when clicked again', () => {
      render(
        <ToolExecutionCard execution={createMockExecution({ result: 'Test result' })} />,
        { wrapper: createWrapper() }
      );

      const button = screen.getByRole('button');
      fireEvent.click(button); // Expand
      fireEvent.click(button); // Collapse

      expect(screen.queryByText('Test result')).not.toBeInTheDocument();
    });

    it('should show chevron rotation when expanded', () => {
      const { container } = render(
        <ToolExecutionCard execution={createMockExecution()} />,
        { wrapper: createWrapper() }
      );

      const button = screen.getByRole('button');
      const chevron = button.querySelector('svg:last-of-type');

      expect(chevron).not.toHaveClass('rotate-180');

      fireEvent.click(button);
      expect(chevron).toHaveClass('rotate-180');
    });
  });

  // ============================================
  // Notes Result Tests
  // ============================================
  describe('notes result parsing', () => {
    it('should parse and display notes result', () => {
      const notesResult = JSON.stringify({
        type: 'notes',
        message: 'Found 2 notes',
        notes: [
          { id: '1', title: 'Note 1', content: 'Content 1', tags: [], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
          { id: '2', title: 'Note 2', content: 'Content 2', tags: [], createdAt: '2024-01-01', updatedAt: '2024-01-01' },
        ],
      });

      render(
        <ToolExecutionCard execution={createMockExecution({ result: notesResult })} />,
        { wrapper: createWrapper() }
      );

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Found 2 notes')).toBeInTheDocument();
      expect(screen.getByText('Note 1')).toBeInTheDocument();
      expect(screen.getByText('Note 2')).toBeInTheDocument();
    });
  });

  // ============================================
  // Stats Result Tests
  // ============================================
  describe('stats result parsing', () => {
    it('should parse and display stats result', () => {
      const statsResult = JSON.stringify({
        type: 'stats',
        message: 'Note statistics retrieved',
        statistics: {
          totalNotes: 100,
          activeNotes: 80,
          archivedNotes: 20,
          notesCreatedThisWeek: 5,
          notesCreatedThisMonth: 15,
          notesWithTags: 60,
          notesInFolders: 40,
          uniqueTagCount: 25,
          uniqueFolderCount: 10,
          topTags: [{ name: 'work', count: 30 }],
          topFolders: [{ name: 'Projects', count: 20 }],
        },
      });

      render(
        <ToolExecutionCard execution={createMockExecution({ result: statsResult })} />,
        { wrapper: createWrapper() }
      );

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Note statistics retrieved')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument(); // totalNotes
      expect(screen.getByText('80')).toBeInTheDocument(); // activeNotes
    });

    it('should display top tags in stats', () => {
      const statsResult = JSON.stringify({
        type: 'stats',
        message: 'Stats',
        statistics: {
          totalNotes: 10,
          activeNotes: 8,
          archivedNotes: 2,
          notesCreatedThisWeek: 1,
          notesCreatedThisMonth: 3,
          notesWithTags: 5,
          notesInFolders: 3,
          uniqueTagCount: 5,
          uniqueFolderCount: 2,
          topTags: [{ name: 'important', count: 5 }, { name: 'todo', count: 3 }],
          topFolders: [],
        },
      });

      render(
        <ToolExecutionCard execution={createMockExecution({ result: statsResult })} />,
        { wrapper: createWrapper() }
      );

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('important')).toBeInTheDocument();
      expect(screen.getByText('todo')).toBeInTheDocument();
    });

    it('should display top folders in stats', () => {
      const statsResult = JSON.stringify({
        type: 'stats',
        message: 'Stats',
        statistics: {
          totalNotes: 10,
          activeNotes: 8,
          archivedNotes: 2,
          notesCreatedThisWeek: 1,
          notesCreatedThisMonth: 3,
          notesWithTags: 5,
          notesInFolders: 3,
          uniqueTagCount: 5,
          uniqueFolderCount: 2,
          topTags: [],
          topFolders: [{ name: 'Projects', count: 5 }],
        },
      });

      render(
        <ToolExecutionCard execution={createMockExecution({ result: statsResult })} />,
        { wrapper: createWrapper() }
      );

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Projects')).toBeInTheDocument();
    });
  });

  // ============================================
  // Single Note Result Tests
  // ============================================
  describe('single note result parsing', () => {
    it('should parse and display single note result', () => {
      const noteResult = JSON.stringify({
        type: 'note',
        message: 'Note retrieved successfully',
        note: {
          id: 'note-123',
          title: 'My Test Note',
          content: 'This is the content',
          tags: ['test'],
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      });

      render(
        <ToolExecutionCard execution={createMockExecution({ result: noteResult })} />,
        { wrapper: createWrapper() }
      );

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Note retrieved successfully')).toBeInTheDocument();
      expect(screen.getByText('My Test Note')).toBeInTheDocument();
    });
  });

  // ============================================
  // Generic Result Tests
  // ============================================
  describe('generic result parsing', () => {
    it('should parse and display generic response', () => {
      const genericResult = JSON.stringify({
        type: 'success',
        message: 'Operation completed successfully',
      });

      render(
        <ToolExecutionCard execution={createMockExecution({ result: genericResult })} />,
        { wrapper: createWrapper() }
      );

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();
    });

    it('should display additional properties in generic response', () => {
      const genericResult = JSON.stringify({
        type: 'success',
        message: 'Done',
        count: 5,
        affected: true,
      });

      render(
        <ToolExecutionCard execution={createMockExecution({ result: genericResult })} />,
        { wrapper: createWrapper() }
      );

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('count:')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  // ============================================
  // Plain Text Result Tests
  // ============================================
  describe('plain text result', () => {
    it('should display plain text for non-JSON result', () => {
      render(
        <ToolExecutionCard execution={createMockExecution({ result: 'Plain text result here' })} />,
        { wrapper: createWrapper() }
      );

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Plain text result here')).toBeInTheDocument();
    });

    it('should display "No output" when result is empty and not executing', () => {
      render(
        <ToolExecutionCard execution={createMockExecution({ result: '', status: 'completed' })} />,
        { wrapper: createWrapper() }
      );

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('No output')).toBeInTheDocument();
    });

    it('should handle invalid JSON gracefully', () => {
      render(
        <ToolExecutionCard execution={createMockExecution({ result: '{invalid json' })} />,
        { wrapper: createWrapper() }
      );

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText('{invalid json')).toBeInTheDocument();
    });
  });

  // ============================================
  // Icon Tests
  // ============================================
  describe('tool icons', () => {
    it('should render different icons for different tools', () => {
      const tools = ['CreateNote', 'SearchNotes', 'UpdateNote', 'GetNote', 'DeleteNote'];

      tools.forEach((tool) => {
        const { container, unmount } = render(
          <ToolExecutionCard execution={createMockExecution({ tool })} />,
          { wrapper: createWrapper() }
        );

        const iconContainer = container.querySelector('.absolute.left-2\\.5');
        expect(iconContainer).toBeInTheDocument();
        expect(iconContainer?.querySelector('svg')).toBeInTheDocument();

        unmount();
      });
    });
  });

  // ============================================
  // Memoization Tests
  // ============================================
  describe('memoization', () => {
    it('should be memoized component', () => {
      const execution = createMockExecution();
      const { rerender } = render(
        <ToolExecutionCard execution={execution} />,
        { wrapper: createWrapper() }
      );

      rerender(<ToolExecutionCard execution={execution} />);
      expect(screen.getByText('Searching Notes')).toBeInTheDocument();
    });
  });
});
