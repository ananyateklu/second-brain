// This script will be inlined in the HTML head to prevent theme flashing
export const themeScript = `
  (function() {
    try {
      const savedTheme = localStorage.getItem('theme');
      const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      // Determine the initial theme
      let theme = savedTheme;
      if (!theme) {
        theme = systemDarkMode ? 'dark' : 'light';
      }
      
      // Set data-theme attribute for CSS selectors
      const root = document.documentElement;
      root.setAttribute('data-theme', theme);
      
      // Add dark class for dark themes
      root.classList.toggle('dark', theme === 'dark' || theme === 'midnight' || theme === 'full-dark');

      // Safari-specific fixes
      if (isSafari) {
        if (theme === 'midnight') {
          root.style.setProperty('--note-bg-opacity', '0.3');
          root.style.setProperty('--note-bg-color', '#1e293b');
          root.style.setProperty('--color-background', '#0f172a');
          root.style.setProperty('--color-surface', '#1e293b');
        } else if (theme === 'dark') {
          root.style.setProperty('--note-bg-opacity', '0.3');
          root.style.setProperty('--note-bg-color', 'rgb(17, 24, 39)'); // bg-gray-900
          root.style.removeProperty('--color-background');
          root.style.removeProperty('--color-surface');
        } else if (theme === 'full-dark') {
          root.style.setProperty('--note-bg-opacity', '0.4');
          root.style.setProperty('--note-bg-color', '#27272a'); // Use updated surface color (zinc-800)
          root.style.setProperty('--color-background', '#000000');
          root.style.setProperty('--color-surface', '#27272a'); // Use updated surface color (zinc-800)
        } else {
          root.style.removeProperty('--note-bg-opacity');
          root.style.removeProperty('--note-bg-color');
          root.style.removeProperty('--color-background');
          root.style.removeProperty('--color-surface');
        }
        
        // Force a repaint in Safari
        const body = document.body;
        body.style.display = 'none';
        void body.offsetHeight;
        body.style.display = '';
      }
      
      // Store the theme if it wasn't already stored
      if (!savedTheme) {
        localStorage.setItem('theme', theme);
      }
    } catch (e) {
      console.error('Error applying initial theme:', e);
    }
  })();
`; 