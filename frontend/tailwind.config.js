/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0f9f1",
          100: "#dcf1de",
          200: "#bbdebf",
          300: "#8ec596",
          400: "#64ab6f",
          500: "#4a9153",
          600: "#3b7443",
          700: "#325c38",
          800: "#2b4a30",
          900: "#243c29",
          950: "#0d1f0f",
        },
        orange: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
          950: "#431407",
        },
        dark: {
          bg: {
            DEFAULT: "#121212",
            secondary: "#1a1a1a",
            tertiary: "#242424",
          },
          card: "rgba(31, 31, 31, 0.7)",
          border: "rgba(75, 75, 75, 0.3)",
          hover: "rgba(75, 75, 75, 0.2)",
          text: {
            primary: "rgba(255, 255, 255, 0.95)",
            secondary: "rgba(255, 255, 255, 0.7)",
          },
          accent: {
            primary: "#4a9153",
            secondary: "#64ab6f",
          },
          overlay: "rgba(0, 0, 0, 0.4)",
          text: {
            primary: "#F3F4F6",
            secondary: "#D1D5DB",
            tertiary: "#9CA3AF",
            muted: "#6B7280",
          },
        },
      },
      boxShadow: {
        dark: "0 4px 6px -1px rgba(0, 0, 0, 0.4)",
        "dark-lg": "0 10px 15px -3px rgba(0, 0, 0, 0.4)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "message-slide-in": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        spin: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.95)", opacity: 1 },
          "50%": { transform: "scale(1)", opacity: 0.5 },
          "100%": { transform: "scale(0.95)", opacity: 1 },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        gradient: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.5s ease-out",
        "message-slide-in": "message-slide-in 0.3s ease-out forwards",
        slideDown: "slideDown 0.2s ease-out",
        float: "float 3s ease-in-out infinite",
        spin: "spin 1s linear infinite",
        "pulse-ring": "pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 6s ease-in-out infinite",
        "spin-slow": "spin 2s linear infinite",
        gradient: "gradient 3s ease infinite",
      },
    },
  },
  plugins: [],
};
