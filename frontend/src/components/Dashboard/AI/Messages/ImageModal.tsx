import React, { useEffect } from 'react';
import { X, Download, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageModalProps {
  imageUrl: string;
  revisedPrompt?: string;
  onClose: () => void;
}

export function ImageModal({ imageUrl, revisedPrompt, onClose }: ImageModalProps) {
  // Add keyboard event listener for Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ai-generated-image.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="relative max-w-5xl w-full bg-white/10 dark:bg-gray-900/10 rounded-2xl overflow-hidden backdrop-blur-md"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full 
            bg-black/20 hover:bg-black/40 text-white
            transition-all duration-200 hover:scale-110"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Image container */}
        <div className="relative max-h-[85vh] overflow-hidden">
          <img
            src={imageUrl}
            alt="AI Generated"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Footer with prompt */}
        {revisedPrompt && (
          <div className="absolute bottom-0 left-0 right-0 p-6 
            bg-gradient-to-t from-black/70 via-black/50 to-transparent">
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 mt-1 text-yellow-400" />
                <p className="text-white/90 text-sm leading-relaxed">
                  {revisedPrompt}
                </p>
              </div>

              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 
                  bg-white/10 hover:bg-white/20 rounded-lg 
                  transition-all duration-200 text-white text-sm"
              >
                <Download className="w-4 h-4" />
                <span>Download Image</span>
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
} 