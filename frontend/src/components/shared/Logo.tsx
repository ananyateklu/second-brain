import { useTheme } from '../../contexts/themeContextUtils';
import darkLogo from '../../assets/second-brain-logo-dark-mode.png';
import lightLogo from '../../assets/second-brain-logo-light-mode.png';

interface LogoProps {
  className?: string;
  variant?: 'dark' | 'light';
}

export function Logo({ className = '', variant }: LogoProps) {
  const { theme } = useTheme();
  
  // Use variant if provided, otherwise use theme-based selection
  const isDark = variant ? variant === 'dark' : (theme === 'dark' || theme === 'midnight');
  const logoSrc = isDark ? darkLogo : lightLogo;

  return (
    <img
      src={logoSrc}
      alt="Second Brain Logo"
      className={className}
      data-theme={theme}
    />
  );
}