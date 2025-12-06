import { useState, useCallback } from 'react';
import { ragService } from '../../../services/rag.service';
import type { RagFeedbackType, RagFeedbackCategory } from '../../../types/rag';
import { ragAnalyticsKeys } from '../../../lib/query-keys';
import { useApiMutation } from '../../../hooks/use-api-mutation';

interface MessageFeedbackProps {
  /** RAG query log ID for submitting feedback */
  ragLogId: string;
  /** Current feedback state (if already submitted) */
  currentFeedback?: RagFeedbackType | null;
  /** Callback when feedback is submitted */
  onFeedbackSubmitted?: (feedback: RagFeedbackType) => void;
}

const FEEDBACK_CATEGORIES: { value: RagFeedbackCategory; label: string }[] = [
  { value: 'wrong_info', label: 'Wrong information' },
  { value: 'missing_context', label: 'Missing context' },
  { value: 'irrelevant', label: 'Irrelevant results' },
  { value: 'slow_response', label: 'Slow response' },
  { value: 'other', label: 'Other' },
];

/**
 * Component for collecting user feedback on RAG-enhanced chat responses.
 * Displays thumbs up/down buttons and optional category selection for negative feedback.
 */
export function MessageFeedback({
  ragLogId,
  currentFeedback,
  onFeedbackSubmitted
}: MessageFeedbackProps) {
  const [selectedFeedback, setSelectedFeedback] = useState<RagFeedbackType | null>(currentFeedback || null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<RagFeedbackCategory | null>(null);
  const [comment, setComment] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);

  const feedbackMutation = useApiMutation<void, {
    feedback: RagFeedbackType;
    category?: RagFeedbackCategory;
    commentText?: string;
  }>(
    async ({ feedback, category, commentText }) => {
      await ragService.submitFeedback({
        logId: ragLogId,
        feedback,
        category,
        comment: commentText,
      });
    },
    {
      invalidateQueries: [ragAnalyticsKeys.all()],
      showErrorToast: false, // Handle errors silently, just reset UI
      onSuccess: (_, variables) => {
        setSelectedFeedback(variables.feedback);
        setShowCategoryDropdown(false);
        setShowCommentInput(false);
        onFeedbackSubmitted?.(variables.feedback);
      },
      onError: (error) => {
        console.error('Failed to submit feedback:', error);
        // Reset to allow retry
        setSelectedFeedback(currentFeedback || null);
      },
    }
  );

  const handleThumbsUp = useCallback(() => {
    if (selectedFeedback === 'thumbs_up') return; // Already selected

    feedbackMutation.mutate({ feedback: 'thumbs_up' });
  }, [selectedFeedback, feedbackMutation]);

  const handleThumbsDown = useCallback(() => {
    if (selectedFeedback === 'thumbs_down' && !showCategoryDropdown) {
      // Already submitted, don't re-show dropdown
      return;
    }

    setSelectedFeedback('thumbs_down');
    setShowCategoryDropdown(true);
  }, [selectedFeedback, showCategoryDropdown]);

  const handleCategorySelect = useCallback((category: RagFeedbackCategory) => {
    setSelectedCategory(category);
    setShowCommentInput(true);
  }, []);

  const handleSubmitNegativeFeedback = useCallback(() => {
    feedbackMutation.mutate({
      feedback: 'thumbs_down',
      category: selectedCategory || undefined,
      commentText: comment.trim() || undefined,
    });
  }, [feedbackMutation, selectedCategory, comment]);

  const handleCancelFeedback = useCallback(() => {
    setSelectedFeedback(currentFeedback || null);
    setShowCategoryDropdown(false);
    setSelectedCategory(null);
    setComment('');
    setShowCommentInput(false);
  }, [currentFeedback]);

  const isSubmitting = feedbackMutation.isPending;

  return (
    <div className="mt-2">
      {/* Thumbs up/down buttons */}
      <div className="flex items-center gap-2">
        <span
          className="text-xs"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Was this helpful?
        </span>

        {/* Thumbs Up Button */}
        <button
          onClick={handleThumbsUp}
          disabled={isSubmitting}
          className={`p-1.5 rounded-lg transition-all duration-200 ${selectedFeedback === 'thumbs_up'
            ? 'scale-110'
            : 'hover:scale-105 opacity-60 hover:opacity-100'
            }`}
          style={{
            backgroundColor: selectedFeedback === 'thumbs_up'
              ? 'var(--accent-success-bg)'
              : 'transparent',
            color: selectedFeedback === 'thumbs_up'
              ? 'var(--accent-success)'
              : 'var(--text-secondary)',
          }}
          title="Helpful"
        >
          <svg
            className="w-4 h-4"
            fill={selectedFeedback === 'thumbs_up' ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={selectedFeedback === 'thumbs_up' ? 0 : 2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"
            />
          </svg>
        </button>

        {/* Thumbs Down Button */}
        <button
          onClick={handleThumbsDown}
          disabled={isSubmitting}
          className={`p-1.5 rounded-lg transition-all duration-200 ${selectedFeedback === 'thumbs_down'
            ? 'scale-110'
            : 'hover:scale-105 opacity-60 hover:opacity-100'
            }`}
          style={{
            backgroundColor: selectedFeedback === 'thumbs_down'
              ? 'var(--accent-error-bg)'
              : 'transparent',
            color: selectedFeedback === 'thumbs_down'
              ? 'var(--accent-error)'
              : 'var(--text-secondary)',
          }}
          title="Not helpful"
        >
          <svg
            className="w-4 h-4"
            fill={selectedFeedback === 'thumbs_down' ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={selectedFeedback === 'thumbs_down' ? 0 : 2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zm7-13h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"
            />
          </svg>
        </button>

        {/* Submitted indicator */}
        {selectedFeedback && !showCategoryDropdown && (
          <span
            className="text-xs ml-1"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Thanks for your feedback!
          </span>
        )}
      </div>

      {/* Category dropdown for negative feedback */}
      {showCategoryDropdown && (
        <div
          className="mt-3 p-3 rounded-lg border"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            borderColor: 'var(--border-secondary)',
          }}
        >
          <p
            className="text-sm font-medium mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            What went wrong?
          </p>

          {/* Category buttons */}
          <div className="flex flex-wrap gap-2 mb-3">
            {FEEDBACK_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => { handleCategorySelect(cat.value); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedCategory === cat.value ? 'ring-2 ring-offset-1' : ''
                  }`}
                style={{
                  backgroundColor: selectedCategory === cat.value
                    ? 'var(--accent-primary-bg)'
                    : 'var(--surface-card)',
                  color: selectedCategory === cat.value
                    ? 'var(--accent-primary)'
                    : 'var(--text-secondary)',
                  borderColor: 'var(--border-primary)',
                  border: '1px solid var(--border-primary)',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Comment input */}
          {showCommentInput && (
            <div className="mb-3">
              <textarea
                value={comment}
                onChange={(e) => { setComment(e.target.value); }}
                placeholder="Add additional details (optional)"
                className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                style={{
                  backgroundColor: 'var(--surface-card)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                }}
                rows={2}
                maxLength={500}
              />
              <p
                className="text-xs mt-1 text-right"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {comment.length}/500
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleCancelFeedback}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={{
                color: 'var(--text-secondary)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitNegativeFeedback}
              disabled={isSubmitting || !selectedCategory}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                backgroundColor: 'var(--btn-primary-bg)',
                color: 'var(--btn-primary-text)',
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

