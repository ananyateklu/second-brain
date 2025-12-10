/**
 * Git Service
 * Handles Git operations via the backend API
 */

import { apiClient } from '../lib/api-client';
import { API_ENDPOINTS } from '../lib/constants';
import type {
  GitStatus,
  GitDiffResult,
  GitStageRequest,
  GitUnstageRequest,
  GitCommitRequest,
  GitCommitResult,
  GitRemoteRequest,
  GitOperationResult,
  GitLogEntry,
  GitDiffRequest,
} from '../types/git';

/**
 * Build URL with query parameters
 */
const buildUrl = (base: string, params: Record<string, string | number | boolean | undefined>): string => {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  }
  const queryString = searchParams.toString();
  return queryString ? `${base}?${queryString}` : base;
};

export const gitService = {
  /**
   * Validates that the given path is a valid Git repository
   */
  validateRepository: async (repoPath: string): Promise<boolean> => {
    const url = buildUrl(API_ENDPOINTS.GIT.VALIDATE, { repoPath });
    return apiClient.get<boolean>(url);
  },

  /**
   * Gets the current status of a Git repository
   */
  getStatus: async (repoPath: string): Promise<GitStatus> => {
    const url = buildUrl(API_ENDPOINTS.GIT.STATUS, { repoPath });
    return apiClient.get<GitStatus>(url);
  },

  /**
   * Gets the diff for a specific file
   */
  getDiff: async (repoPath: string, filePath: string, staged = false): Promise<GitDiffResult> => {
    const url = buildUrl(API_ENDPOINTS.GIT.DIFF, { repoPath, filePath, staged });
    return apiClient.get<GitDiffResult>(url);
  },

  /**
   * Stages files for commit
   */
  stageFiles: async (request: GitStageRequest): Promise<{ success: boolean }> => {
    return apiClient.post<{ success: boolean }>(API_ENDPOINTS.GIT.STAGE, request);
  },

  /**
   * Stages all changes
   */
  stageAll: async (repoPath: string): Promise<{ success: boolean }> => {
    return gitService.stageFiles({ repoPath, files: ['.'] });
  },

  /**
   * Unstages files from the staging area
   */
  unstageFiles: async (request: GitUnstageRequest): Promise<{ success: boolean }> => {
    return apiClient.post<{ success: boolean }>(API_ENDPOINTS.GIT.UNSTAGE, request);
  },

  /**
   * Unstages all files
   */
  unstageAll: async (repoPath: string): Promise<{ success: boolean }> => {
    return gitService.unstageFiles({ repoPath, files: ['.'] });
  },

  /**
   * Creates a commit with the staged changes
   */
  commit: async (request: GitCommitRequest): Promise<GitCommitResult> => {
    return apiClient.post<GitCommitResult>(API_ENDPOINTS.GIT.COMMIT, request);
  },

  /**
   * Pushes commits to the remote repository
   */
  push: async (request: GitRemoteRequest): Promise<GitOperationResult> => {
    return apiClient.post<GitOperationResult>(API_ENDPOINTS.GIT.PUSH, request);
  },

  /**
   * Pulls changes from the remote repository
   */
  pull: async (request: GitRemoteRequest): Promise<GitOperationResult> => {
    return apiClient.post<GitOperationResult>(API_ENDPOINTS.GIT.PULL, request);
  },

  /**
   * Gets the commit log for a repository
   */
  getLog: async (repoPath: string, count = 20): Promise<GitLogEntry[]> => {
    const url = buildUrl(API_ENDPOINTS.GIT.LOG, { repoPath, count });
    return apiClient.get<GitLogEntry[]>(url);
  },

  /**
   * Discards changes to a file (restores to last committed state)
   */
  discardChanges: async (request: GitDiffRequest): Promise<{ success: boolean }> => {
    return apiClient.post<{ success: boolean }>(API_ENDPOINTS.GIT.DISCARD, request);
  },
};

export default gitService;
