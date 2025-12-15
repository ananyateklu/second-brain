/**
 * Note Version Hooks Tests
 * Comprehensive tests for note versioning functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/mocks/server';
// Note: mockVersionHistory is defined in handlers.ts and used via the server mock handlers
import type { } from '../../../test/mocks/handlers';
import {
  useNoteVersionHistory,
  useNoteVersionDiff,
  useRestoreNoteVersion,
  usePrefetchVersionHistory,
  useInvalidateVersionQueries,
} from './use-note-versions';

// Create a wrapper component with QueryClientProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useNoteVersionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch version history for a note', async () => {
    const { result } = renderHook(() => useNoteVersionHistory('note-1'), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for data
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify data structure
    expect(result.current.data).toBeDefined();
    expect(result.current.data?.noteId).toBe('note-1');
    expect(result.current.data?.totalVersions).toBe(3);
    expect(result.current.data?.currentVersion).toBe(3);
    expect(result.current.data?.versions).toHaveLength(3);
  });

  it('should return versions with correct source tracking', async () => {
    const { result } = renderHook(() => useNoteVersionHistory('note-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const versions = result.current.data?.versions || [];

    // Version 1: created via web
    const v1 = versions.find((v) => v.versionNumber === 1);
    expect(v1?.source).toBe('web');
    expect(v1?.changeSummary).toBe('Initial version');

    // Version 2: created by agent
    const v2 = versions.find((v) => v.versionNumber === 2);
    expect(v2?.source).toBe('agent');

    // Version 3: current version via web
    const v3 = versions.find((v) => v.versionNumber === 3);
    expect(v3?.source).toBe('web');
    expect(v3?.isCurrent).toBe(true);
  });

  it('should not fetch when disabled', () => {
    const { result } = renderHook(
      () => useNoteVersionHistory('note-1', false),
      { wrapper: createWrapper() }
    );

    // Should not be loading or have data
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.isFetching).toBe(false);
  });

  it('should handle non-existent note gracefully', async () => {
    // Override handler to return 404
    server.use(
      http.get('/api/notes/:id/versions', () => {
        return new HttpResponse(null, { status: 404 });
      })
    );

    const { result } = renderHook(() => useNoteVersionHistory('non-existent'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useNoteVersionDiff', () => {
  it('should fetch diff between two versions', async () => {
    const { result } = renderHook(
      () => useNoteVersionDiff('note-1', 1, 2, true),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.noteId).toBe('note-1');
    expect(result.current.data?.fromVersion.versionNumber).toBe(1);
    expect(result.current.data?.toVersion.versionNumber).toBe(2);
  });

  it('should detect title changes between versions', async () => {
    const { result } = renderHook(
      () => useNoteVersionDiff('note-1', 1, 2, true),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Version 1 has "First Note", Version 2 has "Updated Title v2"
    expect(result.current.data?.titleChanged).toBe(true);
    expect(result.current.data?.fromVersion.title).toBe('First Note');
    expect(result.current.data?.toVersion.title).toBe('Updated Title v2');
  });

  it('should detect content changes between versions', async () => {
    const { result } = renderHook(
      () => useNoteVersionDiff('note-1', 1, 2, true),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.contentChanged).toBe(true);
  });

  it('should detect tag additions and removals', async () => {
    const { result } = renderHook(
      () => useNoteVersionDiff('note-1', 2, 3, true),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Version 2 has ['work', 'important'], Version 3 has ['work', 'important', 'updated']
    expect(result.current.data?.tagsChanged).toBe(true);
    expect(result.current.data?.tagsAdded).toContain('updated');
    expect(result.current.data?.tagsRemoved).toHaveLength(0);
  });

  it('should not fetch when fromVersion equals toVersion', () => {
    const { result } = renderHook(
      () => useNoteVersionDiff('note-1', 1, 1, true),
      { wrapper: createWrapper() }
    );

    // Should not fetch when versions are the same
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(false);
  });
});

describe('useRestoreNoteVersion', () => {
  it('should restore note to a previous version', async () => {
    const { result } = renderHook(() => useRestoreNoteVersion(), {
      wrapper: createWrapper(),
    });

    // Execute mutation
    result.current.mutate({ noteId: 'note-1', targetVersion: 1 });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Check response
    expect(result.current.data).toBeDefined();
    expect(result.current.data?.message).toContain('restored to version 1');
    expect(result.current.data?.newVersionNumber).toBe(4);
    expect(result.current.data?.noteId).toBe('note-1');
  });

  it('should handle restore errors gracefully', async () => {
    // Override handler to return error
    server.use(
      http.post('/api/notes/:id/versions/restore', () => {
        return new HttpResponse(JSON.stringify({ message: 'Version not found' }), {
          status: 404,
        });
      })
    );

    const { result } = renderHook(() => useRestoreNoteVersion(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ noteId: 'note-1', targetVersion: 999 });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('Version Source Tracking', () => {
  it('should correctly identify web source versions', async () => {
    const { result } = renderHook(() => useNoteVersionHistory('note-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const webVersions = result.current.data?.versions.filter((v) => v.source === 'web') || [];
    expect(webVersions.length).toBeGreaterThan(0);
  });

  it('should correctly identify agent source versions', async () => {
    const { result } = renderHook(() => useNoteVersionHistory('note-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const agentVersions = result.current.data?.versions.filter((v) => v.source === 'agent') || [];
    expect(agentVersions.length).toBeGreaterThan(0);
    expect(agentVersions[0].versionNumber).toBe(2);
  });

  it('should track version sources for all modification types', async () => {
    const { result } = renderHook(() => useNoteVersionHistory('note-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const versions = result.current.data?.versions || [];

    // All versions should have a valid source
    versions.forEach((version) => {
      expect(['web', 'agent', 'ios_notes', 'import', 'system', 'restored']).toContain(version.source);
    });
  });
});

describe('Version History Timeline', () => {
  it('should return versions in correct order (newest first)', async () => {
    const { result } = renderHook(() => useNoteVersionHistory('note-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const versions = result.current.data?.versions || [];
    expect(versions[0].versionNumber).toBe(3); // Newest
    expect(versions[versions.length - 1].versionNumber).toBe(1); // Oldest
  });

  it('should mark current version correctly', async () => {
    const { result } = renderHook(() => useNoteVersionHistory('note-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const versions = result.current.data?.versions || [];
    const currentVersions = versions.filter((v) => v.isCurrent);
    expect(currentVersions).toHaveLength(1);
    expect(currentVersions[0].versionNumber).toBe(result.current.data?.currentVersion);
  });

  it('should have valid time ranges for each version', async () => {
    const { result } = renderHook(() => useNoteVersionHistory('note-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const versions = result.current.data?.versions || [];

    versions.forEach((version) => {
      expect(version.validFrom).toBeDefined();
      expect(version.createdAt).toBeDefined();

      // Only current version should have null validTo
      if (version.isCurrent) {
        expect(version.validTo).toBeNull();
      } else {
        expect(version.validTo).toBeDefined();
      }
    });
  });
});

describe('usePrefetchVersionHistory', () => {
  it('should provide a prefetch function', () => {
    const { result } = renderHook(() => usePrefetchVersionHistory(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current).toBe('function');
  });
});

describe('useInvalidateVersionQueries', () => {
  it('should provide an invalidate function', () => {
    const { result } = renderHook(() => useInvalidateVersionQueries(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current).toBe('function');
  });
});
