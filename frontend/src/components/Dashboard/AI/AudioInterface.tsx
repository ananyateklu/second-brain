import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, Loader, Upload, X, MicOff } from 'lucide-react';
import { useAI } from '../../../contexts/AIContext';
import { AIModel } from '../../../types/ai';

interface AudioInterfaceProps {
  model: AIModel;
  onMessageSend: (message: { role: 'user' | 'assistant'; content: string; type: 'text' | 'image' | 'audio' }) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export function AudioInterface({
  model,
  onMessageSend,
  isLoading,
  setIsLoading,
  setError
}: AudioInterfaceProps) {
  const { transcribeAudio } = useAI();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timer | null>(null);
  const startTimeRef = useRef<number>(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (model.id === 'whisper-1') {
      if (!selectedFile || isLoading) return;

      const userMessageId = `user-${Date.now()}`;
      const assistantMessageId = `assistant-${Date.now()}`;

      try {
        setIsLoading(true);
        setError(null);

        // Send user message with audio file
        onMessageSend({
          id: userMessageId,
          role: 'user',
          content: selectedFile,
          type: 'audio',
          timestamp: new Date().toISOString(),
          model: model
        });

        // Send initial loading message
        onMessageSend({
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          type: 'text',
          timestamp: new Date().toISOString(),
          model: model,
          isLoading: true
        });

        // Perform transcription
        const response = await transcribeAudio(selectedFile);

        // Update assistant message with result
        onMessageSend({
          id: assistantMessageId,
          role: 'assistant',
          content: response.content,
          type: 'text',
          timestamp: new Date().toISOString(),
          model: model,
          isLoading: false
        });

        // Clear file input
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Error transcribing audio:', error);
        setError(error instanceof Error ? error.message : 'Failed to transcribe audio');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setRecordingDuration(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 44100,
        } 
      });
      
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      // Reset state
      audioChunksRef.current = [];
      setRecordingDuration(0);
      startTimeRef.current = Date.now();

      // Clear any existing timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      // Start new timer
      timerIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingDuration(elapsed);
      }, 1000);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        // Clear timer
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }

        const finalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: 'audio/webm;codecs=opus'
        });

        const audioFile = new File(
          [audioBlob], 
          `recording-${finalDuration}s.webm`,
          { 
            type: 'audio/webm;codecs=opus',
            lastModified: Date.now()
          }
        );

        setSelectedFile(audioFile);
        setRecordingDuration(finalDuration);
      };

      recorder.start(100);
      setMediaRecorder(recorder);
      setIsRecording(true);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      setError('Unable to access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      
      // Stop all audio tracks
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      
      // Clear timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (mediaRecorder) {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaRecorder]);

  // Update the recording button to show duration
  const renderRecordButton = () => (
    <button
      type="button"
      onClick={toggleRecording}
      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg
        transition-all duration-200 ease-in-out
        ${isRecording 
          ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
          : 'bg-primary-500 hover:bg-primary-600 text-white'}`}
    >
      {isRecording ? (
        <>
          <MicOff className="w-5 h-5" />
          <span>Stop</span>
        </>
      ) : (
        <>
          <Mic className="w-5 h-5" />
          <span>Record</span>
        </>
      )}
    </button>
  );

  if (model.id === 'whisper-1') {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {selectedFile ? (
            <div className="flex-1 flex items-center gap-2 px-4 py-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg">
              <Mic className="w-4 h-4 text-gray-400" />
              <span className="flex-1 truncate">
                {selectedFile.name}
                {recordingDuration > 0 && ` (${formatDuration(recordingDuration)})`}
              </span>
              <button
                type="button"
                onClick={clearFile}
                className="p-1 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-full"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 
                  border-2 border-dashed border-gray-300 dark:border-gray-600 
                  rounded-lg hover:border-primary-500 dark:hover:border-primary-400 
                  transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Select audio file to transcribe</span>
              </button>

              {renderRecordButton()}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !selectedFile}
            className="flex items-center gap-2 px-4 py-2 
              bg-primary-600 hover:bg-primary-700 text-white rounded-lg 
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Transcribing...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Transcribe</span>
              </>
            )}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text to convert to speech..."
        disabled={isLoading}
        className="flex-1 px-4 py-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <button
        type="submit"
        disabled={isLoading || !text.trim()}
        className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            <span>Generating...</span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            <span>Generate Speech</span>
          </>
        )}
      </button>
    </form>
  );
}

// Update the format duration function to be more robust
function formatDuration(seconds: number | null | undefined): string {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
    return '0:00';
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}