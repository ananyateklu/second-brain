/**
 * Voice Components
 * Re-exports all voice-related components
 */

// Main interface
export { VoiceAgentInterface } from './VoiceAgentInterface';

// New waveform-based UI components (Phase 2)
export { VoiceWaveform, VoiceWaveformPulse } from './VoiceWaveform';
export { VoiceInputBar } from './VoiceInputBar';
export { VoiceToolChip, VoiceToolChipsContainer } from './VoiceToolChip';
export { VoiceMessageBubble, VoiceTypingIndicator, VoiceLiveTranscriptionIndicator } from './VoiceMessageBubble';
export { VoiceProcessTimeline } from './VoiceProcessTimeline';

// Transcript and settings
export { VoiceTranscript } from './VoiceTranscript';
export type { TranscriptEntry } from './VoiceTranscript';
export { VoiceSettings } from './VoiceSettings';

// Sidebar components
export { VoiceSidebar } from './VoiceSidebar';
export { VoiceSessionItem } from './VoiceSessionItem';

// Header controls
export { VoiceTypePill } from './VoiceTypePill';
export { VoiceDropdown } from './VoiceDropdown';
export { VoiceAgentSettingsPopover } from './VoiceAgentSettingsPopover';
export { VoiceConfigurationBanner } from './VoiceConfigurationBanner';

// Utility
export { VoiceAgentSkeleton } from './VoiceAgentSkeleton';

// DEPRECATED - Replaced by new components in Phase 2
// VoiceOrb → VoiceWaveform
// VoiceControls → VoiceInputBar
// VoiceStatusIndicator → VoiceWaveform (state colors)
// VoiceToolIndicator → VoiceToolChip
// VoiceAgentActivityPanel → VoiceProcessTimeline
