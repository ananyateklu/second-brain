from typing import Dict, Type
from .base_agent import BaseAgent
from .openai_agent import OpenAIAgent
from .anthropic_agent import AnthropicAgent
from .ollama_agent import OllamaAgent

class AgentFactory:
    """Factory class for creating AI agents"""
    
    _agent_registry: Dict[str, Type[BaseAgent]] = {
        'openai': OpenAIAgent,
        'anthropic': AnthropicAgent,
        'ollama': OllamaAgent
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
        else:
            return cls._agent_registry['ollama'](model_id, temperature)
    
    @classmethod
    def get_registered_providers(cls) -> list[str]:
        """Get list of registered agent providers"""
        return list(cls._agent_registry.keys()) 