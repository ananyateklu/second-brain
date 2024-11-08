import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from './Logo';
import { Brain } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/30 flex items-center justify-center backdrop-blur-[2px]"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white/10 rounded-xl p-12 backdrop-blur-xl 
          border border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]
          bg-gradient-to-br from-white/30 to-white/10"
      >
        {/* Glass effect inner highlight */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/50 to-transparent opacity-10" />
        
        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center relative z-10"
        >
          {/* Logo Container */}
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut"
            }}
            className="mb-8 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
          >
            <Logo className="w-20 h-20" />
          </motion.div>

          {/* Loading Message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-white/90 font-medium text-lg tracking-wide"
          >
            {message}
          </motion.div>

          {/* Loading Indicator */}
          <div className="mt-6 flex justify-center space-x-3">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1, 0] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut"
                }}
                className="w-2 h-2 bg-white/80 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.4)]"
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}