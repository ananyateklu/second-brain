from typing import Dict, Any
from .base_agent import BaseAgent
from .openai_agent import OpenAIAgent
from .anthropic_agent import AnthropicAgent
from .ollama_agent import OllamaAgent
import time

class ResearchAgent(BaseAgent):
    """Agent for conducting research and analysis using either OpenAI, Anthropic, or Ollama models"""
    
    def __init__(self, model_id: str, temperature: float = 0.7):
        super().__init__(model_id, temperature)
        # Select the appropriate agent based on model_id
        if model_id.startswith(('gpt-', 'text-davinci-')):
            self.agent = OpenAIAgent(model_id=model_id, temperature=temperature)
        elif model_id.startswith('claude'):
            self.agent = AnthropicAgent(model_id=model_id, temperature=temperature)
        else:  # Default to Ollama for other model IDs
            self.agent = OllamaAgent(model_id=model_id, temperature=temperature)
    
    def _get_base_agent_type(self) -> str:
        """Helper method to determine the base agent type"""
        if isinstance(self.agent, OpenAIAgent):
            return "openai"
        if isinstance(self.agent, AnthropicAgent):
            return "anthropic"
        return "ollama"
        
    async def execute(self, prompt: str, **kwargs) -> Dict[str, Any]:
        
        # Create a research-focused prompt
        research_prompt = f"""You are a research assistant. Your task is to:
        1. Analyze the given topic thoroughly
        2. Provide comprehensive key insights
        3. Support with relevant information and examples
        4. Draw meaningful conclusions
        
        Topic: {prompt}
        
        Please provide a well-structured, detailed response that demonstrates deep analysis and understanding."""
        
        # Use the underlying agent to generate the response
        result = await self.agent.execute(research_prompt, **kwargs)
        
        # Add research-specific metadata
        result["metadata"]["agent_type"] = "research"
        result["metadata"]["base_agent"] = self._get_base_agent_type()
        
        return result
    
    async def validate_response(self, response: Any) -> bool:
        # Delegate validation to the underlying agent
        return await self.agent.validate_response(response)