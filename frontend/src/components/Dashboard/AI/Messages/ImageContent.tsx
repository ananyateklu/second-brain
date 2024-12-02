import { useState } from 'react';
import { Message } from '../../../../types/message';
import { ImageGenerationLoading } from '../ImageGenerationLoading';
import { motion } from 'framer-motion';
import { ImageModal } from './ImageModal';

interface ImageContentProps {
  message: Message;
}

export function ImageContent({ message }: ImageContentProps) {
  const [showModal, setShowModal] = useState(false);
  const progress = message.progress || 0;
  const isLoading = message.isLoading || false;

  if (isLoading) {
    return <ImageGenerationLoading progress={progress} />;
  }

  // Parse the content to get image URL and prompts
  const imageData = (() => {
    if (typeof message.content === 'string') {
      try {
        const parsed = JSON.parse(message.content);
        return {
          url: parsed.data?.[0]?.url || parsed.url,
          revisedPrompt: parsed.data?.[0]?.revised_prompt
        };
      } catch {
        return { url: message.content };
      }
    }
    return null;
  })();

  if (!imageData?.url) {
    return (
      <div className="text-red-500 dark:text-red-400 p-4 bg-red-50/50 dark:bg-red-900/20 rounded-lg">
        Failed to load image: Invalid image data
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative group cursor-pointer"
        onClick={() => setShowModal(true)}
      >
        <img 
          src={imageData.url}
          alt="AI Generated"
          className="max-w-[512px] w-full rounded-lg shadow-lg 
            transition-transform duration-200 
            group-hover:scale-[1.02] group-hover:shadow-xl"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 
          transition-colors duration-200 rounded-lg" />
      </motion.div>

      {showModal && (
        <ImageModal
          imageUrl={imageData.url}
          revisedPrompt={imageData.revisedPrompt}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
} 