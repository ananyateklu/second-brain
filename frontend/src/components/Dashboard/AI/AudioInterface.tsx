import React, { useState, useRef } from 'react';
import { Mic, Send, Loader, Upload, X } from 'lucide-react';
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
  const { sendMessage } = useAI();
  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (model.id === 'whisper-1') {
      if (!selectedFile) {
        setError('Please select an audio file');
        return;
      }

      // Add user message showing the file name
      onMessageSend({
        role: 'user',
        content: `Transcribe audio: ${selectedFile.name}`,
        type: 'text'
      });

      setIsLoading(true);
      setError(null);

      try {
        const response = await sendMessage(selectedFile, model.id);
        
        // Add AI response with transcription
        onMessageSend({
          role: 'assistant',
          content: response.content,
          type: 'text'
        });

        setSelectedFile(null);
      } catch (error: any) {
        setError(error.message || 'Failed to transcribe audio');
      } finally {
        setIsLoading(false);
      }
    } else if (model.id === 'tts-1') {
      if (!text.trim()) {
        setError('Please enter text to convert to speech');
        return;
      }

      const userText = text.trim();
      setText('');
      
      // Add user message
      onMessageSend({
        role: 'user',
        content: userText,
        type: 'text'
      });

      setIsLoading(true);
      setError(null);

      try {
        const response = await sendMessage(userText, model.id);
        
        // Add AI response with audio
        onMessageSend({
          role: 'assistant',
          content: response.content,
          type: 'audio'
        });
      } catch (error: any) {
        setError(error.message || 'Failed to generate speech');
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
              <span className="flex-1 truncate">{selectedFile.name}</span>
              <button
                type="button"
                onClick={clearFile}
                className="p-1 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-full"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-500 dark:hover:border-primary-400 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Select audio file to transcribe</span>
            </button>
          )}
          
          <button
            type="submit"
            disabled={isLoading || !selectedFile}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Transcribing...</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
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