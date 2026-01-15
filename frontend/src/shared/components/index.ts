/**
 * Shared Components
 *
 * Components that are used by multiple features to avoid circular dependencies.
 * These components have been extracted from their original feature locations
 * to break dependency cycles between features.
 */

// Note reference component (previously in chat, used by agents)
export { InlineNoteReference } from './InlineNoteReference';

// Timeline components (previously in agents, used by chat)
export { TimelineItem, TIMELINE } from './TimelineItem';
export { TimelineStatusIcon } from './TimelineStatusIcon';

// Selection components (used by chat and voice)
export { CircularCheckbox } from './CircularCheckbox';
