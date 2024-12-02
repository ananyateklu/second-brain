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
    colSpan: 'col-span-1',
    fontSize: 'text-xs',
    iconSize: 'w-3.5 h-3.5',
    padding: 'p-2.5',
    titleSize: 'text-xs',
    valueSize: 'text-sm'
  },
  medium: {
    colSpan: 'col-span-2',
    fontSize: 'text-sm',
    iconSize: 'w-4 h-4',
    padding: 'p-2.5',
    titleSize: 'text-xs',
    valueSize: 'text-sm'
  },
  large: {
    colSpan: 'col-span-3',
    fontSize: 'text-base',
    iconSize: 'w-5 h-5',
    padding: 'p-2.5',
    titleSize: 'text-xs',
    valueSize: 'text-sm'
  }
}; 