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
          accent: '#4c9959',
          // Tag colors
          tagText: '#9333ea',
          tagBg: 'rgba(147, 51, 234, 0.2)',
          // Idea colors
          ideaText: '#d97706',
          ideaBg: 'rgba(217, 119, 6, 0.2)',
          // Note colors
          noteText: '#2563eb',
          noteBg: 'rgba(37, 99, 235, 0.2)',
          // Task colors
          taskText: '#4c9959',
          taskBg: 'rgba(76, 153, 89, 0.2)',
          // Reminder colors
          reminderText: '#9333ea',
          reminderBg: 'rgba(147, 51, 234, 0.2)',
          // Status colors
          errorText: '#ef4444',
          errorBg: 'rgba(239, 68, 68, 0.2)',
          successText: '#22c55e',
          successBg: 'rgba(34, 197, 94, 0.2)',
          warningText: '#f59e0b',
          warningBg: 'rgba(245, 158, 11, 0.2)',
          infoText: '#3b82f6',
          infoBg: 'rgba(59, 130, 246, 0.2)',
          // More items
          moreItemsBg: '#f1f5f9',
          moreItemsText: '#64748b'
        },
        dark: {
          primary: '#1C1C1E',
          secondary: '#2C2C2E',
          background: '#1C1C1E',
          surface: '#2C2C2E',
          text: '#ffffff',
          textSecondary: '#a1a1aa',
          border: '#3C3C3E',
          accent: '#4c9959',
          // Tag colors
          tagText: '#c084fc',
          tagBg: 'rgba(147, 51, 234, 0.3)',
          // Idea colors
          ideaText: '#fcd34d',
          ideaBg: 'rgba(252, 211, 77, 0.3)',
          // Note colors
          noteText: '#60a5fa',
          noteBg: 'rgba(59, 130, 246, 0.3)',
          // Task colors
          taskText: '#86efac',
          taskBg: 'rgba(134, 239, 172, 0.3)',
          // Reminder colors
          reminderText: '#c084fc',
          reminderBg: 'rgba(147, 51, 234, 0.3)',
          // Status colors
          errorText: '#ef4444',
          errorBg: 'rgba(239, 68, 68, 0.3)',
          successText: '#86efac',
          successBg: 'rgba(134, 239, 172, 0.3)',
          warningText: '#fcd34d',
          warningBg: 'rgba(252, 211, 77, 0.3)',
          infoText: '#60a5fa',
          infoBg: 'rgba(59, 130, 246, 0.3)',
          // More items
          moreItemsBg: '#374151',
          moreItemsText: '#9ca3af'
        },
        midnight: {
          primary: '#1e1e24',
          secondary: '#2c2c34',
          background: 'rgb(17, 24, 39)',
          surface: '#2c2c34',
          text: 'rgba(255, 255, 255, 0.9)',
          textSecondary: 'rgba(255, 255, 255, 0.8)',
          border: 'rgba(75, 85, 99, 0.3)',
          accent: '#4c9959',
          // Tag colors
          tagText: '#c084fc',
          tagBg: 'rgba(147, 51, 234, 0.3)',
          // Idea colors
          ideaText: '#fcd34d',
          ideaBg: 'rgba(252, 211, 77, 0.3)',
          // Note colors
          noteText: '#60a5fa',
          noteBg: 'rgba(59, 130, 246, 0.3)',
          // Task colors
          taskText: '#86efac',
          taskBg: 'rgba(134, 239, 172, 0.3)',
          // Reminder colors
          reminderText: '#c084fc',
          reminderBg: 'rgba(147, 51, 234, 0.3)',
          // Status colors
          errorText: '#ef4444',
          errorBg: 'rgba(239, 68, 68, 0.3)',
          successText: '#86efac',
          successBg: 'rgba(134, 239, 172, 0.3)',
          warningText: '#fcd34d',
          warningBg: 'rgba(252, 211, 77, 0.3)',
          infoText: '#60a5fa',
          infoBg: 'rgba(59, 130, 246, 0.3)',
          // More items
          moreItemsBg: '#1F2937',
          moreItemsText: '#9ca3af'
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