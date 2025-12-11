import { useState } from 'react';
import { useGitHubWorkflowRuns, useGitHubWorkflowRun } from '../hooks';
import { useRerunWorkflow, useCancelWorkflowRun } from '../hooks';
import type {
  WorkflowRunSummary,
  WorkflowStatus,
  WorkflowConclusion,
} from '../../../types/github';
import {
  getWorkflowStatusColor,
  getWorkflowStatusBgColor,
  formatRelativeTime,
  getWorkflowEventIcon,
} from '../../../types/github';

interface GitHubActionsPanelProps {
  owner?: string;
  repo?: string;
  onSelectRun?: (run: WorkflowRunSummary) => void;
  selectedRunId?: number;
}

export const GitHubActionsPanel = ({
  owner,
  repo,
  onSelectRun,
  selectedRunId,
}: GitHubActionsPanelProps) => {
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | ''>('');
  const [branchFilter, setBranchFilter] = useState('');
  const [page, setPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data, isLoading, error, refetch, isFetching } = useGitHubWorkflowRuns(
    {
      owner,
      repo,
      status: statusFilter || undefined,
      branch: branchFilter || undefined,
      page,
      perPage: 15,
    },
    { autoRefresh }
  );

  // Count in-progress runs for indicator
  const inProgressCount =
    data?.workflowRuns?.filter(
      (run) => run.status === 'in_progress' || run.status === 'queued'
    ).length ?? 0;

  const { data: selectedRun } = useGitHubWorkflowRun(
    selectedRunId ?? 0,
    owner,
    repo,
    !!selectedRunId
  );

  const rerunMutation = useRerunWorkflow(owner, repo);
  const cancelMutation = useCancelWorkflowRun(owner, repo);

  const getStatusIcon = (status: WorkflowStatus, conclusion?: WorkflowConclusion) => {
    if (status === 'completed') {
      switch (conclusion) {
        case 'success':
          return (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          );
        case 'failure':
          return (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          );
        case 'cancelled':
          return (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                clipRule="evenodd"
              />
            </svg>
          );
        default:
          return (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          );
      }
    }

    if (status === 'in_progress') {
      return (
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      );
    }

    return (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
          clipRule="evenodd"
        />
      </svg>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-4 rounded-xl border"
        style={{
          backgroundColor: 'var(--error-bg)',
          borderColor: 'var(--error-border)',
          color: 'var(--error-text)',
        }}
      >
        <p className="font-medium">Failed to load workflow runs</p>
        <p className="text-sm mt-1 opacity-80">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
        <button
          onClick={(e) => {
            e.preventDefault();
            void refetch();
          }}
          className="mt-2 text-sm underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as WorkflowStatus | '');
            setPage(1);
          }}
          className="px-3 py-2 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="in_progress">In Progress</option>
          <option value="queued">Queued</option>
        </select>

        <input
          type="text"
          placeholder="Filter by branch..."
          value={branchFilter}
          onChange={(e) => {
            setBranchFilter(e.target.value);
            setPage(1);
          }}
          className="flex-1 px-3 py-2 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }}
        />

        <button
          onClick={(e) => {
            e.preventDefault();
            void refetch();
          }}
          className={`p-2 rounded-lg hover:bg-surface-elevated transition-colors ${
            isFetching ? 'animate-spin' : ''
          }`}
          title="Refresh"
          disabled={isFetching}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            style={{ color: 'var(--text-secondary)' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>

        {/* Auto-refresh toggle */}
        <button
          onClick={(e) => {
            e.preventDefault();
            setAutoRefresh(!autoRefresh);
          }}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            autoRefresh ? 'bg-green-500/10' : ''
          }`}
          style={{
            backgroundColor: autoRefresh ? 'var(--color-primary-alpha)' : 'var(--surface-elevated)',
            color: autoRefresh ? 'var(--color-primary)' : 'var(--text-secondary)',
          }}
          title={autoRefresh ? 'Auto-refresh is ON' : 'Auto-refresh is OFF'}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`}
          />
          <span>Auto</span>
          {autoRefresh && inProgressCount > 0 && (
            <span
              className="px-1.5 py-0.5 text-xs rounded-full"
              style={{
                backgroundColor: 'var(--warning-bg)',
                color: 'var(--warning-text)',
              }}
            >
              {inProgressCount} running
            </span>
          )}
        </button>
      </div>

      {/* Workflow Runs List */}
      <div className="space-y-2">
        {!data?.workflowRuns || data.workflowRuns.length === 0 ? (
          <div
            className="text-center py-12 rounded-xl border"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              borderColor: 'var(--border)',
            }}
          >
            <svg
              className="w-12 h-12 mx-auto mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
            <p style={{ color: 'var(--text-secondary)' }}>
              No workflow runs found
            </p>
          </div>
        ) : (
          data.workflowRuns.map((run) => (
            <div
              key={run.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectRun?.(run)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectRun?.(run);
                }
              }}
              className={`w-full text-left p-4 rounded-xl border transition-all hover:scale-[1.01] cursor-pointer ${
                selectedRunId === run.id ? 'ring-2 ring-primary' : ''
              }`}
              style={{
                backgroundColor:
                  selectedRunId === run.id
                    ? 'var(--surface-elevated)'
                    : 'var(--surface-card)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="flex items-start gap-3">
                {/* Status Icon */}
                <div
                  className={`p-2 rounded-lg ${getWorkflowStatusBgColor(
                    run.status,
                    run.conclusion as WorkflowConclusion
                  )}`}
                >
                  <span
                    className={getWorkflowStatusColor(
                      run.status,
                      run.conclusion as WorkflowConclusion
                    )}
                  >
                    {getStatusIcon(run.status, run.conclusion as WorkflowConclusion)}
                  </span>
                </div>

                {/* Run Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-semibold truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {run.displayTitle || run.name}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: 'var(--surface-elevated)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {getWorkflowEventIcon(run.event)} {run.event}
                    </span>
                  </div>

                  <div
                    className="flex items-center gap-2 mt-1 text-sm"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <span>{run.name}</span>
                    <span>•</span>
                    <span>#{run.runNumber}</span>
                  </div>

                  <div
                    className="flex items-center gap-3 mt-2 text-xs"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    <span className="flex items-center gap-1">
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                        />
                      </svg>
                      {run.headBranch}
                    </span>
                    <span>•</span>
                    <code className="text-xs">{run.headSha.slice(0, 7)}</code>
                    <span>•</span>
                    <span>{formatRelativeTime(run.createdAt)}</span>
                  </div>
                </div>

                {/* Actor and Actions */}
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <img
                      src={run.actorAvatarUrl}
                      alt={run.actor}
                      className="w-6 h-6 rounded-full"
                    />
                    <span
                      className="text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {run.actor}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {run.status === 'in_progress' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelMutation.mutate(run.id);
                        }}
                        disabled={cancelMutation.isPending}
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor: 'var(--error-bg)',
                          color: 'var(--error-text)',
                        }}
                        title="Cancel workflow"
                      >
                        {cancelMutation.isPending ? '...' : 'Cancel'}
                      </button>
                    )}
                    {run.status === 'completed' &&
                      run.conclusion !== 'success' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            rerunMutation.mutate(run.id);
                          }}
                          disabled={rerunMutation.isPending}
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{
                            backgroundColor: 'var(--color-primary-alpha)',
                            color: 'var(--color-primary)',
                          }}
                          title="Re-run workflow"
                        >
                          {rerunMutation.isPending ? '...' : 'Re-run'}
                        </button>
                      )}
                    <a
                      href={run.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 rounded hover:bg-surface-elevated"
                      title="View on GitHub"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>

              {/* Jobs (when selected) */}
              {selectedRunId === run.id && selectedRun?.jobs && selectedRun.jobs.length > 0 && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                  <p
                    className="text-xs font-medium mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Jobs
                  </p>
                  <div className="space-y-2">
                    {selectedRun.jobs.map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center gap-2 text-sm p-2 rounded-lg"
                        style={{ backgroundColor: 'var(--surface-card)' }}
                      >
                        <span
                          className={getWorkflowStatusColor(
                            job.status,
                            job.conclusion as WorkflowConclusion
                          )}
                        >
                          {getStatusIcon(job.status, job.conclusion as WorkflowConclusion)}
                        </span>
                        <span style={{ color: 'var(--text-primary)' }}>{job.name}</span>
                        {job.startedAt && job.completedAt && (
                          <span
                            className="text-xs ml-auto"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            {Math.round(
                              (new Date(job.completedAt).getTime() -
                                new Date(job.startedAt).getTime()) /
                                1000
                            )}
                            s
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {data && (data.hasMore || page > 1) && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              color: 'var(--text-primary)',
            }}
          >
            Previous
          </button>
          <span style={{ color: 'var(--text-secondary)' }}>Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!data.hasMore}
            className="px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--surface-elevated)',
              color: 'var(--text-primary)',
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
