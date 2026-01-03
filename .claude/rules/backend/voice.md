# Voice System

## Overview

WebSocket-based bidirectional audio streaming with multi-provider support.

## Providers

| Type | Provider | Notes |
|------|----------|-------|
| **STT** | Deepgram | Live streaming transcription |
| **STT** | OpenAI Whisper | Batch transcription |
| **TTS** | ElevenLabs | High quality synthesis |
| **TTS** | OpenAI TTS | Fast synthesis |
| **Realtime** | Grok | WebSocket with VAD |

## Service Structure

```text
Services/Voice/             # 36 files - Voice I/O
├── Transcription/          # Deepgram, OpenAI Whisper
├── Synthesis/              # ElevenLabs, OpenAI TTS
└── Realtime/               # Grok WebSocket
```

## Backend Components

| Component | Lines | Purpose |
|-----------|-------|---------|
| `VoiceSessionManager` | 204 | Session lifecycle management |
| `DeepgramTranscriptionService` | 549 | Live STT with WebSocket |
| `ElevenLabsSynthesisService` | 693 | TTS with voice cloning |
| `OpenAITTSSynthesisService` | 379 | Alternative TTS option |
| `GrokRealtimeClient` | - | WebSocket for Grok voice |
| `VoiceController` | - | WebSocket endpoint |

## Database Tables

**voice_sessions**
- UUIDv7 primary key
- provider, model, status
- audio_duration_ms, tokens_used
- started_at, ended_at

**voice_turns**
- Session turn records
- transcript_text, audio_url
- tool_calls_json for agent actions

## Frontend Integration

Components in `features/voice/` (18 files):

| Component | Purpose |
|-----------|---------|
| `VoiceOrb` | Interactive voice activation button |
| `VoiceControls` | Mic, mute, settings |
| `VoiceTranscript` | Real-time transcript display |
| `VoiceAgentActivityPanel` | Tool executions, thinking steps |

Key hooks:
- `use-voice-session.ts` - WebSocket session management
- `use-audio-recorder.ts` - Microphone capture with VAD
