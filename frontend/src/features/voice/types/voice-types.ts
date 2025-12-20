// Voice session state
export type VoiceSessionState = 'Idle' | 'Listening' | 'Processing' | 'Speaking' | 'Interrupted' | 'Ended';

export const VoiceSessionState = {
  Idle: 'Idle' as VoiceSessionState,
  Listening: 'Listening' as VoiceSessionState,
  Processing: 'Processing' as VoiceSessionState,
  Speaking: 'Speaking' as VoiceSessionState,
  Interrupted: 'Interrupted' as VoiceSessionState,
  Ended: 'Ended' as VoiceSessionState,
} as const;

// Voice provider type (must match backend enum values: Standard, GrokVoice)
export type VoiceProviderType = 'Standard' | 'GrokVoice';

export const VoiceProviderType = {
  Standard: 'Standard' as VoiceProviderType,
  GrokVoice: 'GrokVoice' as VoiceProviderType,
} as const;

// Voice session
export interface VoiceSession {
  id: string;
  userId: string;
  conversationId?: string;
  state: VoiceSessionState;
  provider: string;
  model: string;
  voiceId: string;
  startedAt: string;
  endedAt?: string;
  lastActivityAt: string;
  turns: VoiceTurn[];
  options: VoiceSessionOptions;
}

// Voice turn in conversation
export interface VoiceTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  durationSeconds?: number;
  confidence?: number;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

// Options for creating a voice session
export interface VoiceSessionOptions {
  provider: string;
  model: string;
  voiceId: string;
  systemPrompt?: string;
  enableRag?: boolean;
  temperature?: number;
  maxTokens?: number;
  language?: string;
  // Agent mode options
  agentEnabled?: boolean;
  capabilities?: string[];
  enableAgentRag?: boolean;
  // Voice provider type
  voiceProviderType?: VoiceProviderType;
  // Grok Voice options
  grokVoice?: string;
  enableGrokWebSearch?: boolean;
  enableGrokXSearch?: boolean;
}

// Result from creating a session
export interface CreateVoiceSessionResult {
  sessionId: string;
  webSocketUrl: string;
  state: VoiceSessionState;
  createdAt: string;
}

// Available voice info
export interface VoiceInfo {
  voiceId: string;
  name: string;
  description?: string;
  previewUrl?: string;
  category?: string;
  labels?: Record<string, string>;
}

// Voice service status
export interface VoiceServiceStatus {
  deepgramAvailable: boolean;
  elevenLabsAvailable: boolean;
  voiceAgentEnabled: boolean;
  deepgramError?: string;
  elevenLabsError?: string;
  // Grok Voice status
  grokVoiceAvailable?: boolean;
  grokVoiceError?: string;
}

// Grok Voice info
export interface GrokVoiceInfo {
  voiceId: string;
  name: string;
  description?: string;
  category?: string;
}

// ============================================================================
// WebSocket Message Types
// ============================================================================

// Client -> Server messages
export interface AudioChunkMessage {
  type: 'audio';
  payload: {
    data: string; // base64 encoded audio
    timestamp: number;
    isFinal: boolean;
  };
}

export interface ControlMessage {
  type: 'control';
  payload: {
    action: 'start' | 'stop' | 'interrupt' | 'mute' | 'unmute' | 'ping';
  };
}

export interface ConfigMessage {
  type: 'config';
  payload: {
    options: Partial<VoiceSessionOptions>;
  };
}

export type ClientVoiceMessage = AudioChunkMessage | ControlMessage | ConfigMessage;

// Server -> Client messages
export interface TranscriptMessage {
  type: 'transcript';
  timestamp: number;
  text: string;
  isFinal: boolean;
  confidence: number;
  start?: number;
  end?: number;
  speaker?: number;
}

export interface AudioMessage {
  type: 'audio';
  timestamp: number;
  data: string; // base64 encoded audio
  format: string;
  sampleRate: number;
  isFinal: boolean;
  sequence: number;
}

export interface StateMessage {
  type: 'state';
  timestamp: number;
  state: VoiceSessionState;
  reason?: string;
  turnId?: string;
}

export interface ErrorMessage {
  type: 'error';
  timestamp: number;
  code: string;
  message: string;
  recoverable: boolean;
  details?: Record<string, unknown>;
}

export interface MetadataMessage {
  type: 'metadata';
  timestamp: number;
  event: string;
  data?: Record<string, unknown>;
}

export interface PongMessage {
  type: 'pong';
  timestamp: number;
}

export type ServerVoiceMessage =
  | TranscriptMessage
  | AudioMessage
  | StateMessage
  | ErrorMessage
  | MetadataMessage
  | PongMessage;

// Error codes
export const VoiceErrorCodes = {
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  TRANSCRIPTION_FAILED: 'TRANSCRIPTION_FAILED',
  SYNTHESIS_FAILED: 'SYNTHESIS_FAILED',
  AI_PROVIDER_FAILED: 'AI_PROVIDER_FAILED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  INVALID_MESSAGE: 'INVALID_MESSAGE',
  UNAUTHORIZED: 'UNAUTHORIZED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

// Metadata events
export const MetadataEvents = {
  SESSION_STARTED: 'session_started',
  TURN_STARTED: 'turn_started',
  TURN_COMPLETED: 'turn_completed',
  TOKEN_USAGE: 'token_usage',
  AI_RESPONSE_START: 'ai_response_start',
  AI_RESPONSE_CHUNK: 'ai_response_chunk',
  AI_RESPONSE_END: 'ai_response_end',
  // Agent-specific events
  TOOL_CALL_START: 'tool_call_start',
  TOOL_CALL_END: 'tool_call_end',
  THINKING_STEP: 'thinking_step',
  CONTEXT_RETRIEVAL: 'context_retrieval',
  AGENT_STATUS: 'agent_status',
  GROUNDING_SOURCES: 'grounding_sources',
} as const;

// ============================================================================
// Audio Types
// ============================================================================

export interface AudioRecorderOptions {
  sampleRate?: number;
  channelCount?: number;
  mimeType?: string;
}

export interface AudioPlayerOptions {
  sampleRate?: number;
  channelCount?: number;
}

// Voice activity detection callback
export interface VADCallbacks {
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onSilence?: (durationMs: number) => void;
}

// ============================================================================
// Agent Types for Voice
// ============================================================================

// Tool execution tracking
export interface VoiceToolExecution {
  toolId: string;
  toolName: string;
  arguments?: string;
  result?: string;
  status: 'executing' | 'completed' | 'failed';
  timestamp: number;
}

// Thinking step tracking
export interface VoiceThinkingStep {
  content: string;
  timestamp: number;
}

// Retrieved note from RAG context
export interface VoiceRetrievedNote {
  noteId: string;
  title: string;
  preview: string;
  tags: string[];
  relevanceScore: number;
}

// Grounding source (from Gemini/Grok web search)
export interface VoiceGroundingSource {
  title: string;
  uri?: string;
  url?: string;
  snippet?: string;
}

// Agent capability info
export interface VoiceAgentCapability {
  id: string;
  name: string;
  description: string;
}
