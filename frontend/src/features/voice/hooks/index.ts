/**
 * Voice Hooks
 * Re-exports all voice-related hooks
 */

export { useVoiceSession, type UseVoiceSessionOptions, type UseVoiceSessionReturn } from './use-voice-session';
export { useAudioRecorder, type UseAudioRecorderOptions, type UseAudioRecorderReturn } from './use-audio-recorder';
export { useAudioPlayer, type UseAudioPlayerOptions, type UseAudioPlayerReturn } from './use-audio-player';
export { useVoiceActivity, type UseVoiceActivityOptions, type UseVoiceActivityReturn } from './use-voice-activity';
export { useVoiceStatus } from './use-voice-status';

// State management hooks extracted from VoiceAgentInterface
export { useMobileDetection, type UseMobileDetectionOptions, type UseMobileDetectionReturn } from './use-mobile-detection';
export { useVoiceSessionSelection, type UseVoiceSessionSelectionOptions, type UseVoiceSessionSelectionReturn } from './use-voice-session-selection';
export { useVoiceConnectionFeedback, type UseVoiceConnectionFeedbackOptions, type UseVoiceConnectionFeedbackReturn } from './use-voice-connection-feedback';
