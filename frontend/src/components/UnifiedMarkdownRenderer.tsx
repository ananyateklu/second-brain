import { useBoundStore } from '../store/bound-store';
import { MarkdownMessage } from './MarkdownMessage';
import { LlmUiMessage } from './LlmUiMessage';

interface UnifiedMarkdownRendererProps {
  content: string;
  showCursor?: boolean;
  isStreaming?: boolean;
}

/**
 * Unified markdown renderer that switches between custom (react-markdown)
 * and llm-ui renderers based on user preference.
 */
export function UnifiedMarkdownRenderer({
  content,
  showCursor = false,
  isStreaming = false,
}: UnifiedMarkdownRendererProps) {
  const markdownRenderer = useBoundStore((state) => state.markdownRenderer);

  if (markdownRenderer === 'llm-ui') {
    return (
      <LlmUiMessage
        content={content}
        showCursor={showCursor}
        isStreaming={isStreaming}
      />
    );
  }

  // Default: custom renderer (react-markdown based)
  return <MarkdownMessage content={content} showCursor={showCursor} />;
}
