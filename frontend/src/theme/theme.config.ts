export type ThemeColor = {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    surfaceHover: string;
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
            surfaceHover: '#f8fafc',
            text: '#1e293b',
            textSecondary: '#64748b',
            border: '#e2e8f0',
            accent: '#4c9959',
            note: '#2563eb',
            idea: '#d97706',
            task: '#4c9959',
            reminder: 'rgb(99, 102, 241)',
            tag: '#4c9959'
        },
    },
    dark: {
        name: 'Dark',
        colors: {
            primary: '#1C1C1E',
            secondary: '#2C2C2E',
            background: '#1C1C1E',
            surface: '#2C2C2E',
            surfaceHover: '#252527',
            text: '#ffffff',
            textSecondary: '#a1a1aa',
            border: '#3C3C3E',
            accent: '#4c9959',
            note: 'rgb(59, 130, 246)',
            idea: '#FCD34D',
            task: '#4c9959',
            reminder: 'rgb(129, 140, 248)',
            tag: '#4c9959'
        },
    },
    midnight: {
        name: 'Midnight',
        colors: {
            primary: '#111827',
            secondary: '#1F2937',
            background: '#0F172A',
            surface: '#1F2937',
            surfaceHover: '#1a2333',
            text: '#F3F4F6',
            textSecondary: '#9CA3AF',
            border: 'rgba(75, 85, 99, 0.4)',
            accent: '#4c9959',
            note: 'rgb(59, 130, 246)',
            idea: '#FCD34D',
            task: '#4c9959',
            reminder: 'rgb(129, 140, 248)',
            tag: '#4c9959'
        },
    },
}; 