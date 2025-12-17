// GitHub API Types

export interface GitHubUser {
  login: string;
  id: number;
  avatarUrl: string;
  htmlUrl: string;
}

export interface GitHubLabel {
  id: number;
  name: string;
  color: string;
  description?: string;
}

export interface GitHubRepositoryInfo {
  owner: string;
  repo: string;
  fullName: string;
  htmlUrl: string;
  defaultBranch?: string;
  isConfigured: boolean;
}

// User Repository Types

export interface RepositorySummary {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  ownerAvatarUrl: string;
  isPrivate: boolean;
  description?: string;
  htmlUrl: string;
  defaultBranch: string;
  language?: string;
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
  updatedAt: string;
  pushedAt?: string;
}

export interface GitHubRepositoriesResponse {
  repositories: RepositorySummary[];
  totalCount: number;
  page: number;
  perPage: number;
  hasMore: boolean;
}

export interface GitHubRepositoriesRequest {
  type?: 'all' | 'owner' | 'public' | 'private' | 'member';
  sort?: 'created' | 'updated' | 'pushed' | 'full_name';
  page?: number;
  perPage?: number;
}

// Pull Request Types

export interface ReviewSummary {
  author: string;
  authorAvatarUrl: string;
  state: ReviewState;
  submittedAt?: string;
}

export type ReviewState = 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING';

export interface CheckRunSummary {
  name: string;
  status: CheckStatus;
  conclusion?: CheckConclusion;
  htmlUrl?: string;
}

export type CheckStatus = 'queued' | 'in_progress' | 'completed';
export type CheckConclusion = 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required';

export interface PullRequestSummary {
  number: number;
  title: string;
  state: PullRequestState;
  author: string;
  authorAvatarUrl: string;
  htmlUrl: string;
  headBranch: string;
  baseBranch: string;
  isDraft: boolean;
  isMerged: boolean;
  createdAt: string;
  updatedAt: string;
  labels: GitHubLabel[];
  commentsCount: number;
  additions: number;
  deletions: number;
  changedFiles: number;
  reviews: ReviewSummary[];
  checkRuns: CheckRunSummary[];
}

export type PullRequestState = 'open' | 'closed' | 'merged';
export type PullRequestFilter = 'open' | 'closed' | 'all';

export interface GitHubPullRequestsResponse {
  pullRequests: PullRequestSummary[];
  totalCount: number;
  page: number;
  perPage: number;
  hasMore: boolean;
}

// GitHub Actions Types

export interface WorkflowStepSummary {
  number: number;
  name: string;
  status: string;
  conclusion?: string;
}

export interface WorkflowJobSummary {
  id: number;
  name: string;
  status: WorkflowStatus;
  conclusion?: WorkflowConclusion;
  startedAt?: string;
  completedAt?: string;
  htmlUrl: string;
  steps: WorkflowStepSummary[];
}

export interface WorkflowRunSummary {
  id: number;
  name: string;
  displayTitle: string;
  headBranch: string;
  headSha: string;
  runNumber: number;
  event: WorkflowEvent;
  status: WorkflowStatus;
  conclusion?: WorkflowConclusion;
  htmlUrl: string;
  createdAt: string;
  runStartedAt?: string;
  actor: string;
  actorAvatarUrl: string;
  jobs: WorkflowJobSummary[];
}

export type WorkflowStatus = 'queued' | 'in_progress' | 'completed';
export type WorkflowConclusion = 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required';
export type WorkflowEvent = string;

export interface GitHubWorkflow {
  id: number;
  name: string;
  path: string;
  state: string;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
}

export interface GitHubActionsResponse {
  workflowRuns: WorkflowRunSummary[];
  totalCount: number;
  page: number;
  perPage: number;
  hasMore: boolean;
}

// Request Types

export interface GitHubPullRequestsRequest {
  owner?: string;
  repo?: string;
  state?: PullRequestFilter;
  page?: number;
  perPage?: number;
}

export interface GitHubWorkflowRunsRequest {
  owner?: string;
  repo?: string;
  branch?: string;
  status?: WorkflowStatus | '';
  page?: number;
  perPage?: number;
}

// PR Files Types

export interface PullRequestFileSummary {
  filename: string;
  status: FileChangeStatus;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  blobUrl?: string;
  rawUrl?: string;
}

export type FileChangeStatus = 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';

export interface GitHubPullRequestFilesResponse {
  files: PullRequestFileSummary[];
  totalCount: number;
}

export interface GitHubPullRequestFilesRequest {
  pullNumber: number;
  owner?: string;
  repo?: string;
}

// Branch Types

export interface BranchSummary {
  name: string;
  commitSha: string;
  isProtected: boolean;
  isDefault: boolean;
}

export interface GitHubBranchesResponse {
  branches: BranchSummary[];
  defaultBranch?: string;
}

export interface GitHubBranchesRequest {
  owner?: string;
  repo?: string;
}

// Issue Types

export interface IssueSummary {
  number: number;
  title: string;
  state: IssueState;
  author: string;
  authorAvatarUrl: string;
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  labels: GitHubLabel[];
  commentsCount: number;
  body?: string;
  assignees: string[];
  milestone?: string;
}

export type IssueState = 'open' | 'closed';
export type IssueFilter = 'open' | 'closed' | 'all';

export interface GitHubIssuesResponse {
  issues: IssueSummary[];
  totalCount: number;
  page: number;
  perPage: number;
  hasMore: boolean;
}

export interface GitHubIssuesRequest {
  owner?: string;
  repo?: string;
  state?: IssueFilter;
  page?: number;
  perPage?: number;
}

// Commit Types

export interface CommitSummary {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  authorAvatarUrl: string;
  authoredAt: string;
  committer: string;
  htmlUrl: string;
  additions: number;
  deletions: number;
  filesChanged: number;
}

export interface GitHubCommitsResponse {
  commits: CommitSummary[];
  totalCount: number;
  page: number;
  perPage: number;
  hasMore: boolean;
}

export interface GitHubCommitsRequest {
  owner?: string;
  repo?: string;
  branch?: string;
  page?: number;
  perPage?: number;
}

// Comment Types

export interface CommentSummary {
  id: number;
  body: string;
  author: string;
  authorAvatarUrl: string;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
}

export interface GitHubCommentsResponse {
  comments: CommentSummary[];
  totalCount: number;
}

export interface GitHubCommentsRequest {
  issueNumber: number;
  owner?: string;
  repo?: string;
}

// Utility Functions

export const getReviewStateColor = (state: ReviewState): string => {
  switch (state) {
    case 'APPROVED':
      return 'text-green-500';
    case 'CHANGES_REQUESTED':
      return 'text-red-500';
    case 'COMMENTED':
      return 'text-blue-500';
    case 'DISMISSED':
      return 'text-gray-500';
    case 'PENDING':
      return 'text-yellow-500';
    default:
      return 'text-gray-500';
  }
};

export const getReviewStateBgColor = (state: ReviewState): string => {
  switch (state) {
    case 'APPROVED':
      return 'bg-green-500/10';
    case 'CHANGES_REQUESTED':
      return 'bg-red-500/10';
    case 'COMMENTED':
      return 'bg-blue-500/10';
    case 'DISMISSED':
      return 'bg-gray-500/10';
    case 'PENDING':
      return 'bg-yellow-500/10';
    default:
      return 'bg-gray-500/10';
  }
};

export const getWorkflowStatusColor = (status: WorkflowStatus, conclusion?: WorkflowConclusion): string => {
  if (status === 'completed') {
    switch (conclusion) {
      case 'success':
        return 'text-green-500';
      case 'failure':
        return 'text-red-500';
      case 'cancelled':
        return 'text-gray-500';
      case 'skipped':
        return 'text-gray-400';
      case 'timed_out':
        return 'text-orange-500';
      case 'action_required':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  }

  switch (status) {
    case 'in_progress':
      return 'text-yellow-500';
    case 'queued':
      return 'text-blue-500';
    default:
      return 'text-gray-500';
  }
};

export const getWorkflowStatusBgColor = (status: WorkflowStatus, conclusion?: WorkflowConclusion): string => {
  if (status === 'completed') {
    switch (conclusion) {
      case 'success':
        return 'bg-green-500/10';
      case 'failure':
        return 'bg-red-500/10';
      case 'cancelled':
        return 'bg-gray-500/10';
      case 'skipped':
        return 'bg-gray-400/10';
      case 'timed_out':
        return 'bg-orange-500/10';
      case 'action_required':
        return 'bg-yellow-500/10';
      default:
        return 'bg-gray-500/10';
    }
  }

  switch (status) {
    case 'in_progress':
      return 'bg-yellow-500/10';
    case 'queued':
      return 'bg-blue-500/10';
    default:
      return 'bg-gray-500/10';
  }
};

export const getPullRequestStateColor = (state: PullRequestState): string => {
  switch (state) {
    case 'open':
      return 'text-green-500';
    case 'closed':
      return 'text-red-500';
    case 'merged':
      return 'text-purple-500';
    default:
      return 'text-gray-500';
  }
};

export const getPullRequestStateBgColor = (state: PullRequestState): string => {
  switch (state) {
    case 'open':
      return 'bg-green-500/10';
    case 'closed':
      return 'bg-red-500/10';
    case 'merged':
      return 'bg-purple-500/10';
    default:
      return 'bg-gray-500/10';
  }
};

export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
};

export const getWorkflowEventIcon = (event: WorkflowEvent): string => {
  switch (event) {
    case 'push':
      return '↑';
    case 'pull_request':
      return '⇌';
    case 'workflow_dispatch':
      return '▶';
    case 'schedule':
      return '⏰';
    case 'release':
      return '🏷️';
    default:
      return '•';
  }
};

export const getFileChangeStatusColor = (status: FileChangeStatus): string => {
  switch (status) {
    case 'added':
      return 'text-green-500';
    case 'removed':
      return 'text-red-500';
    case 'modified':
      return 'text-yellow-500';
    case 'renamed':
      return 'text-blue-500';
    case 'copied':
      return 'text-purple-500';
    default:
      return 'text-gray-500';
  }
};

export const getFileChangeStatusBgColor = (status: FileChangeStatus): string => {
  switch (status) {
    case 'added':
      return 'bg-green-500/10';
    case 'removed':
      return 'bg-red-500/10';
    case 'modified':
      return 'bg-yellow-500/10';
    case 'renamed':
      return 'bg-blue-500/10';
    case 'copied':
      return 'bg-purple-500/10';
    default:
      return 'bg-gray-500/10';
  }
};

export const getFileChangeStatusIcon = (status: FileChangeStatus): string => {
  switch (status) {
    case 'added':
      return '+';
    case 'removed':
      return '-';
    case 'modified':
      return '~';
    case 'renamed':
      return '→';
    case 'copied':
      return '⊕';
    default:
      return '•';
  }
};

export const getIssueStateColor = (state: IssueState): string => {
  switch (state) {
    case 'open':
      return 'text-green-500';
    case 'closed':
      return 'text-purple-500';
    default:
      return 'text-gray-500';
  }
};

export const getIssueStateBgColor = (state: IssueState): string => {
  switch (state) {
    case 'open':
      return 'bg-green-500/10';
    case 'closed':
      return 'bg-purple-500/10';
    default:
      return 'bg-gray-500/10';
  }
};

// Repository Tree Types (Code Browser)

export interface TreeEntrySummary {
  path: string;
  name: string;
  type: 'file' | 'directory';
  sha: string;
  size?: number;
}

export interface GitHubRepositoryTreeResponse {
  sha: string;
  entries: TreeEntrySummary[];
  truncated: boolean;
  totalCount: number;
}

export interface GitHubRepositoryTreeRequest {
  treeSha: string;
  owner?: string;
  repo?: string;
}

// File Content Types (Code Browser)

export interface GitHubFileContentResponse {
  path: string;
  name: string;
  content: string;
  sha: string;
  size: number;
  htmlUrl: string;
  isBinary: boolean;
  isTruncated: boolean;
  language?: string;
}

export interface GitHubFileContentRequest {
  path: string;
  ref?: string;
  owner?: string;
  repo?: string;
}

// Hierarchical File Tree Node (built client-side from flat entries)

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  sha: string;
  size?: number;
  children?: FileTreeNode[];
  isExpanded?: boolean;
}

// Language mapping for react-syntax-highlighter

export const getLanguageForHighlighter = (lang?: string): string => {
  if (!lang) return 'text';
  const mapping: Record<string, string> = {
    csharp: 'csharp',
    typescript: 'typescript',
    javascript: 'javascript',
    python: 'python',
    rust: 'rust',
    go: 'go',
    java: 'java',
    json: 'json',
    markdown: 'markdown',
    yaml: 'yaml',
    html: 'html',
    css: 'css',
    bash: 'bash',
    shell: 'bash',
    sql: 'sql',
    xml: 'xml',
    ruby: 'ruby',
    php: 'php',
    swift: 'swift',
    kotlin: 'kotlin',
    scala: 'scala',
    dockerfile: 'dockerfile',
    makefile: 'makefile',
    toml: 'toml',
    ini: 'ini',
    plaintext: 'text',
  };
  return mapping[lang.toLowerCase()] || 'text';
};
