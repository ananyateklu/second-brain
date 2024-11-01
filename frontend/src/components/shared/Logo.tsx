import { useTheme } from '../../contexts/ThemeContext';
import lightLogo from '../../assets/second-brain-logo-light-mode.png';
import darkLogo from '../../assets/second-brain-logo-dark-mode.png';   

export function Logo() {
  const { theme } = useTheme();

  return (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <img
          src={theme === 'dark' ? darkLogo : lightLogo}
          alt="Second Brain Logo"
          className="w-30 h-20" 
        />
      </div>
    </div>
  );
}