from typing import Dict, Any, Optional
from abc import ABC, abstractmethod

class BaseAgent(ABC):
    """Base class for all AI agents"""
    
    def __init__(self, model_id: str, temperature: float = 0.7):
        self.model_id = model_id
        self.temperature = temperature
        
    @abstractmethod
    async def execute(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Execute the agent's task"""
        pass
    
    @abstractmethod
    async def validate_response(self, response: Any) -> bool:
        """Validate the agent's response"""
        pass 