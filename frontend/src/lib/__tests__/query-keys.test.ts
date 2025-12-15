/**
 * Query Keys Tests
 * Unit tests for type-safe query key factory
 */

import { describe, it, expect } from 'vitest';
import {
  noteKeys,
  conversationKeys,
  aiHealthKeys,
  indexingKeys,
  ragAnalyticsKeys,
  statsKeys,
  userPreferencesKeys,
  imageGenerationKeys,
  agentKeys,
  gitKeys,
  githubKeys,
  noteVersionKeys,
  chatSessionKeys,
  queryKeys,
  createInvalidationPattern,
  matchesQueryKey,
  NoteFilters,
  ConversationFilters,
  RagLogFilters,
  IndexingFilters,
  AIHealthConfig,
  NotePaginationParams,
  ConversationPaginationParams,
  ToolAnalyticsFilters,
  GitHubPullRequestFilters,
  GitHubWorkflowRunFilters,
  GitHubIssueFilters,
  GitHubCommitFilters,
  ChatSessionFilters,
} from '../query-keys';

describe('query-keys', () => {
  // ============================================
  // noteKeys Tests
  // ============================================
  describe('noteKeys', () => {
    it('should have correct all key', () => {
      expect(noteKeys.all).toEqual(['notes']);
    });

    it('should generate lists key', () => {
      expect(noteKeys.lists()).toEqual(['notes', 'list']);
    });

    it('should generate list key without filters', () => {
      expect(noteKeys.list()).toEqual(['notes', 'list', undefined]);
    });

    it('should generate list key with filters', () => {
      const filters: NoteFilters = { folder: 'work', tags: ['urgent'] };
      expect(noteKeys.list(filters)).toEqual(['notes', 'list', filters]);
    });

    it('should generate paged key', () => {
      const params: NotePaginationParams = { page: 1, pageSize: 10 };
      expect(noteKeys.paged(params)).toEqual(['notes', 'paged', params]);
    });

    it('should generate paged key with filters', () => {
      const params: NotePaginationParams = { page: 2, pageSize: 20, folder: 'personal', search: 'test' };
      expect(noteKeys.paged(params)).toEqual(['notes', 'paged', params]);
    });

    it('should generate details key', () => {
      expect(noteKeys.details()).toEqual(['notes', 'detail']);
    });

    it('should generate detail key with id', () => {
      expect(noteKeys.detail('note-123')).toEqual(['notes', 'detail', 'note-123']);
    });

    it('should generate search key', () => {
      expect(noteKeys.search('query')).toEqual(['notes', 'search', 'query']);
    });

    it('should generate byFolder key', () => {
      expect(noteKeys.byFolder('work')).toEqual(['notes', 'folder', 'work']);
    });

    it('should generate byTag key', () => {
      expect(noteKeys.byTag('important')).toEqual(['notes', 'tag', 'important']);
    });
  });

  // ============================================
  // conversationKeys Tests
  // ============================================
  describe('conversationKeys', () => {
    it('should have correct all key', () => {
      expect(conversationKeys.all).toEqual(['conversations']);
    });

    it('should generate lists key', () => {
      expect(conversationKeys.lists()).toEqual(['conversations', 'list']);
    });

    it('should generate list key without filters', () => {
      expect(conversationKeys.list()).toEqual(['conversations', 'list', undefined]);
    });

    it('should generate list key with filters', () => {
      const filters: ConversationFilters = { provider: 'OpenAI', ragEnabled: true };
      expect(conversationKeys.list(filters)).toEqual(['conversations', 'list', filters]);
    });

    it('should generate paged key', () => {
      const params: ConversationPaginationParams = { page: 1, pageSize: 20 };
      expect(conversationKeys.paged(params)).toEqual(['conversations', 'paged', params]);
    });

    it('should generate details key', () => {
      expect(conversationKeys.details()).toEqual(['conversations', 'detail']);
    });

    it('should generate detail key with id', () => {
      expect(conversationKeys.detail('conv-123')).toEqual(['conversations', 'detail', 'conv-123']);
    });

    it('should generate messages key', () => {
      expect(conversationKeys.messages('conv-123')).toEqual(['conversations', 'detail', 'conv-123', 'messages']);
    });

    it('should generate legacy key', () => {
      expect(conversationKeys.legacy('conv-123')).toEqual(['conversation', 'conv-123']);
    });

    it('should generate legacy key with null', () => {
      expect(conversationKeys.legacy(null)).toEqual(['conversation', null]);
    });
  });

  // ============================================
  // aiHealthKeys Tests
  // ============================================
  describe('aiHealthKeys', () => {
    it('should have correct all key', () => {
      expect(aiHealthKeys.all).toEqual(['ai-health']);
    });

    it('should generate health key without config', () => {
      expect(aiHealthKeys.health()).toEqual(['ai-health', undefined]);
    });

    it('should generate health key with config', () => {
      const config: AIHealthConfig = { ollamaBaseUrl: 'http://localhost:11434' };
      expect(aiHealthKeys.health(config)).toEqual(['ai-health', config]);
    });

    it('should generate provider key', () => {
      expect(aiHealthKeys.provider('OpenAI')).toEqual(['ai-health', 'OpenAI', undefined]);
    });

    it('should generate provider key with config', () => {
      const config: AIHealthConfig = { useRemoteOllama: true };
      expect(aiHealthKeys.provider('Ollama', config)).toEqual(['ai-health', 'Ollama', config]);
    });

    it('should generate ollamaModels key', () => {
      expect(aiHealthKeys.ollamaModels()).toEqual(['ai-health', 'ollama-models', undefined]);
    });

    it('should generate ollamaModels key with config', () => {
      const config: AIHealthConfig = { ollamaBaseUrl: 'http://remote:11434' };
      expect(aiHealthKeys.ollamaModels(config)).toEqual(['ai-health', 'ollama-models', config]);
    });
  });

  // ============================================
  // indexingKeys Tests
  // ============================================
  describe('indexingKeys', () => {
    it('should have correct all key', () => {
      expect(indexingKeys.all).toEqual(['indexing']);
    });

    it('should generate stats key without filters', () => {
      expect(indexingKeys.stats()).toEqual(['indexing', 'stats', undefined]);
    });

    it('should generate stats key with filters', () => {
      const filters: IndexingFilters = { vectorStore: 'PostgreSQL' };
      expect(indexingKeys.stats(filters)).toEqual(['indexing', 'stats', filters]);
    });

    it('should generate job key', () => {
      expect(indexingKeys.job('job-123')).toEqual(['indexing', 'job', 'job-123']);
    });

    it('should generate progress key', () => {
      expect(indexingKeys.progress('job-123')).toEqual(['indexing', 'job', 'job-123', 'progress']);
    });
  });

  // ============================================
  // ragAnalyticsKeys Tests
  // ============================================
  describe('ragAnalyticsKeys', () => {
    it('should have correct all key', () => {
      expect(ragAnalyticsKeys.all).toEqual(['rag-analytics']);
    });

    it('should generate stats key without filter', () => {
      expect(ragAnalyticsKeys.stats()).toEqual(['rag-analytics', 'stats', undefined]);
    });

    it('should generate stats key with since', () => {
      expect(ragAnalyticsKeys.stats('2024-01-01')).toEqual(['rag-analytics', 'stats', '2024-01-01']);
    });

    it('should generate logs key without filters', () => {
      expect(ragAnalyticsKeys.logs()).toEqual(['rag-analytics', 'logs', undefined]);
    });

    it('should generate logs key with filters', () => {
      const filters: RagLogFilters = { page: 1, pageSize: 20, feedback: 'thumbs_up' };
      expect(ragAnalyticsKeys.logs(filters)).toEqual(['rag-analytics', 'logs', filters]);
    });

    it('should generate log key', () => {
      expect(ragAnalyticsKeys.log('log-123')).toEqual(['rag-analytics', 'log', 'log-123']);
    });

    it('should generate topics key', () => {
      expect(ragAnalyticsKeys.topics()).toEqual(['rag-analytics', 'topics']);
    });

    it('should generate cluster key', () => {
      expect(ragAnalyticsKeys.cluster()).toEqual(['rag-analytics', 'cluster']);
    });
  });

  // ============================================
  // statsKeys Tests
  // ============================================
  describe('statsKeys', () => {
    it('should have correct all key', () => {
      expect(statsKeys.all).toEqual(['stats']);
    });

    it('should generate ai key', () => {
      expect(statsKeys.ai()).toEqual(['stats', 'ai']);
    });

    it('should generate notes key', () => {
      expect(statsKeys.notes()).toEqual(['stats', 'notes']);
    });

    it('should generate dashboard key', () => {
      expect(statsKeys.dashboard()).toEqual(['stats', 'dashboard']);
    });

    it('should generate tools key without filters', () => {
      expect(statsKeys.tools()).toEqual(['stats', 'tools', undefined]);
    });

    it('should generate tools key with filters', () => {
      const filters: ToolAnalyticsFilters = { daysBack: 7 };
      expect(statsKeys.tools(filters)).toEqual(['stats', 'tools', filters]);
    });

    it('should generate toolActions key', () => {
      const filters: ToolAnalyticsFilters = { toolName: 'search' };
      expect(statsKeys.toolActions(filters)).toEqual(['stats', 'tool-actions', filters]);
    });

    it('should generate toolErrors key', () => {
      expect(statsKeys.toolErrors(10, 30)).toEqual(['stats', 'tool-errors', { topN: 10, daysBack: 30 }]);
    });
  });

  // ============================================
  // userPreferencesKeys Tests
  // ============================================
  describe('userPreferencesKeys', () => {
    it('should have correct all key', () => {
      expect(userPreferencesKeys.all).toEqual(['user-preferences']);
    });

    it('should generate byUser key', () => {
      expect(userPreferencesKeys.byUser('user-123')).toEqual(['user-preferences', 'user-123']);
    });
  });

  // ============================================
  // imageGenerationKeys Tests
  // ============================================
  describe('imageGenerationKeys', () => {
    it('should have correct all key', () => {
      expect(imageGenerationKeys.all).toEqual(['image-generation']);
    });

    it('should generate providers key', () => {
      expect(imageGenerationKeys.providers()).toEqual(['image-generation', 'providers']);
    });

    it('should generate sizes key without model', () => {
      expect(imageGenerationKeys.sizes('OpenAI')).toEqual(['image-generation', 'sizes', 'OpenAI', undefined]);
    });

    it('should generate sizes key with model', () => {
      expect(imageGenerationKeys.sizes('OpenAI', 'dall-e-3')).toEqual(['image-generation', 'sizes', 'OpenAI', 'dall-e-3']);
    });

    it('should generate history key', () => {
      expect(imageGenerationKeys.history('conv-123')).toEqual(['image-generation', 'history', 'conv-123']);
    });
  });

  // ============================================
  // agentKeys Tests
  // ============================================
  describe('agentKeys', () => {
    it('should have correct all key', () => {
      expect(agentKeys.all).toEqual(['agent']);
    });

    it('should generate capabilities key', () => {
      expect(agentKeys.capabilities()).toEqual(['agent', 'capabilities']);
    });

    it('should generate providers key', () => {
      expect(agentKeys.providers()).toEqual(['agent', 'providers']);
    });
  });

  // ============================================
  // gitKeys Tests
  // ============================================
  describe('gitKeys', () => {
    it('should have correct all key', () => {
      expect(gitKeys.all).toEqual(['git']);
    });

    it('should generate status key', () => {
      expect(gitKeys.status('/path/to/repo')).toEqual(['git', 'status', '/path/to/repo']);
    });

    it('should generate diff key', () => {
      expect(gitKeys.diff('/path', 'file.ts', true)).toEqual(['git', 'diff', '/path', 'file.ts', true]);
    });

    it('should generate log key without count', () => {
      expect(gitKeys.log('/path')).toEqual(['git', 'log', '/path', undefined]);
    });

    it('should generate log key with count', () => {
      expect(gitKeys.log('/path', 50)).toEqual(['git', 'log', '/path', 50]);
    });

    it('should generate validate key', () => {
      expect(gitKeys.validate('/path')).toEqual(['git', 'validate', '/path']);
    });

    it('should generate branches key without includeRemote', () => {
      expect(gitKeys.branches('/path')).toEqual(['git', 'branches', '/path', undefined]);
    });

    it('should generate branches key with includeRemote', () => {
      expect(gitKeys.branches('/path', true)).toEqual(['git', 'branches', '/path', true]);
    });
  });

  // ============================================
  // githubKeys Tests
  // ============================================
  describe('githubKeys', () => {
    it('should have correct all key', () => {
      expect(githubKeys.all).toEqual(['github']);
    });

    it('should generate repository key', () => {
      expect(githubKeys.repository('owner', 'repo')).toEqual(['github', 'repository', { owner: 'owner', repo: 'repo' }]);
    });

    it('should generate pullRequests key without filters', () => {
      expect(githubKeys.pullRequests()).toEqual(['github', 'pullRequests', undefined]);
    });

    it('should generate pullRequests key with filters', () => {
      const filters: GitHubPullRequestFilters = { state: 'open', page: 1 };
      expect(githubKeys.pullRequests(filters)).toEqual(['github', 'pullRequests', filters]);
    });

    it('should generate pullRequest key', () => {
      expect(githubKeys.pullRequest(123, 'owner', 'repo')).toEqual(['github', 'pullRequest', 123, { owner: 'owner', repo: 'repo' }]);
    });

    it('should generate pullRequestReviews key', () => {
      expect(githubKeys.pullRequestReviews(123, 'owner', 'repo')).toEqual(['github', 'pullRequestReviews', 123, { owner: 'owner', repo: 'repo' }]);
    });

    it('should generate workflowRuns key without filters', () => {
      expect(githubKeys.workflowRuns()).toEqual(['github', 'workflowRuns', undefined]);
    });

    it('should generate workflowRuns key with filters', () => {
      const filters: GitHubWorkflowRunFilters = { branch: 'main', status: 'completed' };
      expect(githubKeys.workflowRuns(filters)).toEqual(['github', 'workflowRuns', filters]);
    });

    it('should generate workflowRun key', () => {
      expect(githubKeys.workflowRun(456, 'owner', 'repo')).toEqual(['github', 'workflowRun', 456, { owner: 'owner', repo: 'repo' }]);
    });

    it('should generate workflows key', () => {
      expect(githubKeys.workflows('owner', 'repo')).toEqual(['github', 'workflows', { owner: 'owner', repo: 'repo' }]);
    });

    it('should generate checkRuns key', () => {
      expect(githubKeys.checkRuns('sha123', 'owner', 'repo')).toEqual(['github', 'checkRuns', 'sha123', { owner: 'owner', repo: 'repo' }]);
    });

    it('should generate pullRequestFiles key', () => {
      expect(githubKeys.pullRequestFiles(123, 'owner', 'repo')).toEqual(['github', 'pullRequestFiles', 123, { owner: 'owner', repo: 'repo' }]);
    });

    it('should generate branches key', () => {
      expect(githubKeys.branches('owner', 'repo')).toEqual(['github', 'branches', { owner: 'owner', repo: 'repo' }]);
    });

    it('should generate issues key', () => {
      const filters: GitHubIssueFilters = { state: 'open' };
      expect(githubKeys.issues(filters)).toEqual(['github', 'issues', filters]);
    });

    it('should generate commits key', () => {
      const filters: GitHubCommitFilters = { branch: 'main', page: 1 };
      expect(githubKeys.commits(filters)).toEqual(['github', 'commits', filters]);
    });

    it('should generate issueComments key', () => {
      expect(githubKeys.issueComments(123, 'owner', 'repo')).toEqual(['github', 'issueComments', 123, { owner: 'owner', repo: 'repo' }]);
    });
  });

  // ============================================
  // noteVersionKeys Tests
  // ============================================
  describe('noteVersionKeys', () => {
    it('should have correct all key', () => {
      expect(noteVersionKeys.all).toEqual(['noteVersions']);
    });

    it('should generate history key', () => {
      expect(noteVersionKeys.history('note-123')).toEqual(['noteVersions', 'history', 'note-123']);
    });

    it('should generate atTime key', () => {
      expect(noteVersionKeys.atTime('note-123', '2024-01-01')).toEqual(['noteVersions', 'at', 'note-123', '2024-01-01']);
    });

    it('should generate diff key', () => {
      expect(noteVersionKeys.diff('note-123', 1, 2)).toEqual(['noteVersions', 'diff', 'note-123', 1, 2]);
    });
  });

  // ============================================
  // chatSessionKeys Tests
  // ============================================
  describe('chatSessionKeys', () => {
    it('should have correct all key', () => {
      expect(chatSessionKeys.all).toEqual(['chatSessions']);
    });

    it('should generate stats key', () => {
      expect(chatSessionKeys.stats()).toEqual(['chatSessions', 'stats']);
    });

    it('should generate active key', () => {
      expect(chatSessionKeys.active()).toEqual(['chatSessions', 'active']);
    });

    it('should generate history key without filters', () => {
      expect(chatSessionKeys.history()).toEqual(['chatSessions', 'history', undefined]);
    });

    it('should generate history key with filters', () => {
      const filters: ChatSessionFilters = { since: '2024-01-01', until: '2024-12-31' };
      expect(chatSessionKeys.history(filters)).toEqual(['chatSessions', 'history', filters]);
    });

    it('should generate byConversation key without pagination', () => {
      expect(chatSessionKeys.byConversation('conv-123')).toEqual(['chatSessions', 'conversation', 'conv-123', { skip: undefined, take: undefined }]);
    });

    it('should generate byConversation key with pagination', () => {
      expect(chatSessionKeys.byConversation('conv-123', 10, 20)).toEqual(['chatSessions', 'conversation', 'conv-123', { skip: 10, take: 20 }]);
    });
  });

  // ============================================
  // queryKeys Unified Export Tests
  // ============================================
  describe('queryKeys unified export', () => {
    it('should have notes', () => {
      expect(queryKeys.notes).toBe(noteKeys);
    });

    it('should have conversations', () => {
      expect(queryKeys.conversations).toBe(conversationKeys);
    });

    it('should have aiHealth', () => {
      expect(queryKeys.aiHealth).toBe(aiHealthKeys);
    });

    it('should have indexing', () => {
      expect(queryKeys.indexing).toBe(indexingKeys);
    });

    it('should have ragAnalytics', () => {
      expect(queryKeys.ragAnalytics).toBe(ragAnalyticsKeys);
    });

    it('should have stats', () => {
      expect(queryKeys.stats).toBe(statsKeys);
    });

    it('should have userPreferences', () => {
      expect(queryKeys.userPreferences).toBe(userPreferencesKeys);
    });

    it('should have imageGeneration', () => {
      expect(queryKeys.imageGeneration).toBe(imageGenerationKeys);
    });

    it('should have agent', () => {
      expect(queryKeys.agent).toBe(agentKeys);
    });

    it('should have git', () => {
      expect(queryKeys.git).toBe(gitKeys);
    });

    it('should have github', () => {
      expect(queryKeys.github).toBe(githubKeys);
    });

    it('should have noteVersions', () => {
      expect(queryKeys.noteVersions).toBe(noteVersionKeys);
    });

    it('should have chatSessions', () => {
      expect(queryKeys.chatSessions).toBe(chatSessionKeys);
    });

    it('should have conversation legacy alias', () => {
      expect(queryKeys.conversation).toBe(conversationKeys.legacy);
    });
  });

  // ============================================
  // Utility Functions Tests
  // ============================================
  describe('createInvalidationPattern', () => {
    it('should create pattern from root key', () => {
      const pattern = createInvalidationPattern(noteKeys.all);
      expect(pattern).toEqual({ queryKey: ['notes'] });
    });

    it('should create pattern from function result', () => {
      const pattern = createInvalidationPattern(conversationKeys.lists());
      expect(pattern).toEqual({ queryKey: ['conversations', 'list'] });
    });
  });

  describe('matchesQueryKey', () => {
    it('should match exact key', () => {
      expect(matchesQueryKey(['notes', 'list'], ['notes', 'list'])).toBe(true);
    });

    it('should match prefix pattern', () => {
      expect(matchesQueryKey(['notes', 'list', { folder: 'work' }], ['notes', 'list'])).toBe(true);
    });

    it('should not match when key is shorter than pattern', () => {
      expect(matchesQueryKey(['notes'], ['notes', 'list'])).toBe(false);
    });

    it('should not match different keys', () => {
      expect(matchesQueryKey(['notes', 'detail'], ['notes', 'list'])).toBe(false);
    });

    it('should handle undefined in pattern as wildcard', () => {
      expect(matchesQueryKey(['notes', 'list', { folder: 'work' }], ['notes', undefined, { folder: 'work' }])).toBe(true);
    });

    it('should match complex objects in keys', () => {
      const filters = { folder: 'work', tags: ['urgent'] };
      expect(matchesQueryKey(['notes', 'list', filters], ['notes', 'list', filters])).toBe(true);
    });

    it('should not match different objects', () => {
      expect(matchesQueryKey(['notes', 'list', { folder: 'work' }], ['notes', 'list', { folder: 'personal' }])).toBe(false);
    });
  });
});
