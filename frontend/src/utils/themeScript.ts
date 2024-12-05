// This script will be inlined in the HTML head to prevent theme flashing
export const themeScript = `
  (function() {
    try {
      const savedTheme = localStorage.getItem('theme');
      const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      // Determine the initial theme
      let theme = savedTheme;
      if (!theme) {
        theme = systemDarkMode ? 'dark' : 'light';
      }
      
      // Define theme colors
      const themes = {
        light: {
          primary: '#ffffff',
          secondary: '#f1f5f9',
          background: '#f8fafc',
          surface: '#ffffff',
          text: '#1e293b',
          textSecondary: '#64748b',
          border: '#e2e8f0',
          accent: '#4c9959'
        },
        dark: {
          primary: '#1C1C1E',
          secondary: '#2C2C2E',
          background: '#1C1C1E',
          surface: '#2C2C2E',
          text: '#ffffff',
          textSecondary: '#a1a1aa',
          border: '#3C3C3E',
          accent: '#4c9959'
        },
        midnight: {
          primary: '#1e1e24',
          secondary: '#2c2c34',
          background: 'rgb(17, 24, 39)',
          surface: '#2c2c34',
          text: 'rgba(255, 255, 255, 0.9)',
          textSecondary: 'rgba(255, 255, 255, 0.8)',
          border: 'rgba(75, 85, 99, 0.3)',
          accent: '#4c9959'
        }
      };
      
      // Apply the theme immediately
      const root = document.documentElement;
      const themeColors = themes[theme];
      
      // Apply CSS variables
      Object.entries(themeColors).forEach(([key, value]) => {
        root.style.setProperty(\`--color-\${key}\`, value);
      });
      
      // Set data-theme attribute for CSS selectors
      root.setAttribute('data-theme', theme);
      root.classList.toggle('dark', theme === 'dark' || theme === 'midnight');
      
      // Add smooth transitions for theme changes
      root.style.setProperty('--theme-transition', 'background-color 0.15s ease-in-out, color 0.15s ease-in-out');
      
      // Store the theme if it wasn't already stored
      if (!savedTheme) {
        localStorage.setItem('theme', theme);
      }
    } catch (e) {
      console.error('Error applying initial theme:', e);
    }
  })();
`; 