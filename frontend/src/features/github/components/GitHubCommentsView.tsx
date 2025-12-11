import { useGitHubIssueComments } from '../hooks';
import type { CommentSummary } from '../../../types/github';
import { formatRelativeTime } from '../../../types/github';

interface GitHubCommentsViewProps {
  issueNumber: number;
  owner?: string;
  repo?: string;
}

export const GitHubCommentsView = ({
  issueNumber,
  owner,
  repo,
}: GitHubCommentsViewProps) => {
  const { data, isLoading, error, refetch } = useGitHubIssueComments(
    issueNumber,
    owner,
    repo
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Loading comments...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-4 rounded-lg"
        style={{ backgroundColor: 'var(--status-error-bg)' }}
      >
        <p className="text-sm" style={{ color: 'var(--status-error)' }}>
          Failed to load comments: {error instanceof Error ? error.message : 'Unknown error'}
        </p>
        <button
          onClick={(e) => {
            e.preventDefault();
            void refetch();
          }}
          className="mt-2 text-sm underline"
          style={{ color: 'var(--status-error)' }}
        >
          Try again
        </button>
      </div>
    );
  }

  const comments = data?.comments || [];
  const totalCount = data?.totalCount || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>
          Comments
        </h3>
        <span
          className="px-2 py-0.5 rounded-full text-xs font-medium"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            color: 'var(--text-secondary)',
          }}
        >
          {totalCount}
        </span>
      </div>

      {/* Comments List */}
      {comments.length === 0 ? (
        <div className="text-center py-8">
          <svg
            className="w-10 h-10 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <p style={{ color: 'var(--text-secondary)' }}>No comments yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentCard key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </div>
  );
};

interface CommentCardProps {
  comment: CommentSummary;
}

const CommentCard = ({ comment }: CommentCardProps) => {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Comment Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          borderColor: 'var(--border)',
        }}
      >
        <img
          src={comment.authorAvatarUrl}
          alt={comment.author}
          className="w-6 h-6 rounded-full"
        />
        <div className="flex items-center gap-2 text-sm">
          <a
            href={comment.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:underline"
            style={{ color: 'var(--text-primary)' }}
          >
            {comment.author}
          </a>
          <span style={{ color: 'var(--text-tertiary)' }}>
            commented {formatRelativeTime(comment.createdAt)}
          </span>
          {comment.updatedAt !== comment.createdAt && (
            <span style={{ color: 'var(--text-tertiary)' }}>
              · edited
            </span>
          )}
        </div>
      </div>

      {/* Comment Body */}
      <div className="p-4">
        <div
          className="prose prose-sm prose-invert max-w-none"
          style={{ color: 'var(--text-secondary)' }}
        >
          {/* Simple markdown-like rendering */}
          {comment.body.split('\n').map((line, i) => {
            // Code blocks
            if (line.startsWith('```')) {
              return null; // Skip code fence markers
            }
            // Inline code
            if (line.includes('`')) {
              const parts = line.split(/`([^`]+)`/g);
              return (
                <p key={i} className="mb-2">
                  {parts.map((part, j) =>
                    j % 2 === 1 ? (
                      <code
                        key={j}
                        className="px-1.5 py-0.5 rounded text-xs font-mono"
                        style={{ backgroundColor: 'var(--surface-elevated)' }}
                      >
                        {part}
                      </code>
                    ) : (
                      part
                    )
                  )}
                </p>
              );
            }
            // Headers
            if (line.startsWith('### ')) {
              return (
                <h4
                  key={i}
                  className="font-semibold mt-4 mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {line.substring(4)}
                </h4>
              );
            }
            if (line.startsWith('## ')) {
              return (
                <h3
                  key={i}
                  className="font-bold mt-4 mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {line.substring(3)}
                </h3>
              );
            }
            if (line.startsWith('# ')) {
              return (
                <h2
                  key={i}
                  className="font-bold text-lg mt-4 mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {line.substring(2)}
                </h2>
              );
            }
            // List items
            if (line.startsWith('- ') || line.startsWith('* ')) {
              return (
                <li key={i} className="ml-4 list-disc">
                  {line.substring(2)}
                </li>
              );
            }
            // Numbered lists
            const numberedMatch = line.match(/^(\d+)\.\s/);
            if (numberedMatch) {
              return (
                <li key={i} className="ml-4 list-decimal">
                  {line.substring(numberedMatch[0].length)}
                </li>
              );
            }
            // Blockquotes
            if (line.startsWith('> ')) {
              return (
                <blockquote
                  key={i}
                  className="border-l-2 pl-3 my-2 italic"
                  style={{
                    borderColor: 'var(--border)',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {line.substring(2)}
                </blockquote>
              );
            }
            // Empty lines
            if (!line.trim()) {
              return <br key={i} />;
            }
            // Regular paragraphs
            return (
              <p key={i} className="mb-2">
                {line}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
};
