import { useMutation, useQueryClient } from '@tanstack/react-query';
import { githubKeys } from '../../../lib/query-keys';
import { githubService } from '../../../services/github.service';

/**
 * Hook to rerun a workflow
 */
export const useRerunWorkflow = (owner?: string, repo?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (runId: number) => githubService.rerunWorkflow(runId, owner, repo),
    onSuccess: async (_, runId) => {
      // Invalidate the specific workflow run
      await queryClient.invalidateQueries({
        queryKey: githubKeys.workflowRun(runId, owner, repo),
      });
      // Invalidate the workflow runs list
      await queryClient.invalidateQueries({
        queryKey: githubKeys.all,
        predicate: (query) =>
          query.queryKey[0] === 'github' && query.queryKey[1] === 'workflowRuns',
      });
    },
  });
};

/**
 * Hook to cancel a running workflow
 */
export const useCancelWorkflowRun = (owner?: string, repo?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (runId: number) => githubService.cancelWorkflowRun(runId, owner, repo),
    onSuccess: async (_, runId) => {
      // Invalidate the specific workflow run
      await queryClient.invalidateQueries({
        queryKey: githubKeys.workflowRun(runId, owner, repo),
      });
      // Invalidate the workflow runs list
      await queryClient.invalidateQueries({
        queryKey: githubKeys.all,
        predicate: (query) =>
          query.queryKey[0] === 'github' && query.queryKey[1] === 'workflowRuns',
      });
    },
  });
};

/**
 * Hook to refresh all GitHub data
 */
export const useRefreshGitHubData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Just invalidate, the queries will refetch automatically
      await queryClient.invalidateQueries({
        queryKey: githubKeys.all,
      });
    },
  });
};
