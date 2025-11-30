/**
 * Dashboard Utils Tests
 * Unit tests for dashboard utility functions
 */

import { describe, it, expect } from 'vitest';
import {
    formatTokenCount,
    getProviderFromModelName,
    TIME_RANGE_OPTIONS,
} from '../dashboard-utils';

describe('dashboard-utils', () => {
    // ============================================
    // formatTokenCount Tests
    // ============================================
    describe('formatTokenCount', () => {
        it('should return number as string for values less than 1000', () => {
            // Act & Assert
            expect(formatTokenCount(0)).toBe('0');
            expect(formatTokenCount(1)).toBe('1');
            expect(formatTokenCount(999)).toBe('999');
        });

        it('should format thousands with k suffix', () => {
            // Act & Assert
            expect(formatTokenCount(1000)).toBe('1.0k');
            expect(formatTokenCount(1500)).toBe('1.5k');
            expect(formatTokenCount(10000)).toBe('10.0k');
            expect(formatTokenCount(999999)).toBe('1000.0k');
        });

        it('should format millions with M suffix', () => {
            // Act & Assert
            expect(formatTokenCount(1000000)).toBe('1.0M');
            expect(formatTokenCount(1500000)).toBe('1.5M');
            expect(formatTokenCount(10000000)).toBe('10.0M');
        });

        it('should handle edge case of exactly 1000', () => {
            // Act
            const result = formatTokenCount(1000);

            // Assert
            expect(result).toBe('1.0k');
        });

        it('should handle edge case of exactly 1000000', () => {
            // Act
            const result = formatTokenCount(1000000);

            // Assert
            expect(result).toBe('1.0M');
        });

        it('should show one decimal place for thousands', () => {
            // Act
            const result = formatTokenCount(2345);

            // Assert
            expect(result).toBe('2.3k');
        });

        it('should show one decimal place for millions', () => {
            // Act
            const result = formatTokenCount(2345678);

            // Assert
            expect(result).toBe('2.3M');
        });
    });

    // ============================================
    // getProviderFromModelName Tests
    // ============================================
    describe('getProviderFromModelName', () => {
        // Anthropic models
        describe('Anthropic models', () => {
            it('should identify claude models as Anthropic', () => {
                // Act & Assert
                expect(getProviderFromModelName('claude-3-opus')).toBe('Anthropic');
                expect(getProviderFromModelName('claude-3-5-sonnet')).toBe('Anthropic');
                expect(getProviderFromModelName('claude-3-haiku')).toBe('Anthropic');
                expect(getProviderFromModelName('claude-2')).toBe('Anthropic');
            });

            it('should be case-insensitive for claude', () => {
                // Act & Assert
                expect(getProviderFromModelName('Claude-3-opus')).toBe('Anthropic');
                expect(getProviderFromModelName('CLAUDE-3-OPUS')).toBe('Anthropic');
            });
        });

        // OpenAI models
        describe('OpenAI models', () => {
            it('should identify gpt models as OpenAI', () => {
                // Act & Assert
                expect(getProviderFromModelName('gpt-4')).toBe('OpenAI');
                expect(getProviderFromModelName('gpt-4-turbo')).toBe('OpenAI');
                expect(getProviderFromModelName('gpt-3.5-turbo')).toBe('OpenAI');
                expect(getProviderFromModelName('gpt-4o')).toBe('OpenAI');
            });

            it('should identify o1/o3 models as OpenAI', () => {
                // Act & Assert
                expect(getProviderFromModelName('o1-preview')).toBe('OpenAI');
                expect(getProviderFromModelName('o1-mini')).toBe('OpenAI');
                expect(getProviderFromModelName('o3-mini')).toBe('OpenAI');
            });

            it('should identify dall-e as OpenAI', () => {
                // Act & Assert
                expect(getProviderFromModelName('dall-e-3')).toBe('OpenAI');
                expect(getProviderFromModelName('dall-e-2')).toBe('OpenAI');
            });

            it('should identify whisper as OpenAI', () => {
                // Act & Assert
                expect(getProviderFromModelName('whisper-1')).toBe('OpenAI');
            });

            it('should identify text-embedding models as OpenAI', () => {
                // Act & Assert
                expect(getProviderFromModelName('text-embedding-3-small')).toBe('OpenAI');
                expect(getProviderFromModelName('text-embedding-ada-002')).toBe('OpenAI');
            });

            it('should identify chatgpt as OpenAI', () => {
                // Act & Assert
                expect(getProviderFromModelName('chatgpt-4o-latest')).toBe('OpenAI');
            });
        });

        // Google models
        describe('Google models', () => {
            it('should identify gemini models as Google', () => {
                // Act & Assert
                expect(getProviderFromModelName('gemini-1.5-pro')).toBe('Google');
                expect(getProviderFromModelName('gemini-2.5-flash')).toBe('Google');
                expect(getProviderFromModelName('gemini-pro')).toBe('Google');
            });
        });

        // xAI models
        describe('xAI models', () => {
            it('should identify grok models as xAI', () => {
                // Act & Assert
                expect(getProviderFromModelName('grok-2')).toBe('xAI');
                expect(getProviderFromModelName('grok-3')).toBe('xAI');
                expect(getProviderFromModelName('grok-beta')).toBe('xAI');
            });
        });

        // Ollama models
        describe('Ollama models', () => {
            it('should identify models with colon as Ollama', () => {
                // Act & Assert
                expect(getProviderFromModelName('llama3:8b')).toBe('Ollama');
                expect(getProviderFromModelName('mistral:7b')).toBe('Ollama');
                expect(getProviderFromModelName('codellama:13b')).toBe('Ollama');
            });

            it('should identify llama models as Ollama', () => {
                // Act & Assert
                expect(getProviderFromModelName('llama2')).toBe('Ollama');
                expect(getProviderFromModelName('llama3')).toBe('Ollama');
            });
        });

        // Unknown models
        describe('unknown models', () => {
            it('should return Other for unknown models', () => {
                // Act & Assert
                expect(getProviderFromModelName('unknown-model')).toBe('Other');
                expect(getProviderFromModelName('custom-model')).toBe('Other');
                expect(getProviderFromModelName('my-fine-tuned-model')).toBe('Other');
            });

            it('should return Other for empty string', () => {
                // Act
                const result = getProviderFromModelName('');

                // Assert
                expect(result).toBe('Other');
            });
        });
    });

    // ============================================
    // TIME_RANGE_OPTIONS Tests
    // ============================================
    describe('TIME_RANGE_OPTIONS', () => {
        it('should have correct number of options', () => {
            // Assert
            expect(TIME_RANGE_OPTIONS).toHaveLength(6);
        });

        it('should have 7 days option', () => {
            // Act
            const option = TIME_RANGE_OPTIONS.find(o => o.label === '7D');

            // Assert
            expect(option).toBeDefined();
            expect(option?.days).toBe(7);
        });

        it('should have 30 days option', () => {
            // Act
            const option = TIME_RANGE_OPTIONS.find(o => o.label === '30D');

            // Assert
            expect(option).toBeDefined();
            expect(option?.days).toBe(30);
        });

        it('should have 90 days option', () => {
            // Act
            const option = TIME_RANGE_OPTIONS.find(o => o.label === '90D');

            // Assert
            expect(option).toBeDefined();
            expect(option?.days).toBe(90);
        });

        it('should have 6 months option', () => {
            // Act
            const option = TIME_RANGE_OPTIONS.find(o => o.label === '6M');

            // Assert
            expect(option).toBeDefined();
            expect(option?.days).toBe(180);
        });

        it('should have 1 year option', () => {
            // Act
            const option = TIME_RANGE_OPTIONS.find(o => o.label === '1Y');

            // Assert
            expect(option).toBeDefined();
            expect(option?.days).toBe(365);
        });

        it('should have 2 years option', () => {
            // Act
            const option = TIME_RANGE_OPTIONS.find(o => o.label === '2Y');

            // Assert
            expect(option).toBeDefined();
            expect(option?.days).toBe(730);
        });

        it('should be in ascending order by days', () => {
            // Act
            const days = TIME_RANGE_OPTIONS.map(o => o.days);

            // Assert
            for (let i = 1; i < days.length; i++) {
                expect(days[i]).toBeGreaterThan(days[i - 1]);
            }
        });
    });
});

