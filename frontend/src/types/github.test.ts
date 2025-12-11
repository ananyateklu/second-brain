import { describe, it, expect } from 'vitest';
import {
  getReviewStateColor,
  getReviewStateBgColor,
  getWorkflowStatusColor,
  getWorkflowStatusBgColor,
  getPullRequestStateColor,
  getPullRequestStateBgColor,
  formatRelativeTime,
  getWorkflowEventIcon,
  getFileChangeStatusColor,
  getFileChangeStatusBgColor,
  getFileChangeStatusIcon,
  getIssueStateColor,
  getIssueStateBgColor,
  type ReviewState,
  type WorkflowStatus,
  type WorkflowConclusion,
  type PullRequestState,
  type WorkflowEvent,
  type FileChangeStatus,
  type IssueState,
} from './github';

describe('GitHub Type Utilities', () => {
  describe('getReviewStateColor', () => {
    it('returns green for APPROVED', () => {
      expect(getReviewStateColor('APPROVED')).toBe('text-green-500');
    });

    it('returns red for CHANGES_REQUESTED', () => {
      expect(getReviewStateColor('CHANGES_REQUESTED')).toBe('text-red-500');
    });

    it('returns blue for COMMENTED', () => {
      expect(getReviewStateColor('COMMENTED')).toBe('text-blue-500');
    });

    it('returns gray for DISMISSED', () => {
      expect(getReviewStateColor('DISMISSED')).toBe('text-gray-500');
    });

    it('returns yellow for PENDING', () => {
      expect(getReviewStateColor('PENDING')).toBe('text-yellow-500');
    });

    it('returns gray for unknown state', () => {
      expect(getReviewStateColor('UNKNOWN' as ReviewState)).toBe('text-gray-500');
    });
  });

  describe('getReviewStateBgColor', () => {
    it('returns correct background colors for all states', () => {
      expect(getReviewStateBgColor('APPROVED')).toBe('bg-green-500/10');
      expect(getReviewStateBgColor('CHANGES_REQUESTED')).toBe('bg-red-500/10');
      expect(getReviewStateBgColor('COMMENTED')).toBe('bg-blue-500/10');
      expect(getReviewStateBgColor('DISMISSED')).toBe('bg-gray-500/10');
      expect(getReviewStateBgColor('PENDING')).toBe('bg-yellow-500/10');
      expect(getReviewStateBgColor('UNKNOWN' as ReviewState)).toBe('bg-gray-500/10');
    });
  });

  describe('getWorkflowStatusColor', () => {
    describe('when completed', () => {
      it('returns green for success conclusion', () => {
        expect(getWorkflowStatusColor('completed', 'success')).toBe('text-green-500');
      });

      it('returns red for failure conclusion', () => {
        expect(getWorkflowStatusColor('completed', 'failure')).toBe('text-red-500');
      });

      it('returns gray for cancelled conclusion', () => {
        expect(getWorkflowStatusColor('completed', 'cancelled')).toBe('text-gray-500');
      });

      it('returns light gray for skipped conclusion', () => {
        expect(getWorkflowStatusColor('completed', 'skipped')).toBe('text-gray-400');
      });

      it('returns orange for timed_out conclusion', () => {
        expect(getWorkflowStatusColor('completed', 'timed_out')).toBe('text-orange-500');
      });

      it('returns yellow for action_required conclusion', () => {
        expect(getWorkflowStatusColor('completed', 'action_required')).toBe('text-yellow-500');
      });

      it('returns gray for neutral conclusion', () => {
        expect(getWorkflowStatusColor('completed', 'neutral')).toBe('text-gray-500');
      });
    });

    describe('when not completed', () => {
      it('returns yellow for in_progress status', () => {
        expect(getWorkflowStatusColor('in_progress')).toBe('text-yellow-500');
      });

      it('returns blue for queued status', () => {
        expect(getWorkflowStatusColor('queued')).toBe('text-blue-500');
      });

      it('returns gray for unknown status', () => {
        expect(getWorkflowStatusColor('unknown' as WorkflowStatus)).toBe('text-gray-500');
      });
    });
  });

  describe('getWorkflowStatusBgColor', () => {
    describe('when completed', () => {
      it('returns correct background colors for all conclusions', () => {
        expect(getWorkflowStatusBgColor('completed', 'success')).toBe('bg-green-500/10');
        expect(getWorkflowStatusBgColor('completed', 'failure')).toBe('bg-red-500/10');
        expect(getWorkflowStatusBgColor('completed', 'cancelled')).toBe('bg-gray-500/10');
        expect(getWorkflowStatusBgColor('completed', 'skipped')).toBe('bg-gray-400/10');
        expect(getWorkflowStatusBgColor('completed', 'timed_out')).toBe('bg-orange-500/10');
        expect(getWorkflowStatusBgColor('completed', 'action_required')).toBe('bg-yellow-500/10');
      });
    });

    describe('when not completed', () => {
      it('returns correct background colors for statuses', () => {
        expect(getWorkflowStatusBgColor('in_progress')).toBe('bg-yellow-500/10');
        expect(getWorkflowStatusBgColor('queued')).toBe('bg-blue-500/10');
      });
    });
  });

  describe('getPullRequestStateColor', () => {
    it('returns green for open PRs', () => {
      expect(getPullRequestStateColor('open')).toBe('text-green-500');
    });

    it('returns red for closed PRs', () => {
      expect(getPullRequestStateColor('closed')).toBe('text-red-500');
    });

    it('returns purple for merged PRs', () => {
      expect(getPullRequestStateColor('merged')).toBe('text-purple-500');
    });

    it('returns gray for unknown state', () => {
      expect(getPullRequestStateColor('unknown' as PullRequestState)).toBe('text-gray-500');
    });
  });

  describe('getPullRequestStateBgColor', () => {
    it('returns correct background colors for all states', () => {
      expect(getPullRequestStateBgColor('open')).toBe('bg-green-500/10');
      expect(getPullRequestStateBgColor('closed')).toBe('bg-red-500/10');
      expect(getPullRequestStateBgColor('merged')).toBe('bg-purple-500/10');
      expect(getPullRequestStateBgColor('unknown' as PullRequestState)).toBe('bg-gray-500/10');
    });
  });

  describe('formatRelativeTime', () => {
    it('returns "just now" for times less than 60 seconds ago', () => {
      const now = new Date();
      const thirtySecsAgo = new Date(now.getTime() - 30 * 1000).toISOString();
      expect(formatRelativeTime(thirtySecsAgo)).toBe('just now');
    });

    it('returns minutes for times less than 60 minutes ago', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
      expect(formatRelativeTime(fiveMinutesAgo)).toBe('5m ago');
    });

    it('returns hours for times less than 24 hours ago', () => {
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago');
    });

    it('returns days for times less than 7 days ago', () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(twoDaysAgo)).toBe('2d ago');
    });

    it('returns formatted date for times more than 7 days ago', () => {
      const now = new Date();
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(tenDaysAgo.toISOString());
      // Should return a date string (format varies by locale)
      expect(result).not.toBe('just now');
      expect(result).not.toContain('ago');
    });
  });

  describe('getWorkflowEventIcon', () => {
    it('returns correct icons for workflow events', () => {
      expect(getWorkflowEventIcon('push')).toBe('↑');
      expect(getWorkflowEventIcon('pull_request')).toBe('⇌');
      expect(getWorkflowEventIcon('workflow_dispatch')).toBe('▶');
      expect(getWorkflowEventIcon('schedule')).toBe('⏰');
      expect(getWorkflowEventIcon('release')).toBe('🏷️');
      expect(getWorkflowEventIcon('unknown_event' as WorkflowEvent)).toBe('•');
    });
  });

  describe('getFileChangeStatusColor', () => {
    it('returns green for added files', () => {
      expect(getFileChangeStatusColor('added')).toBe('text-green-500');
    });

    it('returns red for removed files', () => {
      expect(getFileChangeStatusColor('removed')).toBe('text-red-500');
    });

    it('returns yellow for modified files', () => {
      expect(getFileChangeStatusColor('modified')).toBe('text-yellow-500');
    });

    it('returns blue for renamed files', () => {
      expect(getFileChangeStatusColor('renamed')).toBe('text-blue-500');
    });

    it('returns purple for copied files', () => {
      expect(getFileChangeStatusColor('copied')).toBe('text-purple-500');
    });

    it('returns gray for unchanged files', () => {
      expect(getFileChangeStatusColor('unchanged')).toBe('text-gray-500');
    });

    it('returns gray for unknown status', () => {
      expect(getFileChangeStatusColor('changed')).toBe('text-gray-500');
    });
  });

  describe('getFileChangeStatusBgColor', () => {
    it('returns correct background colors for all statuses', () => {
      expect(getFileChangeStatusBgColor('added')).toBe('bg-green-500/10');
      expect(getFileChangeStatusBgColor('removed')).toBe('bg-red-500/10');
      expect(getFileChangeStatusBgColor('modified')).toBe('bg-yellow-500/10');
      expect(getFileChangeStatusBgColor('renamed')).toBe('bg-blue-500/10');
      expect(getFileChangeStatusBgColor('copied')).toBe('bg-purple-500/10');
      expect(getFileChangeStatusBgColor('unchanged')).toBe('bg-gray-500/10');
    });
  });

  describe('getFileChangeStatusIcon', () => {
    it('returns correct icons for all statuses', () => {
      expect(getFileChangeStatusIcon('added')).toBe('+');
      expect(getFileChangeStatusIcon('removed')).toBe('-');
      expect(getFileChangeStatusIcon('modified')).toBe('~');
      expect(getFileChangeStatusIcon('renamed')).toBe('→');
      expect(getFileChangeStatusIcon('copied')).toBe('⊕');
      expect(getFileChangeStatusIcon('unchanged')).toBe('•');
      expect(getFileChangeStatusIcon('changed')).toBe('•');
    });
  });

  describe('getIssueStateColor', () => {
    it('returns green for open issues', () => {
      expect(getIssueStateColor('open')).toBe('text-green-500');
    });

    it('returns purple for closed issues', () => {
      expect(getIssueStateColor('closed')).toBe('text-purple-500');
    });

    it('returns gray for unknown state', () => {
      expect(getIssueStateColor('unknown' as IssueState)).toBe('text-gray-500');
    });
  });

  describe('getIssueStateBgColor', () => {
    it('returns correct background colors for all states', () => {
      expect(getIssueStateBgColor('open')).toBe('bg-green-500/10');
      expect(getIssueStateBgColor('closed')).toBe('bg-purple-500/10');
      expect(getIssueStateBgColor('unknown' as IssueState)).toBe('bg-gray-500/10');
    });
  });
});

describe('GitHub Types', () => {
  describe('Type definitions', () => {
    it('ReviewState type should accept valid values', () => {
      const approved: ReviewState = 'APPROVED';
      const changesRequested: ReviewState = 'CHANGES_REQUESTED';
      const commented: ReviewState = 'COMMENTED';
      const dismissed: ReviewState = 'DISMISSED';
      const pending: ReviewState = 'PENDING';

      expect(approved).toBe('APPROVED');
      expect(changesRequested).toBe('CHANGES_REQUESTED');
      expect(commented).toBe('COMMENTED');
      expect(dismissed).toBe('DISMISSED');
      expect(pending).toBe('PENDING');
    });

    it('WorkflowStatus type should accept valid values', () => {
      const queued: WorkflowStatus = 'queued';
      const inProgress: WorkflowStatus = 'in_progress';
      const completed: WorkflowStatus = 'completed';

      expect(queued).toBe('queued');
      expect(inProgress).toBe('in_progress');
      expect(completed).toBe('completed');
    });

    it('WorkflowConclusion type should accept valid values', () => {
      const conclusions: WorkflowConclusion[] = [
        'success',
        'failure',
        'neutral',
        'cancelled',
        'skipped',
        'timed_out',
        'action_required',
      ];

      conclusions.forEach((conclusion) => {
        expect(typeof conclusion).toBe('string');
      });
    });

    it('PullRequestState type should accept valid values', () => {
      const open: PullRequestState = 'open';
      const closed: PullRequestState = 'closed';
      const merged: PullRequestState = 'merged';

      expect(open).toBe('open');
      expect(closed).toBe('closed');
      expect(merged).toBe('merged');
    });

    it('FileChangeStatus type should accept valid values', () => {
      const statuses: FileChangeStatus[] = [
        'added',
        'removed',
        'modified',
        'renamed',
        'copied',
        'changed',
        'unchanged',
      ];

      statuses.forEach((status) => {
        expect(typeof status).toBe('string');
      });
    });

    it('IssueState type should accept valid values', () => {
      const open: IssueState = 'open';
      const closed: IssueState = 'closed';

      expect(open).toBe('open');
      expect(closed).toBe('closed');
    });
  });
});
