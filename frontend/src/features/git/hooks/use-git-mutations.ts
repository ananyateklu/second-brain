/**
 * Git Mutation Hooks
 * Handles Git write operations (stage, unstage, commit, push, pull)
 *
 * Performance optimizations:
 * - Optimistic updates for instant UI feedback on stage/unstage
 * - Automatic rollback on error
 * - Background refetch to sync with actual state
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBoundStore } from '../../../store/bound-store';
import { gitService } from '../../../services';
import { gitKeys } from '../../../lib/query-keys';
import { toast } from '../../../hooks/use-toast';
import type {
  GitStatus,
  GitStageRequest,
  GitUnstageRequest,
  GitCommitRequest,
  GitRemoteRequest,
  GitCommitResult,
  GitOperationResult,
  GitDiffRequest,
  GitSwitchBranchRequest,
  GitCreateBranchRequest,
  GitDeleteBranchRequest,
  GitMergeBranchRequest,
  GitPublishBranchRequest,
  GitFileChange,
} from '../../../types/git';

/**
 * Helper to compute derived status fields
 */
const computeStatusFields = (status: GitStatus): GitStatus => ({
  ...status,
  hasChanges: status.stagedChanges.length > 0 || status.unstagedChanges.length > 0 || status.untrackedFiles.length > 0,
  hasStagedChanges: status.stagedChanges.length > 0,
  totalChanges: status.stagedChanges.length + status.unstagedChanges.length + status.untrackedFiles.length,
});

/**
 * Hook to stage files with optimistic updates
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
    // Optimistic update - instantly move files from unstaged/untracked to staged
    onMutate: async (files: string[]) => {
      if (!repositoryPath) return;

      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: gitKeys.status(repositoryPath) });

      // Snapshot the previous value for rollback
      const previousStatus = queryClient.getQueryData<GitStatus>(gitKeys.status(repositoryPath));

      if (previousStatus) {
        // Optimistically update the cache
        queryClient.setQueryData<GitStatus>(gitKeys.status(repositoryPath), (old) => {
          if (!old) return old;

          const filesToStage = new Set(files);
          const isStageAll = files.includes('.');

          // Find files to move to staged
          const unstagedToStage = isStageAll
            ? old.unstagedChanges
            : old.unstagedChanges.filter(f => filesToStage.has(f.filePath));
          const untrackedToStage = isStageAll
            ? old.untrackedFiles
            : old.untrackedFiles.filter(f => filesToStage.has(f.filePath));

          // Convert untracked files to "Added" status when staged
          const convertedUntracked: GitFileChange[] = untrackedToStage.map(f => ({
            ...f,
            status: 'A' as const,
            statusDescription: 'Added',
          }));

          const newStatus: GitStatus = {
            ...old,
            stagedChanges: [...old.stagedChanges, ...unstagedToStage, ...convertedUntracked],
            unstagedChanges: isStageAll
              ? []
              : old.unstagedChanges.filter(f => !filesToStage.has(f.filePath)),
            untrackedFiles: isStageAll
              ? []
              : old.untrackedFiles.filter(f => !filesToStage.has(f.filePath)),
          };

          return computeStatusFields(newStatus);
        });
      }

      return { previousStatus };
    },
    onError: (error: Error, _files, context) => {
      // Rollback to previous state on error
      if (context?.previousStatus && repositoryPath) {
        queryClient.setQueryData(gitKeys.status(repositoryPath), context.previousStatus);
      }
      toast.error('Stage failed', error.message);
    },
    onSuccess: () => {
      clearSelection();
      // Silently refetch in background to ensure consistency (no toast needed on success for snappy feel)
    },
    onSettled: () => {
      // Always refetch after mutation settles to ensure server state consistency
      if (repositoryPath) {
        void queryClient.invalidateQueries({ queryKey: gitKeys.status(repositoryPath) });
      }
    },
  });
};

/**
 * Hook to stage all files with optimistic updates
 */
export const useStageAll = () => {
  const queryClient = useQueryClient();
  const repositoryPath = useBoundStore((state) => state.repositoryPath);

  return useMutation({
    mutationFn: () => {
      if (!repositoryPath) throw new Error('No repository configured');
      return gitService.stageAll(repositoryPath);
    },
    onMutate: async () => {
      if (!repositoryPath) return;

      await queryClient.cancelQueries({ queryKey: gitKeys.status(repositoryPath) });
      const previousStatus = queryClient.getQueryData<GitStatus>(gitKeys.status(repositoryPath));

      if (previousStatus) {
        queryClient.setQueryData<GitStatus>(gitKeys.status(repositoryPath), (old) => {
          if (!old) return old;

          // Convert untracked to Added when staged
          const convertedUntracked: GitFileChange[] = old.untrackedFiles.map(f => ({
            ...f,
            status: 'A' as const,
            statusDescription: 'Added',
          }));

          const newStatus: GitStatus = {
            ...old,
            stagedChanges: [...old.stagedChanges, ...old.unstagedChanges, ...convertedUntracked],
            unstagedChanges: [],
            untrackedFiles: [],
          };

          return computeStatusFields(newStatus);
        });
      }

      return { previousStatus };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousStatus && repositoryPath) {
        queryClient.setQueryData(gitKeys.status(repositoryPath), context.previousStatus);
      }
      toast.error('Stage all failed', error.message);
    },
    onSettled: () => {
      if (repositoryPath) {
        void queryClient.invalidateQueries({ queryKey: gitKeys.status(repositoryPath) });
      }
    },
  });
};

/**
 * Hook to unstage files with optimistic updates
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
    onMutate: async (files: string[]) => {
      if (!repositoryPath) return;

      await queryClient.cancelQueries({ queryKey: gitKeys.status(repositoryPath) });
      const previousStatus = queryClient.getQueryData<GitStatus>(gitKeys.status(repositoryPath));

      if (previousStatus) {
        queryClient.setQueryData<GitStatus>(gitKeys.status(repositoryPath), (old) => {
          if (!old) return old;

          const filesToUnstage = new Set(files);
          const isUnstageAll = files.includes('.');

          // Find files to move from staged to unstaged
          const stagedToUnstage = isUnstageAll
            ? old.stagedChanges
            : old.stagedChanges.filter(f => filesToUnstage.has(f.filePath));

          // Determine which files go to unstaged vs untracked
          // Files with status 'A' that were untracked go back to untracked
          const toUntracked: GitFileChange[] = stagedToUnstage
            .filter(f => f.status === 'A')
            .map(f => ({
              ...f,
              status: '?' as const,
              statusDescription: 'Untracked',
            }));

          const toUnstaged: GitFileChange[] = stagedToUnstage
            .filter(f => f.status !== 'A');

          const newStatus: GitStatus = {
            ...old,
            stagedChanges: isUnstageAll
              ? []
              : old.stagedChanges.filter(f => !filesToUnstage.has(f.filePath)),
            unstagedChanges: [...old.unstagedChanges, ...toUnstaged],
            untrackedFiles: [...old.untrackedFiles, ...toUntracked],
          };

          return computeStatusFields(newStatus);
        });
      }

      return { previousStatus };
    },
    onError: (error: Error, _files, context) => {
      if (context?.previousStatus && repositoryPath) {
        queryClient.setQueryData(gitKeys.status(repositoryPath), context.previousStatus);
      }
      toast.error('Unstage failed', error.message);
    },
    onSuccess: () => {
      clearSelection();
    },
    onSettled: () => {
      if (repositoryPath) {
        void queryClient.invalidateQueries({ queryKey: gitKeys.status(repositoryPath) });
      }
    },
  });
};

/**
 * Hook to unstage all files with optimistic updates
 */
export const useUnstageAll = () => {
  const queryClient = useQueryClient();
  const repositoryPath = useBoundStore((state) => state.repositoryPath);

  return useMutation({
    mutationFn: () => {
      if (!repositoryPath) throw new Error('No repository configured');
      return gitService.unstageAll(repositoryPath);
    },
    onMutate: async () => {
      if (!repositoryPath) return;

      await queryClient.cancelQueries({ queryKey: gitKeys.status(repositoryPath) });
      const previousStatus = queryClient.getQueryData<GitStatus>(gitKeys.status(repositoryPath));

      if (previousStatus) {
        queryClient.setQueryData<GitStatus>(gitKeys.status(repositoryPath), (old) => {
          if (!old) return old;

          // Separate Added files (go back to untracked) from Modified/Deleted (go to unstaged)
          const toUntracked: GitFileChange[] = old.stagedChanges
            .filter(f => f.status === 'A')
            .map(f => ({
              ...f,
              status: '?' as const,
              statusDescription: 'Untracked',
            }));

          const toUnstaged: GitFileChange[] = old.stagedChanges
            .filter(f => f.status !== 'A');

          const newStatus: GitStatus = {
            ...old,
            stagedChanges: [],
            unstagedChanges: [...old.unstagedChanges, ...toUnstaged],
            untrackedFiles: [...old.untrackedFiles, ...toUntracked],
          };

          return computeStatusFields(newStatus);
        });
      }

      return { previousStatus };
    },
    onError: (error: Error, _, context) => {
      if (context?.previousStatus && repositoryPath) {
        queryClient.setQueryData(gitKeys.status(repositoryPath), context.previousStatus);
      }
      toast.error('Unstage all failed', error.message);
    },
    onSettled: () => {
      if (repositoryPath) {
        void queryClient.invalidateQueries({ queryKey: gitKeys.status(repositoryPath) });
      }
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

/**
 * Hook to switch to a different branch
 */
export const useSwitchBranch = () => {
  const queryClient = useQueryClient();
  const repositoryPath = useBoundStore((state) => state.repositoryPath);

  return useMutation({
    mutationFn: (branchName: string) => {
      if (!repositoryPath) throw new Error('No repository configured');
      const request: GitSwitchBranchRequest = { repoPath: repositoryPath, branchName };
      return gitService.switchBranch(request);
    },
    onSuccess: (_, branchName) => {
      void queryClient.invalidateQueries({ queryKey: gitKeys.status(repositoryPath ?? '') });
      // Invalidate all branch queries regardless of includeRemote parameter
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'git' &&
          query.queryKey[1] === 'branches' &&
          query.queryKey[2] === repositoryPath,
      });
      toast.success('Branch switched', `Switched to branch "${branchName}"`);
    },
    onError: (error: Error) => {
      toast.error('Switch branch failed', error.message);
    },
  });
};

/**
 * Hook to create a new branch
 */
export const useCreateBranch = () => {
  const queryClient = useQueryClient();
  const repositoryPath = useBoundStore((state) => state.repositoryPath);

  return useMutation({
    mutationFn: (options: { branchName: string; switchToNewBranch?: boolean; baseBranch?: string }) => {
      if (!repositoryPath) throw new Error('No repository configured');
      const request: GitCreateBranchRequest = {
        repoPath: repositoryPath,
        branchName: options.branchName,
        switchToNewBranch: options.switchToNewBranch ?? true,
        baseBranch: options.baseBranch,
      };
      return gitService.createBranch(request);
    },
    onSuccess: (_, options) => {
      void queryClient.invalidateQueries({ queryKey: gitKeys.status(repositoryPath ?? '') });
      // Invalidate all branch queries regardless of includeRemote parameter
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'git' &&
          query.queryKey[1] === 'branches' &&
          query.queryKey[2] === repositoryPath,
      });
      toast.success('Branch created', `Branch "${options.branchName}" created successfully`);
    },
    onError: (error: Error) => {
      toast.error('Create branch failed', error.message);
    },
  });
};

/**
 * Hook to delete a branch
 */
export const useDeleteBranch = () => {
  const queryClient = useQueryClient();
  const repositoryPath = useBoundStore((state) => state.repositoryPath);

  return useMutation({
    mutationFn: (options: { branchName: string; force?: boolean }) => {
      if (!repositoryPath) throw new Error('No repository configured');
      const request: GitDeleteBranchRequest = {
        repoPath: repositoryPath,
        branchName: options.branchName,
        force: options.force,
      };
      return gitService.deleteBranch(request);
    },
    onSuccess: (_, options) => {
      // Invalidate all branch queries regardless of includeRemote parameter
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'git' &&
          query.queryKey[1] === 'branches' &&
          query.queryKey[2] === repositoryPath,
      });
      toast.success('Branch deleted', `Branch "${options.branchName}" deleted`);
    },
    onError: (error: Error) => {
      toast.error('Delete branch failed', error.message);
    },
  });
};

/**
 * Hook to merge a branch
 */
export const useMergeBranch = () => {
  const queryClient = useQueryClient();
  const repositoryPath = useBoundStore((state) => state.repositoryPath);

  return useMutation<GitOperationResult, Error, { branchName: string; message?: string }>({
    mutationFn: (options) => {
      if (!repositoryPath) throw new Error('No repository configured');
      const request: GitMergeBranchRequest = {
        repoPath: repositoryPath,
        branchName: options.branchName,
        message: options.message,
      };
      return gitService.mergeBranch(request);
    },
    onSuccess: (result, options) => {
      void queryClient.invalidateQueries({ queryKey: gitKeys.status(repositoryPath ?? '') });
      void queryClient.invalidateQueries({ queryKey: gitKeys.log(repositoryPath ?? '') });
      if (result.success) {
        toast.success('Merge successful', `Branch "${options.branchName}" merged successfully`);
      } else {
        toast.error('Merge warning', result.error || result.message);
      }
    },
    onError: (error: Error) => {
      toast.error('Merge failed', error.message);
    },
  });
};

/**
 * Hook to publish a branch to remote
 */
export const usePublishBranch = () => {
  const queryClient = useQueryClient();
  const repositoryPath = useBoundStore((state) => state.repositoryPath);

  return useMutation<GitOperationResult, Error, { branchName: string; remote?: string }>({
    mutationFn: (options) => {
      if (!repositoryPath) throw new Error('No repository configured');
      const request: GitPublishBranchRequest = {
        repoPath: repositoryPath,
        branchName: options.branchName,
        remote: options.remote,
      };
      return gitService.publishBranch(request);
    },
    onSuccess: (result, options) => {
      void queryClient.invalidateQueries({ queryKey: gitKeys.status(repositoryPath ?? '') });
      // Invalidate all branch queries regardless of includeRemote parameter
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'git' &&
          query.queryKey[1] === 'branches' &&
          query.queryKey[2] === repositoryPath,
      });
      if (result.success) {
        toast.success('Branch published', `Branch "${options.branchName}" published to remote`);
      } else {
        toast.error('Publish warning', result.error || result.message);
      }
    },
    onError: (error: Error) => {
      toast.error('Publish failed', error.message);
    },
  });
};
