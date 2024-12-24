from typing import Dict, Any
from .base_agent import BaseAgent
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from app.config.settings import settings
import time

class OpenAIAgent(BaseAgent):
    """Agent for conducting research and analysis using OpenAI models"""
    
    def __init__(self, model_id: str, temperature: float = 0.7):
        super().__init__(model_id, temperature)
        self.chat_model = ChatOpenAI(
            model=model_id,
            temperature=temperature,
            openai_api_key=settings.OPENAI_API_KEY
        )
        
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
        messages = kwargs.get("messages", [])
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
                "token_usage": response.usage.dict() if response.usage else None
            }
        } 