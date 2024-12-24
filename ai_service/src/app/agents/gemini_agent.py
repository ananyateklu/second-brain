from typing import Dict, Any, List
from .core.base_agent import BaseAgent
import google.generativeai as genai
from app.config.settings import settings
import time
import logging
import json

logger = logging.getLogger(__name__)

class GeminiAgent(BaseAgent):
    """Agent for conducting operations using Google's Gemini models"""
    
    def __init__(self, model_id: str, temperature: float = 0.7):
        """Initialize the Gemini agent"""
        # Initialize base agent first
        super().__init__(model_id)
        
        # Store temperature for Gemini-specific config
        self._temperature = temperature
        
        # Initialize Gemini-specific components
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(model_id)
        self.chat = None
        
    @property
    def temperature(self) -> float:
        """Get the temperature setting"""
        return self._temperature
        
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

    async def process_message(self, message: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Process a message with context"""
        try:
            kwargs = {"prompt": message, "context": context or {}}
            return await self._execute_model(kwargs)
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            raise
        
    async def _execute_model(self, kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the Gemini model with context awareness"""
        try:
            start_time = time.time()
            await self._setup_chat_session(kwargs)
            response = await self._send_prompt(kwargs)
            return self._format_response(response, start_time)
        except Exception as e:
            logger.error(f"Error in Gemini model execution: {str(e)}")
            raise

    async def _setup_chat_session(self, kwargs: Dict[str, Any]) -> None:
        """Setup chat session with history"""
        messages = kwargs.get("context", {}).get("messages", [])
        if not messages:
            return

        history = [self._convert_message_format(msg) for msg in messages]
        self.chat = self.model.start_chat(history=history)
        logger.info(f"Started new chat with {len(history)} historical messages")

    def _convert_message_format(self, msg: Dict[str, Any]) -> Dict[str, Any]:
        """Convert message format for Gemini"""
        role = "model" if msg["role"] == "assistant" else msg["role"]
        content = msg.get("parts", [{"text": msg["content"]}])[0]["text"]
        return {"role": role, "parts": [{"text": content}]}

    async def _send_prompt(self, kwargs: Dict[str, Any]) -> Any:
        """Send prompt to model"""
        if not self.chat:
            self.chat = self.model.start_chat(history=[])
        prompt = kwargs.get("prompt", "")
        return self.chat.send_message(
            prompt,
            generation_config={"temperature": self.temperature}
        )

    def _format_response(self, response: Any, start_time: float) -> Dict[str, Any]:
        """Format model response"""
        execution_time = time.time() - start_time
        token_usage = self._get_token_usage(response)
        generated_content = self._extract_content(response)

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

    async def validate_response(self, response: Any) -> bool:
        """Validate the response from Gemini"""
        if not response or not isinstance(response, dict):
            return False
            
        required_fields = ["result", "metadata"]
        if not all(field in response for field in required_fields):
            return False
            
        # Check for Gemini-specific fields
        metadata = response.get("metadata", {})
        if metadata.get("provider") != "gemini":
            logger.warning("Response missing Gemini provider tag")
            
        return True

    def _get_token_usage(self, response: Any) -> Dict[str, int]:
        """Extract token usage from response"""
        usage_metadata = getattr(response, "usage_metadata", None)
        return {
            "prompt_tokens": getattr(usage_metadata, "prompt_token_count", 0),
            "completion_tokens": getattr(usage_metadata, "candidates_token_count", 0),
            "total_tokens": getattr(usage_metadata, "total_token_count", 0)
        }

    def _extract_content(self, response: Any) -> str:
        """Extract content from response"""
        if hasattr(response, "text"):
            return response.text
            
        candidates = getattr(response, "candidates", [])
        if candidates and len(candidates) > 0:
            content = candidates[0].content
            if hasattr(content, "parts") and len(content.parts) > 0:
                return content.parts[0].text
            return str(content)
            
        raise ValueError("No valid content found in response")