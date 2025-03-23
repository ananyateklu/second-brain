  async sendMessage(message: string, modelId: string, options ?: ModelOptions): Promise < AIResponse > {
    const model = this.getAvailableModels().find(m => m.id === modelId);
    if(!model) {
        throw new Error('Invalid model selected');
    }

    // Handle special categories first
    if(model.category === 'agent') {
    return this.agentService.sendMessage(message, modelId, options);
}
// Removed function category special handling
if (model.category === 'rag') {
    throw new Error('RAG models not implemented yet');
}

// Handle regular provider-specific routing
switch (model.provider) {
    case 'openai':
        return this.openai.sendMessage(message, modelId, options);
    case 'anthropic':
        return this.anthropic.sendMessage(message, modelId, options);
    case 'gemini':
        return this.gemini.sendMessage(message, modelId, options);
    case 'llama':
        return this.llama.sendMessage(message, modelId, options);
    case 'grok':
        return this.grokService.sendMessage(message, modelId, options);
    default:
        throw new Error('Unsupported AI provider');
}
  }

// Removed executeFunctionCall method

// ... rest of existing methods ... 