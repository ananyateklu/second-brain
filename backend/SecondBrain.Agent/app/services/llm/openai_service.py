"""OpenAI LLM service implementation."""

import json
from typing import Any, Dict, List, Optional

import aiohttp
import structlog

from app.core.models import LLMRequest, LLMResponse, TokenUsage
from .base_llm_service import BaseLLMService

logger = structlog.get_logger(__name__)


class OpenAIService(BaseLLMService):
    """OpenAI LLM service implementation."""
    
    def __init__(self, api_key: str, base_url: Optional[str] = None):
        """Initialize OpenAI service."""
        super().__init__(
            provider_name="openai",
            api_key=api_key,
            base_url=base_url or "https://api.openai.com/v1"
        )
        
        self._available_models = [
            "gpt-4o",
            "gpt-4o-mini", 
            "gpt-4-turbo",
            "gpt-4",
            "gpt-3.5-turbo",
            "gpt-3.5-turbo-16k"
        ]
        
        self._model_limits = {
            "gpt-4o": {"max_tokens": 4096, "context_window": 128000},
            "gpt-4o-mini": {"max_tokens": 16384, "context_window": 128000},
            "gpt-4-turbo": {"max_tokens": 4096, "context_window": 128000},
            "gpt-4": {"max_tokens": 8192, "context_window": 8192},
            "gpt-3.5-turbo": {"max_tokens": 4096, "context_window": 16385},
            "gpt-3.5-turbo-16k": {"max_tokens": 4096, "context_window": 16385}
        }
    
    @property
    def default_models(self) -> List[str]:
        """Get default models for OpenAI."""
        return ["gpt-4o", "gpt-3.5-turbo"]
    
    @property
    def supported_agent_types(self) -> List[str]:
        """Get supported agent types for OpenAI."""
        return ["all"]  # OpenAI supports all agent types
    
    async def _generate_response_internal(self, request: LLMRequest) -> LLMResponse:
        """Generate response using OpenAI API."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # Prepare messages
        messages = []
        
        # Add system prompt if provided
        if request.system_prompt:
            messages.append({
                "role": "system",
                "content": request.system_prompt
            })
        
        # Add conversation history if provided
        if request.conversation_history:
            for entry in request.conversation_history:
                messages.append({
                    "role": entry.get("role", "user"),
                    "content": entry.get("content", "")
                })
        
        # Add current prompt
        messages.append({
            "role": "user", 
            "content": request.prompt
        })
        
        # Prepare request payload
        payload = {
            "model": request.model,
            "messages": messages,
            "temperature": request.temperature or 0.7,
            "max_tokens": request.max_tokens or self._get_model_config(request.model).get("max_tokens", 4096)
        }
        
        # Add optional parameters
        if request.top_p is not None:
            payload["top_p"] = request.top_p
        if request.frequency_penalty is not None:
            payload["frequency_penalty"] = request.frequency_penalty
        if request.presence_penalty is not None:
            payload["presence_penalty"] = request.presence_penalty
        
        # Add tools if provided
        if request.tools:
            formatted_tools = self._format_tools_for_openai(request.tools)
            if formatted_tools:
                payload["tools"] = formatted_tools
                payload["tool_choice"] = "auto"
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=120)
                ) as response:
                    
                    if response.status != 200:
                        error_text = await response.text()
                        raise Exception(f"OpenAI API error {response.status}: {error_text}")
                    
                    result = await response.json()
                    
                    # Extract response content
                    choice = result["choices"][0]
                    content = choice["message"]["content"]
                    
                    # Handle tool calls if present
                    tool_calls = choice["message"].get("tool_calls", [])
                    if tool_calls:
                        content = self._format_tool_calls_response(content, tool_calls)
                    
                    # Extract token usage
                    usage = result.get("usage", {})
                    token_usage = TokenUsage(
                        prompt_tokens=usage.get("prompt_tokens", 0),
                        completion_tokens=usage.get("completion_tokens", 0),
                        total_tokens=usage.get("total_tokens", 0)
                    )
                    
                    return LLMResponse(
                        content=content,
                        metadata={
                            "model": request.model,
                            "finish_reason": choice.get("finish_reason"),
                            "tool_calls": tool_calls,
                            "usage": usage
                        },
                        token_usage=token_usage,
                        model=request.model,
                        provider=self.provider_name,
                        execution_time=0,  # Will be set by base class
                        success=True
                    )
                    
            except Exception as e:
                logger.error("OpenAI API request failed",
                            error=str(e),
                            model=request.model,
                            prompt_length=len(request.prompt))
                return await self._handle_provider_error(e, request)
    
    def _format_tools_for_openai(self, tools: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format tools for OpenAI function calling."""
        formatted_tools = []
        
        for tool in tools:
            if isinstance(tool, dict) and "name" in tool:
                formatted_tool = {
                    "type": "function",
                    "function": {
                        "name": tool["name"],
                        "description": tool.get("description", ""),
                        "parameters": tool.get("parameters", {
                            "type": "object",
                            "properties": {},
                            "required": []
                        })
                    }
                }
                formatted_tools.append(formatted_tool)
        
        return formatted_tools
    
    def _format_tool_calls_response(self, content: str, tool_calls: List[Dict[str, Any]]) -> str:
        """Format response when tool calls are present."""
        if not tool_calls:
            return content
        
        response_parts = []
        if content:
            response_parts.append(content)
        
        response_parts.append("\n**Tool Calls:**")
        for tool_call in tool_calls:
            function = tool_call.get("function", {})
            name = function.get("name", "unknown")
            arguments = function.get("arguments", "{}")
            
            try:
                args_dict = json.loads(arguments)
                args_str = json.dumps(args_dict, indent=2)
            except json.JSONDecodeError:
                args_str = arguments
            
            response_parts.append(f"\n- **{name}**:")
            response_parts.append(f"  ```json\n  {args_str}\n  ```")
        
        return "\n".join(response_parts)
    
    async def _check_rate_limits(self, model: str) -> None:
        """Check OpenAI rate limits."""
        # OpenAI handles rate limiting on their end
        # Could implement client-side rate limiting here if needed
        pass