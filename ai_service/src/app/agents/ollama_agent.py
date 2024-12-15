from typing import Dict, Any
import aiohttp
from .base_agent import BaseAgent
from app.config.settings import settings
import time

class OllamaAPIError(Exception):
    """Raised when Ollama API returns an error response"""
    pass

class OllamaExecutionError(Exception):
    """Raised when there's an error executing the Ollama model"""
    pass

class OllamaAgent(BaseAgent):
    """Agent for interacting with local Ollama models"""
    
    def __init__(self, model_id: str, temperature: float = 0.7):
        super().__init__(model_id, temperature)
        self.base_url = settings.OLLAMA_BASE_URL
        
    async def execute(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Execute a prompt using an Ollama model"""
        start_time = time.time()
        
        async with aiohttp.ClientSession() as session:
            try:
                # Prepare the request payload
                payload = {
                    "model": self.model_id,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": self.temperature,
                    }
                }
                
                # Add max_tokens if provided
                if "max_tokens" in kwargs:
                    payload["options"]["num_predict"] = kwargs["max_tokens"]
                
                # Make the API call to Ollama
                async with session.post(f"{self.base_url}/api/generate", json=payload) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise OllamaAPIError(f"Ollama API error: {error_text}")
                    
                    result = await response.json()
                    
                    # Calculate execution time
                    execution_time = time.time() - start_time
                    
                    # Format the response
                    return {
                        "result": result["response"],
                        "metadata": {
                            "model": self.model_id,
                            "execution_time": execution_time,
                            "prompt": prompt,
                            "temperature": self.temperature,
                            "provider": "ollama"
                        }
                    }
                    
            except OllamaAPIError:
                raise
            except Exception as e:
                raise OllamaExecutionError(f"Failed to execute Ollama model: {str(e)}")
    
    async def validate_response(self, response: Any) -> bool:
        """Validate the response from the Ollama model"""
        if not response or not isinstance(response, dict):
            return False
        
        required_fields = ["result", "metadata"]
        return all(field in response for field in required_fields) 