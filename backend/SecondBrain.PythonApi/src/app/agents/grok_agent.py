from typing import Dict, Any, Optional, List
from .core.base_agent import BaseAgent
import requests
from app.config.settings import settings
import time
import logging
import json
import aiohttp

logger = logging.getLogger(__name__)

class GrokAPIError(Exception):
    """Custom exception for Grok API related errors"""
    pass

class GrokAgent(BaseAgent):
    """Agent for conducting operations using Grok models"""
    
    def __init__(self, model_id: str, temperature: float = 0.7):
        super().__init__(model_id)
        self._temperature = temperature
        self.api_base = settings.GROK_API_BASE
        self.api_key = settings.GROK_API_KEY
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-API-Version": "2024-03"  # Add API version header
        }
        
    @property
    def temperature(self) -> float:
        """Get the temperature setting"""
        return self._temperature
        
    async def _execute_model(self, kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the Grok model with given parameters"""
        try:
            # Extract prompt and context from kwargs
            prompt = kwargs.get("prompt", "")
            context = kwargs.get("context", {})
            max_tokens = kwargs.get("max_tokens", 1000)
            
            # Format conversation history into messages
            messages = []
            if "conversation" in context:
                # Split conversation into turns
                conversation = context["conversation"].split("\n")
                for line in conversation:
                    if line.startswith("User: "):
                        messages.append({
                            "role": "user",
                            "content": line[6:]  # Remove "User: " prefix
                        })
                    elif line.startswith("Assistant: "):
                        messages.append({
                            "role": "assistant",
                            "content": line[11:]  # Remove "Assistant: " prefix
                        })
            
            # Add current prompt as the latest user message
            messages.append({
                "role": "user",
                "content": prompt
            })
            
            # Add system message if none exists
            if not any(msg.get("role") == "system" for msg in messages):
                messages.insert(0, {
                    "role": "system",
                    "content": "You are a helpful AI assistant that provides accurate and well-structured responses."
                })
            
            # Prepare the request payload
            payload = {
                "model": self.model_id,
                "messages": messages,
                "temperature": self.temperature,
                "max_tokens": max_tokens,
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
                        raise GrokAPIError(f"Grok API returned status {response.status}: {error_text}")
                    
                    result = await response.json()
            
            # Extract the response content
            try:
                content = result["choices"][0]["message"]["content"]
            except (KeyError, IndexError) as e:
                logger.error(f"Error extracting content from Grok response: {str(e)}")
                logger.debug(f"Response structure: {json.dumps(result, indent=2)}")
                raise GrokAPIError("Invalid response format from Grok API")
            
            # Extract token usage
            token_usage = result.get("usage", {})
            
            return {
                "result": content,
                "metadata": {
                    "model": self.model_id,
                    "execution_time": time.time() - kwargs.get("start_time", time.time()),
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
    
    async def process_message(
        self,
        message: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Process a user message and generate a response"""
        try:
            # Add message to conversation memory
            self.conversation_memory.add_message(message, "user", metadata)
            
            # Get conversation history
            history = self.conversation_memory.get_history()
            
            # Format conversation history
            conversation = "\n".join([
                f"{msg['role'].capitalize()}: {msg['content']}"
                for msg in history
            ])
            
            # Execute model with context
            result = await self.execute(
                message, 
                context={
                    "conversation": conversation,
                    "metadata": metadata or {}
                }
            )
            
            # Add response to conversation memory
            if isinstance(result, dict) and "result" in result:
                self.conversation_memory.add_message(
                    result["result"],
                    "assistant",
                    result.get("metadata")
                )
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            raise

    def get_conversation_history(self) -> List[Dict[str, Any]]:
        """Get formatted conversation history"""
        history = self.conversation_memory.get_history()
        return [
            {
                "role": msg["role"],
                "content": msg["content"]
            }
            for msg in history
        ]