from typing import Dict, Any
from .base_agent import BaseAgent
import google.generativeai as genai
from app.config.settings import settings
import time
import logging

logger = logging.getLogger(__name__)

class GeminiAgent(BaseAgent):
    """Agent for conducting operations using Google's Gemini models"""
    
    def __init__(self, model_id: str, temperature: float = 0.7):
        super().__init__(model_id, temperature)
        # Configure Gemini
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(model_id, generation_config={
            "temperature": temperature
        })
        
    async def execute(self, prompt: str, **kwargs) -> Dict[str, Any]:
        start_time = time.time()
        
        try:
            # Create a chat session
            chat = self.model.start_chat()
            
            # Generate the response
            response = await chat.send_message_async(prompt)
            
            execution_time = time.time() - start_time
            
            # Extract token usage if available
            token_usage = {}
            if hasattr(response, 'usage'):
                token_usage = {
                    'prompt_tokens': getattr(response.usage, 'prompt_token_count', 0),
                    'completion_tokens': getattr(response.usage, 'completion_token_count', 0),
                    'total_tokens': getattr(response.usage, 'total_token_count', 0)
                }
            
            return {
                "result": response.text,
                "metadata": {
                    "model": self.model_id,
                    "execution_time": execution_time,
                    "token_usage": token_usage,
                    "provider": "gemini",
                    "prompt": prompt,
                    "temperature": self.temperature
                }
            }
            
        except Exception as e:
            logger.error(f"Error executing Gemini model: {str(e)}")
            raise
    
    async def validate_response(self, response: Any) -> bool:
        """Validate the response from the Gemini model"""
        if not response or not isinstance(response, dict):
            return False
            
        required_fields = ["result", "metadata"]
        return all(field in response for field in required_fields) 