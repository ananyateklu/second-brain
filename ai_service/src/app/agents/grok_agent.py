from typing import Dict, Any
from .base_agent import BaseAgent
import requests
from app.config.settings import settings
import time
import logging
import json
import aiohttp

logger = logging.getLogger(__name__)

class GrokAgent(BaseAgent):
    """Agent for conducting operations using Grok models"""
    
    def __init__(self, model_id: str, temperature: float = 0.7):
        super().__init__(model_id, temperature)
        self.api_base = settings.GROK_API_BASE
        self.api_key = settings.GROK_API_KEY
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-API-Version": "2024-03"  # Add API version header
        }
        
    async def execute(self, prompt: str, **kwargs) -> Dict[str, Any]:
        start_time = time.time()
        
        try:
            # Prepare the request payload
            payload = {
                "model": self.model_id,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": self.temperature,
                "max_tokens": kwargs.get("max_tokens", 1000),
                "stream": False
            }
            
            # Use aiohttp for async HTTP requests
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.api_base}/chat/completions",
                    headers=self.headers,
                    json=payload,
                    timeout=30
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Grok API error: {response.status} - {error_text}")
                        raise Exception(f"Grok API returned status {response.status}: {error_text}")
                    
                    result = await response.json()
            
            execution_time = time.time() - start_time
            
            # Extract token usage
            token_usage = result.get("usage", {})
            
            # Extract the response content
            try:
                content = result["choices"][0]["message"]["content"]
            except (KeyError, IndexError) as e:
                logger.error(f"Error extracting content from Grok response: {str(e)}")
                logger.debug(f"Response structure: {json.dumps(result, indent=2)}")
                raise Exception("Invalid response format from Grok API")
            
            return {
                "result": content,
                "metadata": {
                    "model": self.model_id,
                    "execution_time": execution_time,
                    "token_usage": token_usage,
                    "provider": "grok",
                    "prompt": prompt,
                    "temperature": self.temperature,
                    "response_id": result.get("id"),
                    "created": result.get("created")
                }
            }
            
        except aiohttp.ClientError as e:
            logger.error(f"Network error when calling Grok API: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error executing Grok model: {str(e)}")
            raise
    
    async def validate_response(self, response: Any) -> bool:
        """Validate the response from the Grok model"""
        if not response or not isinstance(response, dict):
            return False
            
        required_fields = ["result", "metadata"]
        if not all(field in response for field in required_fields):
            return False
            
        # Additional validation for Grok-specific fields
        metadata = response.get("metadata", {})
        if not metadata.get("response_id"):
            logger.warning("Response missing Grok response ID")
            
        return True