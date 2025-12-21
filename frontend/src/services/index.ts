/**
 * Services Index
 * Re-exports all services for convenient importing
 */

export { authService } from './auth.service';
export { notesService, type GetNotesPagedParams } from './notes.service';
export { chatService, type GetConversationsPagedParams } from './chat.service';
export { aiService } from './ai.service';
export { ragService } from './rag.service';
export { statsService } from './stats.service';
export { agentService } from './agent.service';
export { userPreferencesService, DEFAULT_PREFERENCES } from './user-preferences.service';
export { gitService } from './git.service';

// Voice services
export { voiceService, VoiceWebSocketConnection, type VoiceWebSocketCallbacks } from './voice.service';
export {
  requestMicrophoneAccess,
  AudioRecorder,
  AudioPlayer,
  VoiceActivityDetector,
  getAudioLevel,
  createAnalyser,
  float32ToInt16,
  int16ToArrayBuffer,
} from './voice-audio.service';
