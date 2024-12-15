from typing import Dict, Type
from .base_agent import BaseAgent
from .openai_agent import OpenAIAgent
from .anthropic_agent import AnthropicAgent
from .ollama_agent import OllamaAgent
from .gemini_agent import GeminiAgent
from .grok_agent import GrokAgent

class AgentFactory:
    """Factory class for creating AI agents"""
    
    _agent_registry: Dict[str, Type[BaseAgent]] = {
        'openai': OpenAIAgent,
        'anthropic': AnthropicAgent,
        'ollama': OllamaAgent,
        'gemini': GeminiAgent,
        'grok': GrokAgent
    }
    
    @classmethod
    def register_agent(cls, provider: str, agent_class: Type[BaseAgent]) -> None:
        """Register a new agent type"""
        cls._agent_registry[provider] = agent_class
    
    @classmethod
    def create_agent(cls, model_id: str, temperature: float = 0.7) -> BaseAgent:
        """Create an agent instance based on the model ID"""
        if model_id.startswith(('gpt-', 'text-davinci-')):
            return cls._agent_registry['openai'](model_id, temperature)
        elif model_id.startswith('claude'):
            return cls._agent_registry['anthropic'](model_id, temperature)
        elif model_id.startswith('gemini-'):
            return cls._agent_registry['gemini'](model_id, temperature)
        elif model_id.startswith('grok-'):
            return cls._agent_registry['grok'](model_id, temperature)
        else:
            return cls._agent_registry['ollama'](model_id, temperature)
    
    @classmethod
    def get_registered_providers(cls) -> list[str]:
        """Get list of registered agent providers"""
        return list(cls._agent_registry.keys()) 