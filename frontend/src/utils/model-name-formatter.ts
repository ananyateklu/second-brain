/**
 * Formats AI model names for better display in the UI
 * Removes date suffixes, version details, and special characters for cleaner presentation
 * 
 * Example transformations:
 * - "claude-sonnet-4-5-20250929" → "Claude Sonnet 4.5"
 * - "claude-3-5-sonnet-20241022" → "Claude 3.5 Sonnet"
 * - "gemini-2.5-flash-preview-tts" → "Gemini 2.5 Flash (Preview, TTS)"
 * - "gpt-5.1-codex-mini" → "GPT-5.1 Codex Mini"
 * - "gpt-4o-audio-preview" → "GPT-4o Audio (Preview)"
 * - "o3-mini" → "O3 Mini"
 * - "grok-4-fast-reasoning" → "Grok 4 Fast (Reasoning)"
 * - "gemma3:4b" → "Gemma3 4B"
 */
export function formatModelName(modelName: string): string {
    if (!modelName) return modelName;

    // Remove date suffixes (e.g., -20241022, -20240620, -1212, -0613)
    let formatted = modelName.replace(/-\d{8}$/, ''); // YYYYMMDD format
    formatted = formatted.replace(/-\d{4}$/, ''); // YYMM or MMDD format

    // Handle specific provider patterns

    // Claude models - handle both old (claude-3-5-sonnet) and new (claude-sonnet-4-5) formats
    if (formatted.startsWith('claude-')) {
        formatted = formatted.replace(/^claude-/, '');

        // New format: claude-sonnet-4-5 or claude-haiku-4-5
        if (/^(sonnet|opus|haiku)-\d/.test(formatted)) {
            const parts = formatted.split('-');
            const variant = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
            const version = parts.slice(1).join('.').replace(/-/g, '.');
            return `Claude ${variant} ${version}`;
        }

        // Old format: claude-3-5-sonnet or claude-3-opus
        formatted = formatted
            .replace(/(\d)-(\d)(?=-|$)/, '$1.$2') // Convert 3-5 to 3.5, 3-7 to 3.7
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        return `Claude ${formatted}`;
    }

    // Gemini models - handle extensive variant system
    if (formatted.startsWith('gemini-')) {
        formatted = formatted.replace(/^gemini-/, '');

        // Extract and format special suffixes
        const modifiers: string[] = [];

        // Handle preview/exp variants
        if (formatted.includes('-preview')) {
            modifiers.push('Preview');
            formatted = formatted.replace(/-preview/g, '');
        }
        if (formatted.includes('-exp')) {
            modifiers.push('Exp');
            formatted = formatted.replace(/-exp/g, '');
        }

        // Handle special capabilities
        if (formatted.includes('-tts')) {
            modifiers.push('TTS');
            formatted = formatted.replace(/-tts/g, '');
        }
        if (formatted.includes('-thinking')) {
            modifiers.push('Thinking');
            formatted = formatted.replace(/-thinking/g, '');
        }
        if (formatted.includes('-image')) {
            modifiers.push('Image');
            formatted = formatted.replace(/-image/g, '');
        }
        if (formatted.includes('-computer-use')) {
            modifiers.push('Computer Use');
            formatted = formatted.replace(/-computer-use/g, '');
        }
        if (formatted.includes('-robotics')) {
            modifiers.push('Robotics');
            formatted = formatted.replace(/-robotics/g, '');
        }
        if (formatted.includes('-embedding')) {
            modifiers.push('Embedding');
            formatted = formatted.replace(/-embedding/g, '');
        }

        // Remove remaining date-like patterns
        formatted = formatted.replace(/-\d{2}-\d{4}/g, ''); // -09-2025, -01-21
        formatted = formatted.replace(/-\d{2}-\d{2}/g, ''); // -03-07, -06-05

        // Format the base name
        formatted = formatted
            .replace(/-lite/g, ' Lite')
            .split('-')
            .filter(part => part.length > 0)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        // Add modifiers in parentheses if any
        if (modifiers.length > 0) {
            formatted += ` (${modifiers.join(', ')})`;
        }

        return `Gemini ${formatted}`;
    }

    // OpenAI models - handle GPT series and O-series
    // O-series models (o1, o3, o4)
    if (/^o\d/.test(formatted)) {
        formatted = formatted
            .replace(/^o(\d)/, 'O$1')
            .replace(/-mini/, ' Mini')
            .replace(/-pro/, ' Pro')
            .replace(/-deep-research/, ' (Deep Research)')
            .replace(/-preview/, ' (Preview)');
        return formatted;
    }

    // GPT models
    if (formatted.startsWith('gpt-')) {
        formatted = formatted.replace(/^gpt-/, '');

        // Extract modifiers
        const modifiers: string[] = [];

        // Handle special capabilities
        if (formatted.includes('-audio')) {
            modifiers.push('Audio');
            formatted = formatted.replace(/-audio/g, '');
        }
        if (formatted.includes('-realtime')) {
            modifiers.push('Realtime');
            formatted = formatted.replace(/-realtime/g, '');
        }
        if (formatted.includes('-transcribe')) {
            modifiers.push('Transcribe');
            formatted = formatted.replace(/-transcribe/g, '');
        }
        if (formatted.includes('-search')) {
            modifiers.push('Search');
            formatted = formatted.replace(/-search/g, '');
        }
        if (formatted.includes('-diarize')) {
            modifiers.push('Diarize');
            formatted = formatted.replace(/-diarize/g, '');
        }
        if (formatted.includes('-image')) {
            modifiers.push('Image');
            formatted = formatted.replace(/-image/g, '');
        }

        // Handle preview/api suffixes
        if (formatted.includes('-preview')) {
            modifiers.push('Preview');
            formatted = formatted.replace(/-preview/g, '');
        }
        if (formatted.includes('-api')) {
            formatted = formatted.replace(/-api/g, '');
        }

        // Remove date patterns
        formatted = formatted.replace(/-\d{4}-\d{2}-\d{2}/g, '');

        // Format base model name
        formatted = formatted
            .replace(/^(\d)/, 'GPT-$1') // Add GPT- prefix back
            .replace(/-turbo/, ' Turbo')
            .replace(/-instruct/, ' Instruct')
            .replace(/-mini/, ' Mini')
            .replace(/-nano/, ' Nano')
            .replace(/-pro/, ' Pro')
            .replace(/-codex/, ' Codex')
            .replace(/-chat/, ' Chat')
            .replace(/-tts/, ' TTS')
            .replace(/-latest/, ' Latest')
            .replace(/-16k/, ' 16K');

        // Add modifiers
        if (modifiers.length > 0) {
            formatted += ` (${modifiers.join(', ')})`;
        }

        return formatted;
    }

    // Other OpenAI models (DALL-E, Whisper, etc.)
    if (formatted === 'dall-e-3') return 'DALL-E 3';
    if (formatted === 'dall-e-2') return 'DALL-E 2';
    if (formatted === 'whisper-1') return 'Whisper 1';
    if (formatted.startsWith('text-embedding-')) {
        formatted = formatted
            .replace(/^text-embedding-/, '')
            .replace('ada-', 'Ada ')
            .replace(/-/g, ' ');
        return `Text Embedding ${formatted}`;
    }
    if (formatted === 'davinci-002') return 'Davinci 002';
    if (formatted === 'babbage-002') return 'Babbage 002';
    if (formatted.startsWith('chatgpt-')) {
        return formatted
            .replace(/^chatgpt-/, 'ChatGPT ')
            .replace(/-latest/, ' Latest')
            .toUpperCase()
            .replace('CHATGPT', 'ChatGPT');
    }
    if (formatted.includes('moderation')) {
        return formatted
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    if (formatted.startsWith('sora-')) {
        return formatted
            .replace(/^sora-/, 'Sora ')
            .replace(/-pro/, ' Pro');
    }
    if (formatted.startsWith('codex-')) {
        return formatted
            .replace(/^codex-/, 'Codex ')
            .replace(/-latest/, ' Latest')
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    // Grok models
    if (formatted.startsWith('grok-')) {
        formatted = formatted.replace(/^grok-/, '');

        const modifiers: string[] = [];

        // Handle special capabilities
        if (formatted.includes('-vision')) {
            modifiers.push('Vision');
            formatted = formatted.replace(/-vision/g, '');
        }
        if (formatted.includes('-image')) {
            modifiers.push('Image');
            formatted = formatted.replace(/-image/g, '');
        }
        if (formatted.includes('-reasoning')) {
            modifiers.push('Reasoning');
            formatted = formatted.replace(/-reasoning/g, '');
        }
        if (formatted.includes('-non-reasoning')) {
            modifiers.push('Non-Reasoning');
            formatted = formatted.replace(/-non-reasoning/g, '');
        }
        if (formatted.includes('-code')) {
            modifiers.push('Code');
            formatted = formatted.replace(/-code/g, '');
        }
        if (formatted.includes('-fast')) {
            modifiers.push('Fast');
            formatted = formatted.replace(/-fast/g, '');
        }

        // Format base name
        formatted = formatted
            .replace(/-mini/, ' Mini')
            .replace(/^beta$/, 'Beta')
            .split('-')
            .filter(part => part.length > 0)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        // Add modifiers
        if (modifiers.length > 0) {
            formatted += ` (${modifiers.join(', ')})`;
        }

        return `Grok ${formatted}`;
    }

    // Ollama models - handle colon-separated format like gemma3:4b
    if (formatted.includes(':')) {
        const [model, size] = formatted.split(':');
        const modelName = model.replace(/(\d+)/, ' $1').trim();
        const sizeFormatted = size.toUpperCase();
        return `${modelName.charAt(0).toUpperCase() + modelName.slice(1)} ${sizeFormatted}`;
    }

    // Handle llama models
    if (formatted.includes('llama')) {
        formatted = formatted
            .replace(/llama(\d+)/, 'Llama $1')
            .replace(/-/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        return formatted;
    }

    // Default: capitalize words and replace hyphens with spaces
    return formatted
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Gets a short display name for tooltips or compact views
 */
export function getShortModelName(modelName: string): string {
    const formatted = formatModelName(modelName);

    // Remove parenthetical additions for short version
    return formatted.replace(/\s*\([^)]*\)/g, '').trim();
}

