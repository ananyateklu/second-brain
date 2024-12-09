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
      
      // Set data-theme attribute for CSS selectors
      const root = document.documentElement;
      root.setAttribute('data-theme', theme);
      
      // Add dark class for dark themes
      root.classList.toggle('dark', theme === 'dark' || theme === 'midnight');
      
      // Store the theme if it wasn't already stored
      if (!savedTheme) {
        localStorage.setItem('theme', theme);
      }
    } catch (e) {
      console.error('Error applying initial theme:', e);
    }
  })();
`; 