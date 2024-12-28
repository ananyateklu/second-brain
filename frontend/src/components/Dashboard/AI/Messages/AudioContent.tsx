import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Message } from '../../../../types/message';
import { Loader, Play, Pause, Volume2, VolumeX, Download, RotateCcw } from 'lucide-react';
import { MessageHeader } from './MessageHeader';

interface AudioContentProps {
  message: Message;
}

export function AudioContent({ message }: AudioContentProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isVolumeHovered, setIsVolumeHovered] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Create audio URL from message content
  const audioUrl = useMemo(() => {
    if (!message.content) return '';

    // Handle user-uploaded files
    if (message.content instanceof File) {
      return URL.createObjectURL(message.content);
    }

    // Handle AI-generated audio (Blob or string URL)
    if (message.content instanceof Blob) {
      return URL.createObjectURL(message.content);
    }

    if (typeof message.content === 'string') {
      return message.content;
    }

    return '';
  }, [message.content]);

  // Cleanup URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleReset = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleDownload = async () => {
    if (!audioUrl) return;

    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audio-${message.id || Date.now()}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading audio:', error);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (volume > 0) {
        setPreviousVolume(volume);
        setVolume(0);
        audioRef.current.volume = 0;
      } else {
        setVolume(previousVolume);
        audioRef.current.volume = previousVolume;
      }
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (message.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Loader className="w-4 h-4 animate-spin" />
        <span>Processing audio...</span>
      </div>
    );
  }

  if (!audioUrl) {
    return (
      <div className="text-red-500 dark:text-red-400">
        Invalid audio content
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-2">
      {/* Add MessageHeader */}
      <MessageHeader message={message} isUser={false} />

      {/* Audio Player */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      >
        <track kind="captions" />
      </audio>

      <div className="backdrop-blur-md bg-white/30 dark:bg-gray-800/30 rounded-2xl 
        shadow-lg border border-white/20 dark:border-gray-700/30
        transition-all duration-300 hover:shadow-xl
        hover:border-white/30 dark:hover:border-gray-600/40"
      >
        {/* Waveform visualization placeholder */}
        <div className="px-6 pt-6 pb-2">
          <div className="h-12 flex items-center justify-center gap-0.5">
            {[...Array(40)].map((_, i) => (
              <div
                key={`${message.id || 'temp'}-wave-${i}`}
                className="w-1 bg-primary-500/30 dark:bg-primary-400/30 rounded-full"
                style={{
                  height: `${Math.random() * 100}%`,
                  opacity: currentTime / duration > i / 40 ? 1 : 0.3,
                }}
              />
            ))}
          </div>
        </div>

        {/* Main controls */}
        <div className="px-6 pb-4 flex items-center gap-4">
          <button
            onClick={handlePlayPause}
            className="w-12 h-12 flex items-center justify-center rounded-full
              bg-gradient-to-br from-primary-500 to-primary-600
              hover:from-primary-400 hover:to-primary-500
              text-white shadow-lg
              transform transition-all duration-200
              hover:scale-105 active:scale-95
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
              dark:focus:ring-offset-gray-800"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-1" />
            )}
          </button>

          <div className="flex-1 space-y-1">
            {/* Time slider */}
            <div className="relative">
              <input
                type="range"
                min={0}
                max={duration}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                  bg-gray-200 dark:bg-gray-700
                  accent-primary-500
                  hover:accent-primary-400
                  transition-all duration-200"
                style={{
                  background: `linear-gradient(to right, 
                    var(--color-primary-500) 0%, 
                    var(--color-primary-500) ${(currentTime / duration) * 100}%, 
                    var(--color-gray-200) ${(currentTime / duration) * 100}%, 
                    var(--color-gray-200) 100%)`
                }}
              />
            </div>

            {/* Time display */}
            <div className="flex justify-between text-xs font-medium
              text-gray-600 dark:text-gray-300">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        {/* Additional controls */}
        <div className="px-6 py-3 flex items-center gap-4
          border-t border-gray-200/30 dark:border-gray-700/30">
          <div
            className="relative flex items-center gap-2"
            onMouseEnter={() => setIsVolumeHovered(true)}
            onMouseLeave={() => setIsVolumeHovered(false)}
          >
            <button
              onClick={toggleMute}
              className="p-1.5 rounded-full
                hover:bg-gray-100 dark:hover:bg-gray-700
                text-gray-600 dark:text-gray-300
                transition-colors duration-200"
            >
              {volume === 0 ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            <div className={`
              flex items-center
              transition-all duration-200
              ${isVolumeHovered ? 'w-24 opacity-100' : 'w-0 opacity-0'}
            `}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={handleVolumeChange}
                className="h-1 rounded-full appearance-none cursor-pointer
                  bg-gray-200 dark:bg-gray-700
                  accent-primary-500
                  hover:accent-primary-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleReset}
              className="p-1.5 rounded-full
                hover:bg-gray-100 dark:hover:bg-gray-700
                text-gray-600 dark:text-gray-300
                transition-colors duration-200"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-full
                hover:bg-gray-100 dark:hover:bg-gray-700
                text-gray-600 dark:text-gray-300
                transition-colors duration-200"
              title="Download audio"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Show input text if available */}
      {message.inputText && (
        <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
          <span className="font-medium text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Text:
          </span>
          <p className="mt-1">{message.inputText}</p>
        </div>
      )}
    </div>
  );
}