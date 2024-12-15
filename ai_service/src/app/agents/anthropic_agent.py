from typing import Dict, Any
from .base_agent import BaseAgent
from langchain_anthropic import ChatAnthropic
from langchain.prompts import ChatPromptTemplate
from app.config.settings import settings
import time

class AnthropicAgent(BaseAgent):
    """Agent for conducting operations using Anthropic models"""
    
    def __init__(self, model_id: str, temperature: float = 0.7):
        super().__init__(model_id, temperature)
        self.chat_model = ChatAnthropic(
            model=model_id,
            temperature=temperature,
            anthropic_api_key=settings.ANTHROPIC_API_KEY
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
        
        # Generate the response
        messages = prompt_template.format_messages(prompt=prompt)
        response = await self.chat_model.agenerate([messages])
        
        execution_time = time.time() - start_time
        
        return {
            "result": response.generations[0][0].text,
            "metadata": {
                "model": self.model_id,
                "execution_time": execution_time,
                "tokens_used": response.llm_output.get("token_usage", {}).get("total_tokens", 0)
            }
        }
    
    async def validate_response(self, response: Any) -> bool:
        # Add validation logic here
        return True 