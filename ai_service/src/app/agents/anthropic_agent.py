from typing import Dict, Any
from .base_agent import BaseAgent
from langchain_anthropic import ChatAnthropic
from langchain.prompts import ChatPromptTemplate
from app.config.settings import settings
import time
import logging

logger = logging.getLogger(__name__)

class AnthropicAgent(BaseAgent):
    """Agent for conducting operations using Anthropic models"""
    
    def __init__(self, model_id: str, temperature: float = 0.7):
        super().__init__(model_id, temperature)
        self.chat_model = ChatAnthropic(
            model=model_id,
            temperature=temperature,
            anthropic_api_key=settings.ANTHROPIC_API_KEY,
            max_tokens=4096,
            streaming=False,
            model_kwargs={
                "system": "You are a helpful AI assistant that provides accurate and well-structured responses."
            }
        )
        
    async def execute(self, prompt: str, **kwargs) -> Dict[str, Any]:
        start_time = time.time()
        
        # Create a prompt template
        template = """You are an AI assistant. Your task is to:
        1. Analyze the given input
        2. Process the information
        3. Provide a well-structured response
        
        Input: {prompt}
        
        Provide your response:"""
        
        prompt_template = ChatPromptTemplate.from_template(template)
        
        try:
            # Generate the response
            messages = prompt_template.format_messages(prompt=prompt)
            logger.debug(f"Sending messages to Anthropic: {messages}")
            
            response = await self.chat_model.agenerate([messages])
            logger.debug(f"Raw response from Anthropic: {response}")
            
            execution_time = time.time() - start_time
            
            # Initialize default token usage
            usage = {
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "total_tokens": 0
            }
            
            # Try to extract token usage from the response
            if hasattr(response, 'llm_output') and response.llm_output:
                logger.debug(f"LLM output: {response.llm_output}")
                
                # Try to get token usage from different possible locations
                token_usage = (
                    response.llm_output.get("token_usage") or
                    response.llm_output.get("usage") or
                    {}
                )
                
                logger.debug(f"Extracted token usage: {token_usage}")
                
                if token_usage:
                    # Extract token counts with fallbacks
                    usage.update({
                        "prompt_tokens": token_usage.get("input_tokens", token_usage.get("prompt_tokens", 0)),
                        "completion_tokens": token_usage.get("output_tokens", token_usage.get("completion_tokens", 0)),
                        "total_tokens": token_usage.get("total_tokens", 0)
                    })
                    
                    # Calculate total if not provided
                    if not usage["total_tokens"] and usage["prompt_tokens"] and usage["completion_tokens"]:
                        usage["total_tokens"] = usage["prompt_tokens"] + usage["completion_tokens"]
                
                logger.info(f"Final token usage: {usage}")
            else:
                # Estimate token usage if not provided
                result_text = response.generations[0][0].text
                prompt_text = str(messages)
                usage.update({
                    "prompt_tokens": len(prompt_text.split()) * 2,  # Rough estimation
                    "completion_tokens": len(result_text.split()) * 2,  # Rough estimation
                })
                usage["total_tokens"] = usage["prompt_tokens"] + usage["completion_tokens"]
                logger.warning(f"No token usage information found in response. Using estimated values: {usage}")
            
            return {
                "result": response.generations[0][0].text,
                "metadata": {
                    "model": self.model_id,
                    "execution_time": execution_time,
                    "token_usage": usage,
                    "provider": "anthropic"
                }
            }
            
        except Exception as e:
            logger.error(f"Error executing Anthropic model: {str(e)}", exc_info=True)
            # Return a response with default token usage on error
            return {
                "result": f"Error: {str(e)}",
                "metadata": {
                    "model": self.model_id,
                    "execution_time": time.time() - start_time,
                    "token_usage": {
                        "prompt_tokens": 0,
                        "completion_tokens": 0,
                        "total_tokens": 0
                    },
                    "provider": "anthropic",
                    "error": str(e)
                }
            }
    
    async def validate_response(self, response: Any) -> bool:
        if not response or not isinstance(response, dict):
            return False
            
        required_fields = ["result", "metadata"]
        if not all(field in response for field in required_fields):
            return False
            
        metadata = response.get("metadata", {})
        if not isinstance(metadata, dict):
            return False
            
        # Validate token usage structure
        token_usage = metadata.get("token_usage", {})
        required_token_fields = ["prompt_tokens", "completion_tokens", "total_tokens"]
        if not all(field in token_usage for field in required_token_fields):
            logger.warning(f"Missing required token usage fields. Found: {token_usage}")
            return False
            
        return True