/**
 * Hooks for Git and GitHub integration status
 * Used by the Git & GitHub settings page to check configuration status
 */

import { useQuery } from '@tanstack/react-query';
import { gitService } from '../../../services/git.service';
import { githubService } from '../../../services/github.service';
import { gitKeys, githubKeys } from '../../../lib/query-keys';
import { CACHE } from '../../../lib/constants';

/**
 * Hook to fetch Git integration configuration status
 */
export function useGitIntegrationStatus() {
  return useQuery({
    queryKey: gitKeys.integrationStatus(),
    queryFn: () => gitService.getIntegrationStatus(),
    staleTime: CACHE.STALE_TIME,
    retry: 1,
  });
}

/**
 * Hook to fetch GitHub integration configuration status
 */
export function useGitHubIntegrationStatus() {
  return useQuery({
    queryKey: githubKeys.integrationStatus(),
    queryFn: () => githubService.getIntegrationStatus(),
    staleTime: CACHE.STALE_TIME,
    retry: 1,
  });
}
