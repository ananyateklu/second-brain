export const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.8 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 200, damping: 20 }
  },
  exit: { opacity: 0, scale: 0.5, transition: { duration: 0.2 } },
  hover: {
    scale: 1.05,
    transition: { type: "spring", stiffness: 400, damping: 10 }
  }
};

export const sizeClasses = {
  small: {
    padding: 'p-3',
    height: 'h-[100px]',
    iconSize: 'w-4 h-4',
    titleSize: 'text-xs',
    valueSize: 'text-sm'
  },
  medium: {
    padding: 'p-3',
    height: 'h-[100px]',
    iconSize: 'w-4 h-4',
    titleSize: 'text-xs',
    valueSize: 'text-sm'
  },
  large: {
    padding: 'p-3',
    height: 'h-[100px]',
    iconSize: 'w-4 h-4',
    titleSize: 'text-xs',
    valueSize: 'text-sm'
  }
}; 