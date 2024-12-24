from typing import Dict, Any, Optional
from .core.base_agent import BaseAgent
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from app.config.settings import settings
import time
import json
import logging
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

class OpenAIAgent(BaseAgent):
    """Agent for conducting research and analysis using OpenAI models"""
    
    def __init__(self, model_id: str, temperature: float = 0.7):
        super().__init__(model_id, temperature)
        self._temperature = temperature
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.chat_model = ChatOpenAI(
            model=model_id,
            temperature=temperature,
            openai_api_key=settings.OPENAI_API_KEY
        )
        
    @property
    def temperature(self) -> float:
        """Get the temperature setting"""
        return self._temperature

    async def execute(self, prompt: str, **kwargs) -> Dict[str, Any]:
        start_time = time.time()
        
        # Create a research-focused prompt
        template = """You are a research assistant. Your task is to:
        1. Analyze the given topic
        2. Provide key insights
        3. Support with relevant information
        
        Topic: {prompt}
        
        Provide a well-structured response."""
        
        prompt_template = ChatPromptTemplate.from_template(template)
        
        # Generate the response
        messages = prompt_template.format_messages(prompt=prompt)
        response = await self.chat_model.agenerate([messages])
        
        execution_time = time.time() - start_time
        
        # Extract token usage
        token_usage = response.llm_output.get("token_usage", {})
        usage = {
            "prompt_tokens": token_usage.get("prompt_tokens", 0),
            "completion_tokens": token_usage.get("completion_tokens", 0),
            "total_tokens": token_usage.get("total_tokens", 0)
        }
        
        return {
            "result": response.generations[0][0].text,
            "metadata": {
                "model": self.model_id,
                "execution_time": execution_time,
                "token_usage": usage,
                "provider": "openai"
            }
        }
    
    async def validate_response(self, response: Any) -> bool:
        # Add validation logic here
        return True 

    async def _execute_model(self, kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the OpenAI model with given parameters"""
        try:
            messages = kwargs.get("context", {}).get("messages", [])
            if not messages:
                # Convert single prompt to messages format
                messages = [{"role": "user", "content": kwargs["prompt"]}]
            
            response = await self.client.chat.completions.create(
                model=self.model_id,
                messages=messages,
                temperature=self.temperature
            )
            
            return {
                "result": response.choices[0].message.content,
                "metadata": {
                    "model": self.model_id,
                    "provider": "openai",
                    "token_usage": {
                        "prompt_tokens": response.usage.prompt_tokens,
                        "completion_tokens": response.usage.completion_tokens,
                        "total_tokens": response.usage.total_tokens
                    }
                }
            }
        except Exception as e:
            logger.error(f"Error executing OpenAI model: {str(e)}")
            raise

    async def process_message(
        self,
        message: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Process a user message and generate a response"""
        try:
            # Add message to conversation memory before processing
            self.conversation_memory.add_message(message, "user", metadata)
            
            # Get conversation history
            history = self.conversation_memory.get_history()
            
            # Format conversation history for OpenAI
            formatted_messages = []
            
            # Add system message
            formatted_messages.append({
                "role": "system",
                "content": (
                    "You are a helpful AI assistant that provides accurate "
                    "and well-structured responses. Maintain context of the conversation "
                    "and refer back to previous messages when relevant."
                )
            })
            
            # Add conversation history
            for msg in history:
                role = "user" if msg['role'] == "user" else "assistant"
                formatted_messages.append({
                    "role": role,
                    "content": msg['content']
                })
            
            logger.info(f"Conversation history: {json.dumps(formatted_messages, indent=2)}")
            
            # Execute with context
            result = await self._execute_model(
                {
                    "prompt": message,
                    "context": {
                        "messages": formatted_messages,
                        "metadata": metadata or {}
                    }
                }
            )
            
            # Add response to conversation memory after processing
            if isinstance(result, dict) and "result" in result:
                self.conversation_memory.add_message(
                    result["result"],
                    "assistant",
                    result.get("metadata")
                )
                logger.info("Added response to conversation memory")
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            raise 