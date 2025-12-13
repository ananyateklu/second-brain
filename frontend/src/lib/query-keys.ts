/**
 * Type-safe Query Key Factory
 * 
 * This module provides strongly-typed query keys for TanStack Query.
 * Using factory pattern ensures consistent key generation and better cache invalidation.
 */

// ============================================
// Filter Types
// ============================================

/**
 * Filters for note queries
 */
export interface NoteFilters {
  /** Filter by folder name */
  folder?: string;
  /** Filter by tag(s) */
  tags?: string[];
  /** Include archived notes */
  includeArchived?: boolean;
  /** Search term for title/content */
  search?: string;
  /** Sort field */
  sortBy?: 'updatedAt' | 'createdAt' | 'title';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Parameters for paginated note queries (server-side pagination)
 */
export interface NotePaginationParams {
  /** Page number (1-based) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Filter by folder name */
  folder?: string | null;
  /** Include archived notes */
  includeArchived?: boolean;
  /** Search term for title/content */
  search?: string;
}

/**
 * Parameters for paginated conversation queries (server-side pagination)
 */
export interface ConversationPaginationParams {
  /** Page number (1-based) */
  page: number;
  /** Items per page */
  pageSize: number;
}

/**
 * Filters for conversation queries
 */
export interface ConversationFilters {
  /** Filter by user ID */
  userId?: string;
  /** Filter by AI provider */
  provider?: string;
  /** Filter by model */
  model?: string;
  /** Include only RAG-enabled conversations */
  ragEnabled?: boolean;
  /** Include only agent-enabled conversations */
  agentEnabled?: boolean;
}

/**
 * Filters for RAG analytics log queries
 */
export interface RagLogFilters {
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page */
  pageSize?: number;
  /** Filter by feedback type */
  feedback?: 'thumbs_up' | 'thumbs_down' | null;
  /** Filter by date range start */
  since?: string;
  /** Filter by topic cluster */
  topicCluster?: number;
}

/**
 * Filters for indexing stats queries
 */
export interface IndexingFilters {
  /** Filter by user ID */
  userId?: string;
  /** Filter by vector store provider */
  vectorStore?: 'PostgreSQL' | 'Pinecone';
}

/**
 * Configuration for AI health queries
 */
export interface AIHealthConfig {
  /** Custom Ollama base URL for remote instances */
  ollamaBaseUrl?: string | null;
  /** Whether to use remote Ollama */
  useRemoteOllama?: boolean;
}

// ============================================
// Query Key Factory Types
// ============================================

/**
 * Utility type to infer query key types from factory functions
 */
export type QueryKeyFactory<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
  ? (...args: A) => R
  : T[K];
};

/**
 * Extract the return type of a query key factory function
 */
export type QueryKeyOf<T> = T extends readonly unknown[] ? T : never;

// ============================================
// Query Key Factories
// ============================================

/**
 * Query keys for notes domain
 */
export const noteKeys = {
  /** Root key for all note queries */
  all: ['notes'] as const,

  /** Key for note list queries */
  lists: () => [...noteKeys.all, 'list'] as const,

  /** Key for filtered note list */
  list: (filters?: NoteFilters) => [...noteKeys.lists(), filters] as const,

  /** Key for paginated note list queries (server-side pagination) */
  paged: (params: NotePaginationParams) => [...noteKeys.all, 'paged', params] as const,

  /** Key for note detail queries */
  details: () => [...noteKeys.all, 'detail'] as const,

  /** Key for specific note detail */
  detail: (id: string) => [...noteKeys.details(), id] as const,

  /** Key for note search queries */
  search: (query: string) => [...noteKeys.all, 'search', query] as const,

  /** Key for notes by folder */
  byFolder: (folder: string) => [...noteKeys.all, 'folder', folder] as const,

  /** Key for notes by tag */
  byTag: (tag: string) => [...noteKeys.all, 'tag', tag] as const,
} as const;

/**
 * Query keys for conversations domain
 */
export const conversationKeys = {
  /** Root key for all conversation queries */
  all: ['conversations'] as const,

  /** Key for conversation list queries */
  lists: () => [...conversationKeys.all, 'list'] as const,

  /** Key for filtered conversation list */
  list: (filters?: ConversationFilters) => [...conversationKeys.lists(), filters] as const,

  /** Key for paginated conversation list queries (server-side pagination) */
  paged: (params: ConversationPaginationParams) => [...conversationKeys.all, 'paged', params] as const,

  /** Key for conversation detail queries */
  details: () => [...conversationKeys.all, 'detail'] as const,

  /** Key for specific conversation detail */
  detail: (id: string) => [...conversationKeys.details(), id] as const,

  /** Key for conversation messages */
  messages: (conversationId: string) => [...conversationKeys.detail(conversationId), 'messages'] as const,

  /** Legacy key for backward compatibility */
  legacy: (id: string | null) => ['conversation', id] as const,
} as const;

/**
 * Query keys for AI health checks
 */
export const aiHealthKeys = {
  /** Root key for all AI health queries */
  all: ['ai-health'] as const,

  /** Key for overall health status */
  health: (config?: AIHealthConfig) => [...aiHealthKeys.all, config] as const,

  /** Key for specific provider health */
  provider: (provider: string, config?: AIHealthConfig) =>
    [...aiHealthKeys.all, provider, config] as const,

  /** Key for Ollama models list */
  ollamaModels: (config?: AIHealthConfig) =>
    [...aiHealthKeys.all, 'ollama-models', config] as const,
} as const;

/**
 * Query keys for indexing/RAG operations
 */
export const indexingKeys = {
  /** Root key for all indexing queries */
  all: ['indexing'] as const,

  /** Key for indexing stats */
  stats: (filters?: IndexingFilters) => [...indexingKeys.all, 'stats', filters] as const,

  /** Key for specific indexing job */
  job: (jobId: string) => [...indexingKeys.all, 'job', jobId] as const,

  /** Key for indexing progress */
  progress: (jobId: string) => [...indexingKeys.job(jobId), 'progress'] as const,
} as const;

/**
 * Query keys for RAG analytics
 */
export const ragAnalyticsKeys = {
  /** Root key for all RAG analytics queries */
  all: ['rag-analytics'] as const,

  /** Key for RAG performance stats */
  stats: (since?: string) => [...ragAnalyticsKeys.all, 'stats', since] as const,

  /** Key for RAG query logs */
  logs: (filters?: RagLogFilters) => [...ragAnalyticsKeys.all, 'logs', filters] as const,

  /** Key for specific log detail */
  log: (id: string) => [...ragAnalyticsKeys.all, 'log', id] as const,

  /** Key for topic clusters */
  topics: () => [...ragAnalyticsKeys.all, 'topics'] as const,

  /** Key for clustering analysis */
  cluster: () => [...ragAnalyticsKeys.all, 'cluster'] as const,
} as const;

/**
 * Filters for tool call analytics queries
 */
export interface ToolAnalyticsFilters {
  /** Number of days to look back */
  daysBack?: number;
  /** Start date for custom range */
  startDate?: string;
  /** End date for custom range */
  endDate?: string;
  /** Filter by specific tool name */
  toolName?: string;
}

/**
 * Query keys for statistics
 */
export const statsKeys = {
  /** Root key for all stats queries */
  all: ['stats'] as const,

  /** Key for AI usage stats */
  ai: () => [...statsKeys.all, 'ai'] as const,

  /** Key for notes stats */
  notes: () => [...statsKeys.all, 'notes'] as const,

  /** Key for dashboard stats */
  dashboard: () => [...statsKeys.all, 'dashboard'] as const,

  /** Key for tool call analytics (PostgreSQL 18 JSON_TABLE) */
  tools: (filters?: ToolAnalyticsFilters) => [...statsKeys.all, 'tools', filters] as const,

  /** Key for tool action breakdown */
  toolActions: (filters?: ToolAnalyticsFilters) => [...statsKeys.all, 'tool-actions', filters] as const,

  /** Key for tool errors */
  toolErrors: (topN?: number, daysBack?: number) => [...statsKeys.all, 'tool-errors', { topN, daysBack }] as const,
} as const;

/**
 * Query keys for user preferences
 */
export const userPreferencesKeys = {
  /** Root key for all user preferences queries */
  all: ['user-preferences'] as const,

  /** Key for specific user's preferences */
  byUser: (userId: string) => [...userPreferencesKeys.all, userId] as const,
} as const;

/**
 * Query keys for image generation
 */
export const imageGenerationKeys = {
  /** Root key for all image generation queries */
  all: ['image-generation'] as const,

  /** Key for available providers */
  providers: () => [...imageGenerationKeys.all, 'providers'] as const,

  /** Key for supported sizes */
  sizes: (provider: string, model?: string) =>
    [...imageGenerationKeys.all, 'sizes', provider, model] as const,

  /** Key for generated images history */
  history: (conversationId: string) =>
    [...imageGenerationKeys.all, 'history', conversationId] as const,
} as const;

/**
 * Query keys for agent capabilities
 */
export const agentKeys = {
  /** Root key for all agent queries */
  all: ['agent'] as const,

  /** Key for available capabilities */
  capabilities: () => [...agentKeys.all, 'capabilities'] as const,

  /** Key for available providers */
  providers: () => [...agentKeys.all, 'providers'] as const,
} as const;

/**
 * Query keys for Git integration
 */
export const gitKeys = {
  /** Root key for all git queries */
  all: ['git'] as const,

  /** Key for repository status */
  status: (repoPath: string) => [...gitKeys.all, 'status', repoPath] as const,

  /** Key for file diff */
  diff: (repoPath: string, filePath: string, staged: boolean) =>
    [...gitKeys.all, 'diff', repoPath, filePath, staged] as const,

  /** Key for commit log */
  log: (repoPath: string, count?: number) => [...gitKeys.all, 'log', repoPath, count] as const,

  /** Key for repository validation */
  validate: (repoPath: string) => [...gitKeys.all, 'validate', repoPath] as const,

  /** Key for branches list */
  branches: (repoPath: string, includeRemote?: boolean) =>
    [...gitKeys.all, 'branches', repoPath, includeRemote] as const,
} as const;

/**
 * Filters for GitHub pull requests queries
 */
export interface GitHubPullRequestFilters {
  /** Owner of the repository */
  owner?: string;
  /** Repository name */
  repo?: string;
  /** PR state filter */
  state?: 'open' | 'closed' | 'all';
  /** Page number */
  page?: number;
  /** Items per page */
  perPage?: number;
}

/**
 * Filters for GitHub Actions workflow runs queries
 */
export interface GitHubWorkflowRunFilters {
  /** Owner of the repository */
  owner?: string;
  /** Repository name */
  repo?: string;
  /** Branch name filter */
  branch?: string;
  /** Workflow status filter */
  status?: 'queued' | 'in_progress' | 'completed' | '';
  /** Page number */
  page?: number;
  /** Items per page */
  perPage?: number;
}

/**
 * Filters for GitHub issues queries
 */
export interface GitHubIssueFilters {
  /** Owner of the repository */
  owner?: string;
  /** Repository name */
  repo?: string;
  /** Issue state filter */
  state?: 'open' | 'closed' | 'all';
  /** Page number */
  page?: number;
  /** Items per page */
  perPage?: number;
}

/**
 * Filters for GitHub commits queries
 */
export interface GitHubCommitFilters {
  /** Owner of the repository */
  owner?: string;
  /** Repository name */
  repo?: string;
  /** Branch name filter */
  branch?: string;
  /** Page number */
  page?: number;
  /** Items per page */
  perPage?: number;
}

/**
 * Query keys for GitHub integration (PRs and Actions)
 */
export const githubKeys = {
  /** Root key for all github queries */
  all: ['github'] as const,

  /** Key for repository info */
  repository: (owner?: string, repo?: string) =>
    [...githubKeys.all, 'repository', { owner, repo }] as const,

  /** Key for pull requests list */
  pullRequests: (filters?: GitHubPullRequestFilters) =>
    [...githubKeys.all, 'pullRequests', filters] as const,

  /** Key for a specific pull request */
  pullRequest: (number: number, owner?: string, repo?: string) =>
    [...githubKeys.all, 'pullRequest', number, { owner, repo }] as const,

  /** Key for pull request reviews */
  pullRequestReviews: (number: number, owner?: string, repo?: string) =>
    [...githubKeys.all, 'pullRequestReviews', number, { owner, repo }] as const,

  /** Key for workflow runs list */
  workflowRuns: (filters?: GitHubWorkflowRunFilters) =>
    [...githubKeys.all, 'workflowRuns', filters] as const,

  /** Key for a specific workflow run */
  workflowRun: (id: number, owner?: string, repo?: string) =>
    [...githubKeys.all, 'workflowRun', id, { owner, repo }] as const,

  /** Key for workflows list */
  workflows: (owner?: string, repo?: string) =>
    [...githubKeys.all, 'workflows', { owner, repo }] as const,

  /** Key for check runs */
  checkRuns: (sha: string, owner?: string, repo?: string) =>
    [...githubKeys.all, 'checkRuns', sha, { owner, repo }] as const,

  /** Key for pull request files */
  pullRequestFiles: (pullNumber: number, owner?: string, repo?: string) =>
    [...githubKeys.all, 'pullRequestFiles', pullNumber, { owner, repo }] as const,

  /** Key for branches */
  branches: (owner?: string, repo?: string) =>
    [...githubKeys.all, 'branches', { owner, repo }] as const,

  /** Key for issues list */
  issues: (filters?: GitHubIssueFilters) =>
    [...githubKeys.all, 'issues', filters] as const,

  /** Key for commits list */
  commits: (filters?: GitHubCommitFilters) =>
    [...githubKeys.all, 'commits', filters] as const,

  /** Key for issue/PR comments */
  issueComments: (issueNumber: number, owner?: string, repo?: string) =>
    [...githubKeys.all, 'issueComments', issueNumber, { owner, repo }] as const,
} as const;

// ============================================
// PostgreSQL 18 Temporal Feature Query Keys
// ============================================

/**
 * Query keys for note version history (PostgreSQL 18 temporal tables)
 */
export const noteVersionKeys = {
  /** Root key for all note version queries */
  all: ['noteVersions'] as const,

  /** Key for version history of a specific note */
  history: (noteId: string) => [...noteVersionKeys.all, 'history', noteId] as const,

  /** Key for version at a specific point in time */
  atTime: (noteId: string, timestamp: string) => [...noteVersionKeys.all, 'at', noteId, timestamp] as const,

  /** Key for version diff between two versions */
  diff: (noteId: string, fromVersion: number, toVersion: number) =>
    [...noteVersionKeys.all, 'diff', noteId, fromVersion, toVersion] as const,
} as const;

/**
 * Filters for chat session history queries
 */
export interface ChatSessionFilters {
  /** Start date filter */
  since?: string;
  /** End date filter */
  until?: string;
}

/**
 * Query keys for chat session tracking (PostgreSQL 18 temporal tables)
 */
export const chatSessionKeys = {
  /** Root key for all chat session queries */
  all: ['chatSessions'] as const,

  /** Key for session statistics */
  stats: () => [...chatSessionKeys.all, 'stats'] as const,

  /** Key for active sessions */
  active: () => [...chatSessionKeys.all, 'active'] as const,

  /** Key for session history */
  history: (filters?: ChatSessionFilters) => [...chatSessionKeys.all, 'history', filters] as const,

  /** Key for sessions by conversation */
  byConversation: (conversationId: string, skip?: number, take?: number) =>
    [...chatSessionKeys.all, 'conversation', conversationId, { skip, take }] as const,
} as const;

// ============================================
// Unified Query Keys Export
// ============================================

/**
 * All query keys unified for easy access
 * This maintains backward compatibility with QUERY_KEYS from constants.ts
 */
export const queryKeys = {
  notes: noteKeys,
  conversations: conversationKeys,
  aiHealth: aiHealthKeys,
  indexing: indexingKeys,
  ragAnalytics: ragAnalyticsKeys,
  stats: statsKeys,
  userPreferences: userPreferencesKeys,
  imageGeneration: imageGenerationKeys,
  agent: agentKeys,
  git: gitKeys,
  github: githubKeys,
  // PostgreSQL 18 Temporal Features
  noteVersions: noteVersionKeys,
  chatSessions: chatSessionKeys,

  // Legacy support - maps to conversationKeys.legacy
  conversation: conversationKeys.legacy,
} as const;

// ============================================
// Type Exports for Query Keys
// ============================================

/** Helper type to extract only function members from a type */
type FunctionMembers<T> = {
  [K in keyof T]: T[K] extends (...args: unknown[]) => unknown ? T[K] : never;
}[keyof T];

/** Type for note query keys */
export type NoteQueryKey = typeof noteKeys['all'] | Exclude<ReturnType<FunctionMembers<typeof noteKeys>>, never>;

/** Type for conversation query keys */
export type ConversationQueryKey = typeof conversationKeys['all'] | Exclude<ReturnType<FunctionMembers<typeof conversationKeys>>, never>;

/** Type for AI health query keys */
 
export type AIHealthQueryKey = typeof aiHealthKeys['all'] | ReturnType<typeof aiHealthKeys.health> | ReturnType<typeof aiHealthKeys.provider> | ReturnType<typeof aiHealthKeys.ollamaModels>;

/** Type for indexing query keys */
 
export type IndexingQueryKey = typeof indexingKeys['all'] | ReturnType<typeof indexingKeys.stats> | ReturnType<typeof indexingKeys.job> | ReturnType<typeof indexingKeys.progress>;

/** Type for RAG analytics query keys */
export type RagAnalyticsQueryKey = typeof ragAnalyticsKeys['all'] | Exclude<ReturnType<FunctionMembers<typeof ragAnalyticsKeys>>, never>;

/** Type for stats query keys */
export type StatsQueryKey = typeof statsKeys['all'] | Exclude<ReturnType<FunctionMembers<typeof statsKeys>>, never>;

/** Type for user preferences query keys */
 
export type UserPreferencesQueryKey = typeof userPreferencesKeys['all'] | ReturnType<typeof userPreferencesKeys.byUser>;

/** Type for image generation query keys */
export type ImageGenerationQueryKey = typeof imageGenerationKeys['all'] | Exclude<ReturnType<FunctionMembers<typeof imageGenerationKeys>>, never>;

/** Type for agent query keys */
export type AgentQueryKey = typeof agentKeys['all'] | Exclude<ReturnType<FunctionMembers<typeof agentKeys>>, never>;

/** Type for note version query keys */
 
export type NoteVersionQueryKey = typeof noteVersionKeys['all'] | ReturnType<typeof noteVersionKeys.history> | ReturnType<typeof noteVersionKeys.atTime> | ReturnType<typeof noteVersionKeys.diff>;

/** Type for chat session query keys */
export type ChatSessionQueryKey = typeof chatSessionKeys['all'] | Exclude<ReturnType<FunctionMembers<typeof chatSessionKeys>>, never>;

// ============================================
// Utility Functions
// ============================================

/**
 * Creates an invalidation pattern for all queries in a domain
 * @param rootKey - The root key of the domain (e.g., ['notes'])
 * @returns Pattern that matches all queries in that domain
 */
export function createInvalidationPattern<T extends readonly unknown[]>(rootKey: T): { queryKey: T } {
  return { queryKey: rootKey };
}

/**
 * Type guard to check if a key matches a specific pattern
 */
export function matchesQueryKey(
  queryKey: readonly unknown[],
  pattern: readonly unknown[]
): boolean {
  if (queryKey.length < pattern.length) return false;
  return pattern.every((segment, index) => {
    if (segment === undefined) return true;
    return JSON.stringify(queryKey[index]) === JSON.stringify(segment);
  });
}
