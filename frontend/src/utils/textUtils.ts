export const textStyles = {
  // Headers
  h1: 'text-2xl font-bold text-gray-900 dark:text-gray-100',
  h2: 'text-xl font-semibold text-gray-800 dark:text-gray-200',
  h3: 'text-lg font-medium text-gray-800 dark:text-gray-200',
  
  // Body text
  body: 'text-base text-gray-700 dark:text-gray-300',
  bodyLarge: 'text-lg text-gray-700 dark:text-gray-300',
  bodySmall: 'text-sm text-gray-700 dark:text-gray-300',
  
  // Supporting text
  muted: 'text-sm text-gray-500 dark:text-gray-500',
  caption: 'text-xs text-gray-500 dark:text-gray-400',
  
  // Interactive elements
  link: 'text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors',
  button: 'text-sm font-medium',
  
  // Form elements
  input: 'text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400',
  label: 'text-sm font-medium text-gray-700 dark:text-gray-300',
  error: 'text-sm text-red-600 dark:text-red-400',
  
  // Status text
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
  info: 'text-blue-600 dark:text-blue-400',
  
  // Card elements
  cardTitle: 'text-lg font-medium text-gray-900 dark:text-white',
  cardDescription: 'text-sm text-gray-600 dark:text-gray-400',
  
  // Navigation
  navLink: 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400',
  navLinkActive: 'text-primary-600 dark:text-primary-400 font-medium'
};

// Helper function to combine text styles
export const combineTextStyles = (...styles: string[]): string => {
  return styles.map(style => textStyles[style as keyof typeof textStyles]).join(' ');
}; 