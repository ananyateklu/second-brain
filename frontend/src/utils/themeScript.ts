import { themes } from '../theme/theme.config';

// Convert the themes object to a JSON string to embed in the script
const themesJSON = JSON.stringify(themes);

// This script will be inlined in the HTML head to prevent theme flashing
export const themeScript = `
  (function() {
    // Embed the themes configuration directly into the script
    const themes = ${themesJSON};
    
    try {
      const savedTheme = localStorage.getItem('theme');
      const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      // Determine the initial theme name
      let themeName = savedTheme;
      if (!themeName || !themes[themeName]) {
        themeName = systemDarkMode ? 'dark' : 'light';
      }

      // Get the corresponding theme configuration
      const themeConfig = themes[themeName]; // Get the full config for the chosen theme
      const themeColors = themeConfig.colors; // Extract the colors object

      // Set data-theme attribute for CSS selectors
      const root = document.documentElement;
      root.setAttribute('data-theme', themeName);
      
      // Add/Remove dark class for Tailwind's dark mode
      const isDarkTheme = themeName === 'dark' || themeName === 'midnight' || themeName === 'full-dark';
      root.classList.toggle('dark', isDarkTheme);

      // Apply all CSS variables from the chosen theme's colors
      for (const key in themeColors) {
        if (Object.prototype.hasOwnProperty.call(themeColors, key)) {
          root.style.setProperty('--' + key, themeColors[key]);
          // Apply --color- prefix as well for compatibility if needed, though direct usage is preferred
          root.style.setProperty('--color-' + key, themeColors[key]); 
        }
      }

      // Set color-scheme property
      root.style.colorScheme = themeName === 'light' ? 'light' : 'dark';

      // Safari-specific fixes (Keep repaint hack, remove old variable setting)
      if (isSafari) {
         // Set note card background colors specifically for Safari - These seem necessary still
         if (themeName === 'midnight') {
           root.style.setProperty('--note-bg-opacity', '0.3');
           root.style.setProperty('--note-bg-color', '#1e293b');
         } else if (themeName === 'dark') {
           root.style.setProperty('--note-bg-opacity', '0.3');
           root.style.setProperty('--note-bg-color', 'rgb(17, 24, 39)');
         } else if (themeName === 'full-dark') {
           root.style.setProperty('--note-bg-opacity', '0.4');
           root.style.setProperty('--note-bg-color', '#27272a'); // Matches new config surface for full-dark
         } else { // Light theme
           root.style.removeProperty('--note-bg-opacity');
           root.style.removeProperty('--note-bg-color');
         }

        // Force a repaint in Safari - KEEPING
        // Check if document.body exists before trying to access style
        if (document.body) {
          document.body.style.display = 'none';
          void document.body.offsetHeight; // void operator is used to force evaluation
          document.body.style.display = '';
        }
      }
      
      // Store the theme if it wasn't already stored or was invalid
      if (!savedTheme || !themes[savedTheme]) {
        localStorage.setItem('theme', themeName);
      }
    } catch (e) {
      console.error('Error applying initial theme:', e);
      // Fallback to ensure basic functionality
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
    }
  })();
`; 