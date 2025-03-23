export const cardVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.8,
    rotateX: 10
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
      mass: 0.8,
      delay: 0.1
    }
  },
  exit: {
    opacity: 0,
    scale: 0.5,
    y: -10,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  },
  hover: {
    scale: 1.03,
    y: -4,
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10,
      mass: 0.6
    }
  },
  tap: {
    scale: 0.97,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 15
    }
  }
};

// Add staggered animation for multiple elements
export const staggerContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.1
    }
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1
    }
  }
};

// Add pulse animation for values that change
export const pulseAnimation = {
  pulse: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    color: ["var(--color-text)", "var(--color-accent)", "var(--color-text)"],
    transition: {
      duration: 0.6,
      ease: "easeInOut",
      times: [0, 0.5, 1]
    }
  }
};

// Add sparkle animation for special stats
export const sparkleVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: 1,
    opacity: [0, 1, 0],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      repeatDelay: 3
    }
  }
};

export const sizeClasses = {
  small: {
    padding: 'p-3',
    height: 'h-[100px]',
    iconSize: 'w-3.5 h-3.5',
    titleSize: 'text-xs',
    valueSize: 'text-sm font-semibold',
    chartHeight: 'h-8'
  },
  medium: {
    padding: 'p-3',
    height: 'h-[100px]',
    iconSize: 'w-3.5 h-3.5',
    titleSize: 'text-xs',
    valueSize: 'text-sm font-semibold',
    chartHeight: 'h-12'
  },
  large: {
    padding: 'p-3',
    height: 'h-[100px]',
    iconSize: 'w-3.5 h-3.5',
    titleSize: 'text-xs',
    valueSize: 'text-sm font-semibold',
    chartHeight: 'h-16'
  }
}; 