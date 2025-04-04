import { Bot, Hash, Music } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../../../../contexts/themeContextUtils';

interface LoadingContentProps {
  type: 'text' | 'embedding' | 'audio';
  themeColor: string;
}

export function LoadingContent({ type, themeColor }: LoadingContentProps) {
  const { colors, theme } = useTheme();

  const getBackgroundClass = () => {
    if (theme === 'midnight') {
      return 'bg-gradient-to-r from-gray-900 to-gray-800 dark:from-gray-900 dark:to-gray-800';
    }
    return colors.gradientBackground;
  };

  const renderLoadingContent = () => {
    switch (type) {
      case 'text':
        return (
          <div className="space-y-1">
            {/* Animated typing dots */}
            <div className="flex items-center gap-1">
              <Bot className="w-3 h-3" style={{ color: themeColor }} />
              <motion.div
                className="flex gap-1 w-28"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
              >
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 h-1 rounded-full"
                    style={{ backgroundColor: themeColor }}
                  />
                ))}
              </motion.div>
            </div>

            {/* Animated placeholder lines */}
            <div className={`space-y-1 p-2 rounded-lg ${getBackgroundClass()}`}>
              {[...Array(2)].map((_, i) => (
                <motion.div
                  key={i}
                  className="h-1 rounded"
                  style={{
                    backgroundColor: theme === 'midnight' ? '#4B5563' : themeColor,
                    opacity: theme === 'midnight' ? 0.8 : 0.4
                  }}
                  initial={{ width: "0%" }}
                  animate={{ width: ["0%", "100%", "100%", "0%"] }}
                  transition={{
                    duration: 2,
                    times: [0, 0.4, 0.6, 1],
                    repeat: Infinity,
                    delay: i * 0.3
                  }}
                />
              ))}
            </div>
          </div>
        );

      case 'embedding':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Hash className="w-3 h-3" style={{ color: themeColor }} />
              <span className="text-xs">Generating embedding vectors...</span>
            </div>

            {/* Animated vector visualization */}
            <motion.div
              className={`h-16 flex items-end gap-px p-2 rounded-lg ${getBackgroundClass()}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {[...Array(50)].map((_, i) => (
                <motion.div
                  key={i}
                  className="flex-1"
                  style={{
                    backgroundColor: themeColor,
                    opacity: 0.5
                  }}
                  initial={{ height: "0%" }}
                  animate={{
                    height: ["0%", "100%", "50%", "80%", "20%"],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.02
                  }}
                />
              ))}
            </motion.div>
          </div>
        );

      case 'audio':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Music className="w-3 h-3" style={{ color: themeColor }} />
              <span className="text-xs">Generating audio...</span>
            </div>

            {/* Animated waveform */}
            <div className={`h-8 flex items-center gap-1 p-2 rounded-lg ${getBackgroundClass()}`}>
              {[...Array(30)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 rounded-full"
                  style={{ backgroundColor: themeColor }}
                  initial={{ height: "20%" }}
                  animate={{
                    height: ["20%", "90%", "20%"]
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.05
                  }}
                />
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="p-0">
      {renderLoadingContent()}
    </div>
  );
} 