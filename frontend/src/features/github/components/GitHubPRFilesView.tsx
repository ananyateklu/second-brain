import { useGitHubPullRequestFiles } from '../hooks';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import type { PullRequestFileSummary } from '../../../types/github';
import {
  getFileChangeStatusColor,
  getFileChangeStatusBgColor,
  getFileChangeStatusIcon,
} from '../../../types/github';

interface GitHubPRFilesViewProps {
  pullNumber: number;
  owner?: string;
  repo?: string;
}

export const GitHubPRFilesView = ({
  pullNumber,
  owner,
  repo,
}: GitHubPRFilesViewProps) => {
  const { data, isLoading, error, refetch } = useGitHubPullRequestFiles(
    pullNumber,
    owner,
    repo
  );

  if (isLoading) {
    return <LoadingSpinner size="sm" message="Loading files..." className="py-8" />;
  }

  if (error) {
    return (
      <div
        className="p-4 rounded-lg"
        style={{ backgroundColor: 'var(--status-error-bg)' }}
      >
        <p className="text-sm" style={{ color: 'var(--status-error)' }}>
          Failed to load files: {error instanceof Error ? error.message : 'Unknown error'}
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

  const files = data?.files || [];
  const totalCount = data?.totalCount || 0;

  // Calculate totals
  const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-medium" style={{ color: 'var(--text-primary)' }}>
            Files changed
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
        <div className="flex items-center gap-3 text-sm">
          <span className="text-green-500">+{totalAdditions}</span>
          <span className="text-red-500">-{totalDeletions}</span>
        </div>
      </div>

      {/* Files List */}
      {files.length === 0 ? (
        <div className="text-center py-8">
          <p style={{ color: 'var(--text-secondary)' }}>No files changed</p>
        </div>
      ) : (
        <div className="space-y-1">
          {files.map((file) => (
            <FileRow key={file.filename} file={file} />
          ))}
        </div>
      )}
    </div>
  );
};

interface FileRowProps {
  file: PullRequestFileSummary;
}

const FileRow = ({ file }: FileRowProps) => {
  // Extract filename and path
  const parts = file.filename.split('/');
  const filename = parts.pop() || file.filename;
  const directory = parts.length > 0 ? parts.join('/') + '/' : '';

  return (
    <div
      className="flex items-center gap-3 p-2 rounded-lg transition-all hover:bg-white/5"
      style={{ backgroundColor: 'var(--surface-card)' }}
    >
      {/* Status Icon */}
      <span
        className={`flex items-center justify-center w-5 h-5 rounded text-xs font-bold ${getFileChangeStatusBgColor(
          file.status
        )} ${getFileChangeStatusColor(file.status)}`}
      >
        {getFileChangeStatusIcon(file.status)}
      </span>

      {/* File Path */}
      <div className="flex-1 min-w-0 flex items-center gap-1">
        {directory && (
          <span
            className="text-sm truncate"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {directory}
          </span>
        )}
        <a
          href={file.blobUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium hover:underline truncate"
          style={{ color: 'var(--text-primary)' }}
        >
          {filename}
        </a>
      </div>

      {/* Changes */}
      <div className="flex items-center gap-2 text-xs font-mono">
        {file.additions > 0 && (
          <span className="text-green-500">+{file.additions}</span>
        )}
        {file.deletions > 0 && (
          <span className="text-red-500">-{file.deletions}</span>
        )}
        {file.additions === 0 && file.deletions === 0 && (
          <span style={{ color: 'var(--text-tertiary)' }}>0</span>
        )}
      </div>

      {/* Change Bar */}
      <div className="w-16 h-2 rounded-full overflow-hidden flex bg-gray-700/30">
        {file.changes > 0 && (
          <>
            <div
              className="h-full bg-green-500"
              style={{
                width: `${(file.additions / file.changes) * 100}%`,
              }}
            />
            <div
              className="h-full bg-red-500"
              style={{
                width: `${(file.deletions / file.changes) * 100}%`,
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};
