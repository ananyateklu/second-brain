import { useState } from 'react';
import { Mic, Loader } from 'lucide-react';
import { useRecording } from '../../contexts/RecordingContext';

interface RecordButtonProps {
  onTranscription: (text: string) => void;
  className?: string;
  disabled?: boolean;
}

export function RecordButton({ onTranscription, className = '', disabled = false }: RecordButtonProps) {
  const { isRecording, startRecording, stopRecording } = useRecording();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClick = async () => {
    try {
      if (isRecording) {
        setIsProcessing(true);
        const transcription = await stopRecording();
        onTranscription(transcription);
      } else {
        onTranscription('');
        await startRecording();
      }
    } catch (error) {
      console.error('Recording error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isProcessing}
      className={`p-2 rounded-full transition-all duration-200
        ${isRecording 
          ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
        }
        ${className}
        disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {isProcessing ? (
        <Loader className="w-4 h-4 animate-spin" />
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </button>
  );
} 