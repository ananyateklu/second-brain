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
            # Generate the response directly instead of using chat
            response = await self.model.generate_content_async(
                prompt,
                generation_config={
                    "temperature": self.temperature,
                    "candidate_count": 1,
                    "stop_sequences": None,
                    "max_output_tokens": 2048,
                }
            )
            
            execution_time = time.time() - start_time
            
            # Debug logging
            logger.debug(f"Response type: {type(response)}")
            logger.debug(f"Response dir: {dir(response)}")
            
            # Extract token usage if available
            token_usage = {
                'prompt_tokens': 0,
                'completion_tokens': 0,
                'total_tokens': 0
            }

            try:
                # Get prompt tokens from prompt parts
                if hasattr(response, 'prompt_feedback'):
                    logger.debug(f"Prompt feedback: {response.prompt_feedback}")
                    if hasattr(response.prompt_feedback, 'token_count'):
                        prompt_tokens = response.prompt_feedback.token_count
                        token_usage['prompt_tokens'] = prompt_tokens
                        logger.debug(f"Found prompt tokens: {prompt_tokens}")

                # Get completion tokens from response
                if hasattr(response, 'candidates') and response.candidates:
                    logger.debug(f"Response candidates: {response.candidates}")
                    candidate = response.candidates[0]
                    if hasattr(candidate, 'token_count'):
                        completion_tokens = candidate.token_count
                        token_usage['completion_tokens'] = completion_tokens
                        logger.debug(f"Found completion tokens: {completion_tokens}")
                    
                    # Calculate total tokens
                    token_usage['total_tokens'] = token_usage['prompt_tokens'] + token_usage['completion_tokens']

                # If we still don't have token counts, try estimating from text length
                if token_usage['total_tokens'] == 0:
                    # Rough estimation: 1 token ≈ 4 characters
                    prompt_chars = len(prompt)
                    response_chars = len(response.text)
                    token_usage.update({
                        'prompt_tokens': prompt_chars // 4,
                        'completion_tokens': response_chars // 4,
                        'total_tokens': (prompt_chars + response_chars) // 4
                    })
                    logger.debug(f"Estimated tokens from text length: {token_usage}")

            except Exception as e:
                logger.error(f"Error extracting token count: {str(e)}")
            
            logger.debug(f"Final token usage: {token_usage}")
            
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