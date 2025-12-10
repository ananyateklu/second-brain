/**
 * Git Mutation Hooks
 * Handles Git write operations (stage, unstage, commit, push, pull)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBoundStore } from '../../../store/bound-store';
import { gitService } from '../../../services';
import { gitKeys } from '../../../lib/query-keys';
import { toast } from '../../../hooks/use-toast';
import type {
  GitStageRequest,
  GitUnstageRequest,
  GitCommitRequest,
  GitRemoteRequest,
  GitCommitResult,
  GitOperationResult,
  GitDiffRequest,
} from '../../../types/git';

/**
 * Hook to stage files
 */
export const useStageFiles = () => {
  const queryClient = useQueryClient();
  const repositoryPath = useBoundStore((state) => state.repositoryPath);
  const clearSelection = useBoundStore((state) => state.clearSelection);

  return useMutation({
    mutationFn: (files: string[]) => {
      if (!repositoryPath) throw new Error('No repository configured');
      const request: GitStageRequest = { repoPath: repositoryPath, files };
      return gitService.stageFiles(request);
    },
    onSuccess: () => {
      // Invalidate status to refresh file lists
      void queryClient.invalidateQueries({ queryKey: gitKeys.status(repositoryPath ?? '') });
      clearSelection();
      toast.success('Files staged', 'Files have been staged for commit');
    },
    onError: (error: Error) => {
      toast.error('Stage failed', error.message);
    },
  });
};

/**
 * Hook to stage all files
 */
export const useStageAll = () => {
  const queryClient = useQueryClient();
  const repositoryPath = useBoundStore((state) => state.repositoryPath);

  return useMutation({
    mutationFn: () => {
      if (!repositoryPath) throw new Error('No repository configured');
      return gitService.stageAll(repositoryPath);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: gitKeys.status(repositoryPath ?? '') });
      toast.success('All files staged', 'All changes have been staged for commit');
    },
    onError: (error: Error) => {
      toast.error('Stage all failed', error.message);
    },
  });
};

/**
 * Hook to unstage files
 */
export const useUnstageFiles = () => {
  const queryClient = useQueryClient();
  const repositoryPath = useBoundStore((state) => state.repositoryPath);
  const clearSelection = useBoundStore((state) => state.clearSelection);

  return useMutation({
    mutationFn: (files: string[]) => {
      if (!repositoryPath) throw new Error('No repository configured');
      const request: GitUnstageRequest = { repoPath: repositoryPath, files };
      return gitService.unstageFiles(request);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: gitKeys.status(repositoryPath ?? '') });
      clearSelection();
      toast.success('Files unstaged', 'Files have been unstaged');
    },
    onError: (error: Error) => {
      toast.error('Unstage failed', error.message);
    },
  });
};

/**
 * Hook to unstage all files
 */
export const useUnstageAll = () => {
  const queryClient = useQueryClient();
  const repositoryPath = useBoundStore((state) => state.repositoryPath);

  return useMutation({
    mutationFn: () => {
      if (!repositoryPath) throw new Error('No repository configured');
      return gitService.unstageAll(repositoryPath);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: gitKeys.status(repositoryPath ?? '') });
      toast.success('All files unstaged', 'All staged changes have been unstaged');
    },
    onError: (error: Error) => {
      toast.error('Unstage all failed', error.message);
    },
  });
};

/**
 * Hook to create a commit
 */
export const useCommit = () => {
  const queryClient = useQueryClient();
  const repositoryPath = useBoundStore((state) => state.repositoryPath);

  return useMutation<GitCommitResult, Error, string>({
    mutationFn: (message: string) => {
      if (!repositoryPath) throw new Error('No repository configured');
      const request: GitCommitRequest = { repoPath: repositoryPath, message };
      return gitService.commit(request);
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: gitKeys.status(repositoryPath ?? '') });
      void queryClient.invalidateQueries({ queryKey: gitKeys.log(repositoryPath ?? '') });
      toast.success('Commit created', `Commit ${result.commitHash?.substring(0, 7) ?? ''} created successfully`);
    },
    onError: (error: Error) => {
      toast.error('Commit failed', error.message);
    },
  });
};

/**
 * Hook to push to remote
 */
export const usePush = () => {
  const queryClient = useQueryClient();
  const repositoryPath = useBoundStore((state) => state.repositoryPath);

  return useMutation<GitOperationResult, Error, Partial<GitRemoteRequest>>({
    mutationFn: (options = {}) => {
      if (!repositoryPath) throw new Error('No repository configured');
      const request: GitRemoteRequest = { repoPath: repositoryPath, ...options };
      return gitService.push(request);
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: gitKeys.status(repositoryPath ?? '') });
      if (result.success) {
        toast.success('Push successful', result.message || 'Changes pushed to remote');
      } else {
        toast.error('Push warning', result.error || result.message);
      }
    },
    onError: (error: Error) => {
      toast.error('Push failed', error.message);
    },
  });
};

/**
 * Hook to pull from remote
 */
export const usePull = () => {
  const queryClient = useQueryClient();
  const repositoryPath = useBoundStore((state) => state.repositoryPath);

  return useMutation<GitOperationResult, Error, Partial<GitRemoteRequest>>({
    mutationFn: (options = {}) => {
      if (!repositoryPath) throw new Error('No repository configured');
      const request: GitRemoteRequest = { repoPath: repositoryPath, ...options };
      return gitService.pull(request);
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: gitKeys.status(repositoryPath ?? '') });
      void queryClient.invalidateQueries({ queryKey: gitKeys.log(repositoryPath ?? '') });
      if (result.success) {
        toast.success('Pull successful', result.message || 'Changes pulled from remote');
      } else {
        toast.error('Pull warning', result.error || result.message);
      }
    },
    onError: (error: Error) => {
      toast.error('Pull failed', error.message);
    },
  });
};

/**
 * Hook to discard file changes
 */
export const useDiscardChanges = () => {
  const queryClient = useQueryClient();
  const repositoryPath = useBoundStore((state) => state.repositoryPath);

  return useMutation({
    mutationFn: (filePath: string) => {
      if (!repositoryPath) throw new Error('No repository configured');
      const request: GitDiffRequest = { repoPath: repositoryPath, filePath };
      return gitService.discardChanges(request);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: gitKeys.status(repositoryPath ?? '') });
      toast.success('Changes discarded', 'File restored to last committed state');
    },
    onError: (error: Error) => {
      toast.error('Discard failed', error.message);
    },
  });
};
