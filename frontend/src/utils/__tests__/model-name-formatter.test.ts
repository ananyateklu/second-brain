/**
 * Model Name Formatter Tests
 * Unit tests for AI model name formatting utilities
 */

import { describe, it, expect } from 'vitest';
import { formatModelName, getShortModelName } from '../model-name-formatter';

describe('model-name-formatter', () => {
    // ============================================
    // formatModelName Tests
    // ============================================
    describe('formatModelName', () => {
        it('should return empty string for empty input', () => {
            // Act
            const result = formatModelName('');

            // Assert
            expect(result).toBe('');
        });

        it('should return null/undefined as-is', () => {
            // Act & Assert
            expect(formatModelName(null as unknown as string)).toBeFalsy();
            expect(formatModelName(undefined as unknown as string)).toBeFalsy();
        });

        // Claude Models
        describe('Claude models', () => {
            it('should format claude-sonnet-4-5 correctly', () => {
                // Act
                const result = formatModelName('claude-sonnet-4-5-20250929');

                // Assert
                expect(result).toBe('Claude Sonnet 4.5');
            });

            it('should format claude-3-5-sonnet correctly', () => {
                // Act
                const result = formatModelName('claude-3-5-sonnet-20241022');

                // Assert
                expect(result).toBe('Claude 3.5 Sonnet');
            });

            it('should format claude-3-opus correctly', () => {
                // Act
                const result = formatModelName('claude-3-opus-20240229');

                // Assert
                expect(result).toBe('Claude 3 Opus');
            });

            it('should format claude-haiku-4-5 correctly', () => {
                // Act
                const result = formatModelName('claude-haiku-4-5');

                // Assert
                expect(result).toBe('Claude Haiku 4.5');
            });
        });

        // Gemini Models
        describe('Gemini models', () => {
            it('should format gemini-2.5-flash correctly', () => {
                // Act
                const result = formatModelName('gemini-2.5-flash');

                // Assert
                expect(result).toBe('Gemini 2.5 Flash');
            });

            it('should format gemini with preview modifier', () => {
                // Act
                const result = formatModelName('gemini-2.5-flash-preview');

                // Assert
                expect(result).toBe('Gemini 2.5 Flash (Preview)');
            });

            it('should format gemini with tts modifier', () => {
                // Act
                const result = formatModelName('gemini-2.5-flash-preview-tts');

                // Assert
                expect(result).toBe('Gemini 2.5 Flash (Preview, TTS)');
            });

            it('should format gemini with thinking modifier', () => {
                // Act
                const result = formatModelName('gemini-2.5-pro-thinking');

                // Assert
                expect(result).toBe('Gemini 2.5 Pro (Thinking)');
            });

            it('should format gemini with exp modifier', () => {
                const result = formatModelName('gemini-2.5-flash-exp');
                expect(result).toBe('Gemini 2.5 Flash (Exp)');
            });

            it('should format gemini with image modifier', () => {
                const result = formatModelName('gemini-2.5-flash-image');
                expect(result).toBe('Gemini 2.5 Flash (Image)');
            });

            it('should format gemini with computer-use modifier', () => {
                const result = formatModelName('gemini-2.5-pro-computer-use');
                expect(result).toBe('Gemini 2.5 Pro (Computer Use)');
            });

            it('should format gemini with robotics modifier', () => {
                const result = formatModelName('gemini-2.5-pro-robotics');
                expect(result).toBe('Gemini 2.5 Pro (Robotics)');
            });

            it('should format gemini with embedding modifier', () => {
                const result = formatModelName('gemini-embedding-001');
                expect(result).toBe('Gemini Embedding 001');
            });

            it('should format gemini-lite correctly', () => {
                const result = formatModelName('gemini-1.5-flash-lite');
                expect(result).toBe('Gemini 1.5 Flash Lite');
            });

            it('should handle gemini date patterns', () => {
                const result = formatModelName('gemini-2.5-flash-03-07');
                expect(result).toBe('Gemini 2.5 Flash');
            });
        });

        // GPT Models
        describe('GPT models', () => {
            it('should format gpt-4o correctly', () => {
                // Act
                const result = formatModelName('gpt-4o');

                // Assert
                expect(result).toBe('GPT-4o');
            });

            it('should format gpt-4o-audio-preview correctly', () => {
                // Act
                const result = formatModelName('gpt-4o-audio-preview');

                // Assert
                expect(result).toBe('GPT-4o (Audio, Preview)');
            });

            it('should format gpt-4-turbo correctly', () => {
                // Act
                const result = formatModelName('gpt-4-turbo');

                // Assert
                expect(result).toBe('GPT-4 Turbo');
            });

            it('should format gpt-4-mini correctly', () => {
                // Act
                const result = formatModelName('gpt-4-mini');

                // Assert
                expect(result).toBe('GPT-4 Mini');
            });

            it('should format gpt with realtime modifier', () => {
                const result = formatModelName('gpt-4o-realtime');
                expect(result).toBe('GPT-4o (Realtime)');
            });

            it('should format gpt with transcribe modifier', () => {
                const result = formatModelName('gpt-4o-transcribe');
                expect(result).toBe('GPT-4o (Transcribe)');
            });

            it('should format gpt with search modifier', () => {
                const result = formatModelName('gpt-4o-search-preview');
                expect(result).toBe('GPT-4o (Search, Preview)');
            });

            it('should format gpt with diarize modifier', () => {
                const result = formatModelName('gpt-4o-diarize');
                expect(result).toBe('GPT-4o (Diarize)');
            });

            it('should format gpt with image modifier', () => {
                const result = formatModelName('gpt-4o-image');
                expect(result).toBe('GPT-4o (Image)');
            });

            it('should remove -api suffix', () => {
                const result = formatModelName('gpt-4o-api');
                expect(result).toBe('GPT-4o');
            });

            it('should format gpt-4-instruct correctly', () => {
                const result = formatModelName('gpt-4-instruct');
                expect(result).toBe('GPT-4 Instruct');
            });

            it('should format gpt-4-nano correctly', () => {
                const result = formatModelName('gpt-4-nano');
                expect(result).toBe('GPT-4 Nano');
            });

            it('should format gpt-4-pro correctly', () => {
                const result = formatModelName('gpt-4-pro');
                expect(result).toBe('GPT-4 Pro');
            });

            it('should format gpt-4-codex correctly', () => {
                const result = formatModelName('gpt-4-codex');
                expect(result).toBe('GPT-4 Codex');
            });

            it('should format gpt-4-chat correctly', () => {
                const result = formatModelName('gpt-4-chat');
                expect(result).toBe('GPT-4 Chat');
            });

            it('should format gpt-4-tts correctly', () => {
                const result = formatModelName('gpt-4-tts');
                expect(result).toBe('GPT-4 TTS');
            });

            it('should format gpt-4-latest correctly', () => {
                const result = formatModelName('gpt-4-latest');
                expect(result).toBe('GPT-4 Latest');
            });

            it('should format gpt-4-16k correctly', () => {
                const result = formatModelName('gpt-4-16k');
                expect(result).toBe('GPT-4 16K');
            });

            it('should handle gpt date patterns', () => {
                const result = formatModelName('gpt-4-2024-01-15');
                expect(result).toBe('GPT-4');
            });
        });

        // O-series Models
        describe('O-series models', () => {
            it('should format o3-mini correctly', () => {
                // Act
                const result = formatModelName('o3-mini');

                // Assert
                expect(result).toBe('O3 Mini');
            });

            it('should format o1-pro correctly', () => {
                // Act
                const result = formatModelName('o1-pro');

                // Assert
                expect(result).toBe('O1 Pro');
            });

            it('should format o1-preview correctly', () => {
                // Act
                const result = formatModelName('o1-preview');

                // Assert
                expect(result).toBe('O1 (Preview)');
            });

            it('should format o3-deep-research correctly', () => {
                const result = formatModelName('o3-deep-research');
                expect(result).toBe('O3 (Deep Research)');
            });
        });

        // Grok Models
        describe('Grok models', () => {
            it('should format grok-4 correctly', () => {
                // Act
                const result = formatModelName('grok-4');

                // Assert
                expect(result).toBe('Grok 4');
            });

            it('should format grok-4-fast-reasoning correctly', () => {
                // Act
                const result = formatModelName('grok-4-fast-reasoning');

                // Assert - modifiers are added in the order they appear in the code
                expect(result).toBe('Grok 4 (Reasoning, Fast)');
            });

            it('should format grok with vision modifier', () => {
                // Act
                const result = formatModelName('grok-2-vision');

                // Assert
                expect(result).toBe('Grok 2 (Vision)');
            });

            it('should format grok with image modifier', () => {
                const result = formatModelName('grok-3-image');
                expect(result).toBe('Grok 3 (Image)');
            });

            it('should format grok with non-reasoning modifier', () => {
                const result = formatModelName('grok-3-non-reasoning');
                // The 'non' part gets filtered as it's split with the 'reasoning' modifier
                expect(result).toBe('Grok 3 Non (Reasoning)');
            });

            it('should format grok with code modifier', () => {
                const result = formatModelName('grok-3-code');
                expect(result).toBe('Grok 3 (Code)');
            });

            it('should format grok-mini correctly', () => {
                const result = formatModelName('grok-2-mini');
                expect(result).toBe('Grok 2 Mini');
            });

            it('should format grok-beta correctly', () => {
                const result = formatModelName('grok-beta');
                expect(result).toBe('Grok Beta');
            });
        });

        // OpenAI Special Models
        describe('OpenAI special models', () => {
            it('should format dall-e-3 correctly', () => {
                // Act
                const result = formatModelName('dall-e-3');

                // Assert
                expect(result).toBe('DALL-E 3');
            });

            it('should format dall-e-2 correctly', () => {
                // Act
                const result = formatModelName('dall-e-2');

                // Assert
                expect(result).toBe('DALL-E 2');
            });

            it('should format whisper-1 correctly', () => {
                // Act
                const result = formatModelName('whisper-1');

                // Assert
                expect(result).toBe('Whisper 1');
            });

            it('should format text-embedding-ada correctly', () => {
                const result = formatModelName('text-embedding-ada-002');
                expect(result).toBe('Text Embedding Ada 002');
            });

            it('should format davinci-002 correctly', () => {
                const result = formatModelName('davinci-002');
                expect(result).toBe('Davinci 002');
            });

            it('should format babbage-002 correctly', () => {
                const result = formatModelName('babbage-002');
                expect(result).toBe('Babbage 002');
            });

            it('should format chatgpt models correctly', () => {
                const result = formatModelName('chatgpt-4o-latest');
                expect(result).toBe('ChatGPT 4O LATEST');
            });

            it('should format moderation models correctly', () => {
                const result = formatModelName('text-moderation-latest');
                expect(result).toBe('Text Moderation Latest');
            });

            it('should format sora models correctly', () => {
                const result = formatModelName('sora-1.0-turbo');
                expect(result).toBe('Sora 1.0-turbo');
            });

            it('should format sora-pro correctly', () => {
                const result = formatModelName('sora-pro');
                expect(result).toBe('Sora pro');
            });

            it('should format codex models correctly', () => {
                const result = formatModelName('codex-davinci');
                expect(result).toBe('Codex davinci');
            });

            it('should format codex-latest correctly', () => {
                const result = formatModelName('codex-latest');
                expect(result).toBe('Codex latest');
            });
        });

        // Ollama Models
        describe('Ollama models', () => {
      it('should format gemma3:4b correctly', () => {
        // Act
        const result = formatModelName('gemma3:4b');

        // Assert - the formatter adds a space between name and number
        expect(result).toBe('Gemma 3 4B');
      });

      it('should format llama3:8b correctly', () => {
        // Act
        const result = formatModelName('llama3:8b');

        // Assert - the formatter adds a space between name and number
        expect(result).toBe('Llama 3 8B');
      });
        });

        // Llama Models
        describe('Llama models', () => {
            it('should format llama2 correctly', () => {
                // Act
                const result = formatModelName('llama2');

                // Assert
                expect(result).toBe('Llama 2');
            });

            it('should format llama3 with modifiers', () => {
                // Act
                const result = formatModelName('llama3-8b-instruct');

                // Assert
                expect(result).toBe('Llama 3 8b Instruct');
            });
        });

        // Date Suffix Removal
        describe('date suffix removal', () => {
            it('should remove 8-digit date suffix', () => {
                // Act
                const result = formatModelName('claude-3-opus-20240229');

                // Assert
                expect(result).not.toContain('20240229');
            });

            it('should remove 4-digit date suffix', () => {
                // Act
                const result = formatModelName('gpt-4-0613');

                // Assert
                expect(result).not.toContain('0613');
            });
        });

        // Default Formatting
        describe('default formatting', () => {
            it('should capitalize words and replace hyphens with spaces', () => {
                // Act
                const result = formatModelName('unknown-model-name');

                // Assert
                expect(result).toBe('Unknown Model Name');
            });
        });
    });

    // ============================================
    // getShortModelName Tests
    // ============================================
    describe('getShortModelName', () => {
        it('should remove parenthetical additions', () => {
            // Act
            const result = getShortModelName('gpt-4o-audio-preview');

            // Assert
            expect(result).toBe('GPT-4o');
            expect(result).not.toContain('Audio');
            expect(result).not.toContain('Preview');
        });

        it('should remove multiple modifiers in parentheses', () => {
            // Act
            const result = getShortModelName('gemini-2.5-flash-preview-tts');

            // Assert
            expect(result).toBe('Gemini 2.5 Flash');
        });

        it('should return same result if no parentheses', () => {
            // Act
            const result = getShortModelName('gpt-4-turbo');

            // Assert
            expect(result).toBe('GPT-4 Turbo');
        });

        it('should handle model with no modifications', () => {
            // Act
            const result = getShortModelName('claude-3-opus');

            // Assert
            expect(result).toBe('Claude 3 Opus');
        });

        it('should handle empty string', () => {
            // Act
            const result = getShortModelName('');

            // Assert
            expect(result).toBe('');
        });
    });
});

