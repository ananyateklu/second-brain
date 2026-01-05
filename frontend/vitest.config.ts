/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@styles': path.resolve(__dirname, './src/styles'),
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
        exclude: ['node_modules', 'dist'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'src/test/',
                '**/*.d.ts',
                '**/*.config.*',
                '**/types/**',
            ],
            // Enforce minimum coverage thresholds
            thresholds: {
                // High thresholds to maintain quality - current coverage is ~75%
                lines: 60,
                functions: 60,
                branches: 55,
                statements: 60,
                // Per-file thresholds - fail if any file drops below these minimums
                perFile: false, // Set to true for stricter enforcement
            },
        },
        // Improve test isolation
        isolate: true,
        // Clear mocks between tests
        clearMocks: true,
        restoreMocks: true,
    },
});

