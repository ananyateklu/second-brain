import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAI } from './AIContext';

interface RecordingContextType {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string>;
  error: string | null;
}

const RecordingContext = createContext<RecordingContextType | null>(null);

export function RecordingProvider({ children }: { children: React.ReactNode }) {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { transcribeAudio } = useAI();

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 44100,
        } 
      });
      
      // Use webm format which is widely supported
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(chunks => [...chunks, event.data]);
        }
      };

      recorder.start(100); // Collect data every 100ms
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      setError('Failed to start recording. Please check your microphone permissions.');
      console.error('Recording error:', err);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorder) {
        reject('No recording in progress');
        return;
      }

      mediaRecorder.onstop = async () => {
        try {
          // Create audio blob in webm format
          const audioBlob = new Blob(audioChunks, { 
            type: 'audio/webm;codecs=opus' 
          });
          
          // Convert to mp3 file for OpenAI API
          const file = new File([audioBlob], 'recording.webm', { 
            type: 'audio/webm',
            lastModified: Date.now()
          });

          // Transcribe the audio
          const response = await transcribeAudio(file);
          
          // Clean up
          setAudioChunks([]);
          mediaRecorder.stream.getTracks().forEach(track => track.stop());
          setMediaRecorder(null);
          setIsRecording(false);

          resolve(response.content as string);
        } catch (err) {
          setError('Failed to transcribe audio.');
          reject(err);
        }
      };

      mediaRecorder.stop();
    });
  }, [mediaRecorder, audioChunks, transcribeAudio]);

  return (
    <RecordingContext.Provider value={{
      isRecording,
      startRecording,
      stopRecording,
      error
    }}>
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecording() {
  const context = useContext(RecordingContext);
  if (!context) {
    throw new Error('useRecording must be used within a RecordingProvider');
  }
  return context;
} 