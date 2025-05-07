import { AIModel } from '../../types/ai';
import { OPENAI_MODELS } from './openaiModels';
import { ANTHROPIC_MODELS } from './anthropicModels';
import { OLLAMA_MODELS } from './ollamaModels';
import { GEMINI_MODELS } from './geminiModels';
import { GROK_MODELS } from './grokModels';

export const AI_MODELS: AIModel[] = [
  ...OPENAI_MODELS,
  ...ANTHROPIC_MODELS,
  ...OLLAMA_MODELS,
  ...GEMINI_MODELS,
  ...GROK_MODELS,
];
