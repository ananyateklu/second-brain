import { useTheme } from '../../contexts/themeContextUtils';
import darkLogo from '../../assets/second-brain-logo-dark-mode.png';
import lightLogo from '../../assets/second-brain-logo-light-mode.png';

export function Logo({ className = '' }: { className?: string }) {
  const { theme } = useTheme();
  
  // Use dark logo for dark and midnight themes
  const logoSrc = theme === 'dark' || theme === 'midnight' ? darkLogo : lightLogo;

  return (
    <img
      src={logoSrc}
      alt="Second Brain Logo"
      className={className}
      data-theme={theme}
    />
  );
}