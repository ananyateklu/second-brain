from typing import Dict, Any, List
from .base_agent import BaseAgent
import google.generativeai as genai
from app.config.settings import settings
import time
import logging
import json

logger = logging.getLogger(__name__)

class GeminiAgent(BaseAgent):
    """Agent for conducting operations using Google's Gemini models"""
    
    def __init__(self, model_id: str, temperature: float = 0.7):
        super().__init__(model_id, temperature)
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(model_id)
        self.chat = None
        
    async def execute(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Execute the Gemini model"""
        try:
            start_time = time.time()
            
            # Use context-aware execution
            result = await self._execute_with_context(prompt, **kwargs)
            
            execution_time = time.time() - start_time
            
            # Add execution metadata
            if isinstance(result, dict) and "metadata" in result:
                result["metadata"].update({
                    "execution_time": execution_time,
                    "provider": "gemini"
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Error in Gemini execution: {str(e)}")
            raise
        
    async def _execute_model(self, kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the Gemini model with context awareness"""
        try:
            start_time = time.time()
            context = kwargs.get("context", {})
            messages = context.get("messages", [])
            
            logger.info(f"Executing Gemini model with {len(messages)} context messages")
            
            # Initialize chat session if needed
            if not self.chat:
                self.chat = self.model.start_chat(history=[])
            
            # Convert messages to Gemini format and add to history
            if messages:
                history = []
                for msg in messages:
                    # Convert role from assistant to model for Gemini
                    role = "model" if msg["role"] == "assistant" else msg["role"]
                    # Extract content from parts if present, otherwise use content directly
                    content = msg.get("parts", [{"text": msg["content"]}])[0]["text"]
                    
                    logger.info(f"Adding message to history - Role: {role}, Content: {content[:100]}...")
                    history.append({"role": role, "parts": [{"text": content}]})
                
                # Start new chat with history
                self.chat = self.model.start_chat(history=history)
                logger.info(f"Started new chat with {len(history)} historical messages")
            
            # Send the current prompt
            prompt = kwargs.get("prompt", "")
            logger.info(f"Sending prompt: {prompt[:100]}...")
            
            response = self.chat.send_message(
                prompt,
                generation_config={"temperature": self.temperature}
            )
            
            execution_time = time.time() - start_time
            
            # Extract token usage from response
            usage_metadata = getattr(response, "usage_metadata", None)
            token_usage = {
                "prompt_tokens": getattr(usage_metadata, "prompt_token_count", 0),
                "completion_tokens": getattr(usage_metadata, "candidates_token_count", 0),
                "total_tokens": getattr(usage_metadata, "total_token_count", 0)
            }
            
            # Extract content from response
            if hasattr(response, "text"):
                generated_content = response.text
            else:
                candidates = getattr(response, "candidates", [])
                if candidates and len(candidates) > 0:
                    content = candidates[0].content
                    if hasattr(content, "parts") and len(content.parts) > 0:
                        generated_content = content.parts[0].text
                    else:
                        generated_content = str(content)
                else:
                    raise ValueError("No valid content found in response")
            
            return {
                "result": generated_content,
                "metadata": {
                    "model": self.model_id,
                    "execution_time": execution_time,
                    "token_usage": token_usage,
                    "provider": "gemini",
                    "chat_history_length": len(self.chat.history) if self.chat else 0
                }
            }
            
        except Exception as e:
            logger.error(f"Error in Gemini model execution: {str(e)}")
            raise
            
    async def validate_response(self, response: Any) -> bool:
        """Validate the response from Gemini"""
        if not response or not isinstance(response, dict):
            return False
            
        required_fields = ["result", "metadata"]
        if not all(field in response for field in required_fields):
            return False
            
        # Check for Gemini-specific fields
        metadata = response.get("metadata", {})
        if not metadata.get("provider") == "gemini":
            logger.warning("Response missing Gemini provider tag")
            
        return True