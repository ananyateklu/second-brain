import type { AudioRecorderOptions, AudioPlayerOptions, VADCallbacks } from '../features/voice/types/voice-types';

// ============================================================================
// Microphone Access
// ============================================================================

/**
 * Request access to the user's microphone
 * @param sampleRate - Sample rate for audio capture (default: 16000, Grok Voice uses 24000)
 */
export async function requestMicrophoneAccess(sampleRate = 16000): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    return stream;
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError') {
        throw new Error('Microphone permission denied. Please allow microphone access.');
      } else if (error.name === 'NotFoundError') {
        throw new Error('No microphone found. Please connect a microphone.');
      }
    }
    throw new Error('Failed to access microphone: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

// ============================================================================
// Audio Recorder using AudioWorklet
// ============================================================================

export class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private onDataCallback: ((data: Float32Array) => void) | null = null;
  private isRecording = false;
  private options: Required<AudioRecorderOptions>;

  constructor(options: AudioRecorderOptions = {}) {
    this.options = {
      sampleRate: options.sampleRate ?? 16000,
      channelCount: options.channelCount ?? 1,
      mimeType: options.mimeType ?? 'audio/webm',
    };
  }

  async start(stream: MediaStream): Promise<void> {
    if (this.isRecording) {
      return;
    }

    this.stream = stream;
    this.audioContext = new AudioContext({
      sampleRate: this.options.sampleRate,
    });

    this.sourceNode = this.audioContext.createMediaStreamSource(stream);

    // Try to use AudioWorklet (modern, non-deprecated approach)
    if (this.audioContext.audioWorklet) {
      try {
        await this.audioContext.audioWorklet.addModule(
          new URL('../workers/audio-processor.worklet.ts', import.meta.url)
        );

        this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-processor');
        this.workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
          if (this.isRecording && this.onDataCallback) {
            const dataCopy = new Float32Array(event.data);
            this.onDataCallback(dataCopy);
          }
        };

        this.sourceNode.connect(this.workletNode);
        this.workletNode.connect(this.audioContext.destination);
        this.isRecording = true;
        return;
      } catch (e) {
        console.warn('AudioWorklet not available, falling back to ScriptProcessor', e);
      }
    }

    // Fallback to ScriptProcessorNode for older browsers
    // Note: ScriptProcessorNode is deprecated but still works in all browsers
    try {
      const bufferSize = 4096;
      const scriptProcessor = this.audioContext.createScriptProcessor(
        bufferSize,
        this.options.channelCount,
        this.options.channelCount
      );

      scriptProcessor.onaudioprocess = (event) => {
        if (this.isRecording && this.onDataCallback) {
          const inputData = event.inputBuffer.getChannelData(0);
          // Clone the data since it gets reused
          const dataCopy = new Float32Array(inputData);
          this.onDataCallback(dataCopy);
        }
      };

      this.sourceNode.connect(scriptProcessor);
      scriptProcessor.connect(this.audioContext.destination);

      // Store reference for cleanup (cast to any to avoid type issues)
      (this as unknown as Record<string, AudioNode>).scriptProcessor = scriptProcessor;
      this.isRecording = true;
    } catch (error) {
      console.error('Error starting audio recorder:', error);
      throw error;
    }
  }

  stop(): void {
    this.isRecording = false;

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    // Disconnect script processor if used
    const scriptProcessor = (this as unknown as Record<string, AudioNode>).scriptProcessor;
    if (scriptProcessor) {
      scriptProcessor.disconnect();
      (this as unknown as Record<string, AudioNode | undefined>).scriptProcessor = undefined;
    }

    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  pause(): void {
    this.isRecording = false;
  }

  resume(): void {
    this.isRecording = true;
  }

  onData(callback: (data: Float32Array) => void): void {
    this.onDataCallback = callback;
  }

  get recording(): boolean {
    return this.isRecording;
  }
}

/**
 * Convert Float32Array audio samples to Int16Array PCM
 */
export function float32ToInt16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16Array;
}

/**
 * Convert Int16Array PCM to ArrayBuffer
 */
export function int16ToArrayBuffer(int16Array: Int16Array): ArrayBuffer {
  // Create a new ArrayBuffer and copy the data to ensure it's not a SharedArrayBuffer
  const buffer = new ArrayBuffer(int16Array.byteLength);
  new Int16Array(buffer).set(int16Array);
  return buffer;
}

// ============================================================================
// Audio Player using Web Audio API
// ============================================================================

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private audioQueue: Array<{ data: ArrayBuffer; sampleRate: number }> = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private onEndedCallback: (() => void) | null = null;
  private options: Required<AudioPlayerOptions>;

  constructor(options: AudioPlayerOptions = {}) {
    this.options = {
      sampleRate: options.sampleRate ?? 16000,
      channelCount: options.channelCount ?? 1,
    };
  }

  async init(): Promise<void> {
    if (!this.audioContext) {
      // Use default sample rate (usually 44100 or 48000) for better resampling
      this.audioContext = new AudioContext();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Add audio data to the playback queue
   * @param audioData Raw PCM audio data
   * @param sampleRate Sample rate of the audio data (default: from options)
   */
  queueAudio(audioData: ArrayBuffer, sampleRate?: number): void {
    this.audioQueue.push({
      data: audioData,
      sampleRate: sampleRate ?? this.options.sampleRate,
    });

    if (!this.isPlaying) {
      void this.playNext();
    }
  }

  private async playNext(): Promise<void> {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      this.onEndedCallback?.();
      return;
    }

    if (!this.audioContext) {
      await this.init();
    }

    this.isPlaying = true;
    const queueItem = this.audioQueue.shift();
    if (!queueItem) {
      this.isPlaying = false;
      return;
    }
    const { data: audioData, sampleRate } = queueItem;

    try {
      // Convert PCM int16 to float32 for Web Audio API
      const int16Data = new Int16Array(audioData);
      const float32Data = new Float32Array(int16Data.length);

      for (let i = 0; i < int16Data.length; i++) {
        float32Data[i] = int16Data[i] / 32768.0;
      }

      // AudioContext is guaranteed to exist after init() call above
      const ctx = this.audioContext;
      if (!ctx) {
        void this.playNext();
        return;
      }

      // Create buffer with the source sample rate - browser will resample automatically
      const audioBuffer = ctx.createBuffer(
        this.options.channelCount,
        float32Data.length,
        sampleRate
      );

      audioBuffer.getChannelData(0).set(float32Data);

      this.currentSource = ctx.createBufferSource();
      this.currentSource.buffer = audioBuffer;
      this.currentSource.connect(ctx.destination);

      this.currentSource.onended = () => {
        this.currentSource = null;
        void this.playNext();
      };

      this.currentSource.start();
    } catch (error) {
      console.error('Error playing audio:', error);
      void this.playNext(); // Try next chunk
    }
  }

  stop(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        // Ignore if already stopped
      }
      this.currentSource = null;
    }

    this.audioQueue = [];
    this.isPlaying = false;
  }

  get playing(): boolean {
    return this.isPlaying;
  }

  onEnded(callback: () => void): void {
    this.onEndedCallback = callback;
  }

  async close(): Promise<void> {
    this.stop();
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// ============================================================================
// Voice Activity Detection (Simple Energy-based)
// ============================================================================

export class VoiceActivityDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private rafId: number | null = null;
  private callbacks: VADCallbacks;
  private isSpeaking = false;
  private silenceStart: number | null = null;
  private silenceThresholdMs: number;
  private energyThreshold: number;

  constructor(callbacks: VADCallbacks, silenceThresholdMs = 1500, energyThreshold = 0.01) {
    this.callbacks = callbacks;
    this.silenceThresholdMs = silenceThresholdMs;
    this.energyThreshold = energyThreshold;
  }

  start(stream: MediaStream): void {
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.3;

    this.sourceNode = this.audioContext.createMediaStreamSource(stream);
    this.sourceNode.connect(this.analyser);

    this.detect();
  }

  stop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
  }

  private detect(): void {
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    // Calculate average energy
    const energy = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length / 255;

    if (energy > this.energyThreshold) {
      // Speech detected
      if (!this.isSpeaking) {
        this.isSpeaking = true;
        this.silenceStart = null;
        this.callbacks.onSpeechStart?.();
      }
    } else {
      // Silence detected
      if (this.isSpeaking) {
        if (!this.silenceStart) {
          this.silenceStart = Date.now();
        } else {
          const silenceDuration = Date.now() - this.silenceStart;
          this.callbacks.onSilence?.(silenceDuration);

          if (silenceDuration >= this.silenceThresholdMs) {
            this.isSpeaking = false;
            this.silenceStart = null;
            this.callbacks.onSpeechEnd?.();
          }
        }
      }
    }

    // Only schedule next frame if we're still active (analyser not null)
    // This prevents RAF from being scheduled after stop() is called
    if (this.analyser) {
      this.rafId = requestAnimationFrame(() => this.detect());
    }
  }
}

// ============================================================================
// Audio Visualization Utilities
// ============================================================================

export function getAudioLevel(analyser: AnalyserNode): number {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);
  return dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length / 255;
}

export function createAnalyser(stream: MediaStream): { audioContext: AudioContext; analyser: AnalyserNode } {
  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.8;

  const sourceNode = audioContext.createMediaStreamSource(stream);
  sourceNode.connect(analyser);

  return { audioContext, analyser };
}
