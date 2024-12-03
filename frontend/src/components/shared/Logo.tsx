import { useTheme } from '../../contexts/ThemeContext';
import lightLogo from '../../assets/second-brain-logo-light-mode.png';
import darkLogo from '../../assets/second-brain-logo-dark-mode.png';   

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  const { theme } = useTheme();

  return (
    <div className={className}>
      <img
        src={theme === 'dark' ? darkLogo : lightLogo}
        alt="Second Brain Logo"
        className="w-full h-full object-contain" 
      />
    </div>
  );
}