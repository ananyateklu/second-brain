/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9f1',
          100: '#dcf1de',
          200: '#bbdebf',
          300: '#8ec596',
          400: '#64ab6f',
          500: '#4a9153',
          600: '#3b7443',
          700: '#325c38',
          800: '#2b4a30',
          900: '#243c29',
          950: '#0d1f0f',
        },
        orange: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        dark: {
          bg: '#121212',
          card: '#1C1C1C',
          border: '#2A2A2A',
          hover: '#3A3A3A',
          text: {
            primary: '#E3E3E3',
            secondary: '#A8A8A8'
          },
          accent: '#4a9153',
          link: '#64ab6f',
          error: '#E53935',
          success: '#3b7443',
          disabled: '#555555'
        }
      },
      boxShadow: {
        'dark': '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
        'dark-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 }
        },
        'message-slide-in': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-out',
        'message-slide-in': 'message-slide-in 0.3s ease-out forwards',
      }
    },
  },
  plugins: [],
};