export type ThemeColor = {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    accent: string;
    note: string;
    idea: string;
    task: string;
    reminder: string;
    tag: string;
};

export type ThemeConfig = {
    name: string;
    colors: ThemeColor;
};

export type ThemeName = 'light' | 'dark' | 'midnight';

export const themes: Record<ThemeName, ThemeConfig> = {
    light: {
        name: 'Light',
        colors: {
            primary: '#ffffff',
            secondary: '#f1f5f9',
            background: '#f8fafc',
            surface: '#ffffff',
            text: '#1e293b',
            textSecondary: '#64748b',
            border: '#e2e8f0',
            accent: '#2563eb',
            note: '#2563eb',
            idea: '#d97706',
            task: '#3b7443',
            reminder: 'rgb(99, 102, 241)',
            tag: '#2563eb'
        },
    },
    dark: {
        name: 'Dark',
        colors: {
            primary: '#1C1C1E',
            secondary: '#2C2C2E',
            background: '#1C1C1E',
            surface: '#2C2C2E',
            text: '#ffffff',
            textSecondary: '#a1a1aa',
            border: '#3C3C3E',
            accent: '#60a5fa',
            note: 'rgb(59, 130, 246)',
            idea: '#FCD34D',
            task: '#3b7443',
            reminder: 'rgb(129, 140, 248)',
            tag: '#60a5fa'
        },
    },
    midnight: {
        name: 'Midnight',
        colors: {
            primary: '#1e1e24',
            secondary: '#2c2c34',
            background: 'rgb(17, 24, 39)',
            surface: '#2c2c34',
            text: 'rgba(255, 255, 255, 0.9)',
            textSecondary: 'rgba(255, 255, 255, 0.8)',
            border: 'rgba(75, 85, 99, 0.3)',
            accent: '#60a5fa',
            note: 'rgb(59, 130, 246)',
            idea: '#FCD34D',
            task: '#64AB6F',
            reminder: 'rgb(129, 140, 248)',
            tag: '#60a5fa'
        },
    },
}; 