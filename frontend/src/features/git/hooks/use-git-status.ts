/**
 * Git Status Hook
 * Fetches and manages Git repository status
 */

import { useQuery } from '@tanstack/react-query';
import { useBoundStore } from '../../../store/bound-store';
import { gitService } from '../../../services';
import { gitKeys } from '../../../lib/query-keys';
import type { GitStatus, GitDiffResult } from '../../../types/git';

/**
 * Hook to fetch Git repository status
 * Automatically refetches every 5 seconds when repo is configured
 */
export const useGitStatus = () => {
  const repositoryPath = useBoundStore((state) => state.repositoryPath);

  return useQuery<GitStatus>({
    queryKey: gitKeys.status(repositoryPath ?? ''),
    queryFn: () => {
      if (!repositoryPath) throw new Error('Repository path is required');
      return gitService.getStatus(repositoryPath);
    },
    enabled: !!repositoryPath,
    refetchInterval: 5000, // Refresh every 5 seconds
    staleTime: 2000, // Consider data stale after 2 seconds
  });
};

/**
 * Hook to validate a repository path
 */
export const useValidateRepository = (repoPath: string | null) => {
  return useQuery<boolean>({
    queryKey: gitKeys.validate(repoPath ?? ''),
    queryFn: () => {
      if (!repoPath) throw new Error('Repository path is required');
      return gitService.validateRepository(repoPath);
    },
    enabled: !!repoPath,
    retry: false,
    staleTime: 30000, // Cache validation for 30 seconds
  });
};

/**
 * Hook to fetch file diff
 */
export const useGitDiff = (filePath: string | null, staged = false) => {
  const repositoryPath = useBoundStore((state) => state.repositoryPath);

  return useQuery<GitDiffResult>({
    queryKey: gitKeys.diff(repositoryPath ?? '', filePath ?? '', staged),
    queryFn: () => {
      if (!repositoryPath || !filePath) {
        throw new Error('Repository path and file path are required');
      }
      return gitService.getDiff(repositoryPath, filePath, staged);
    },
    enabled: !!repositoryPath && !!filePath,
    staleTime: 5000,
  });
};

/**
 * Hook to fetch commit log
 */
export const useGitLog = (count = 20) => {
  const repositoryPath = useBoundStore((state) => state.repositoryPath);

  return useQuery({
    queryKey: gitKeys.log(repositoryPath ?? '', count),
    queryFn: () => {
      if (!repositoryPath) throw new Error('Repository path is required');
      return gitService.getLog(repositoryPath, count);
    },
    enabled: !!repositoryPath,
    staleTime: 10000, // Log doesn't change as often
  });
};

/**
 * Hook to get currently selected diff
 */
export const useSelectedDiff = () => {
  const selectedDiffFile = useBoundStore((state) => state.selectedDiffFile);
  const viewingStagedDiff = useBoundStore((state) => state.viewingStagedDiff);

  return useGitDiff(selectedDiffFile, viewingStagedDiff);
};
