"""Grok (X.AI) LLM service implementation."""

import json
from typing import Any, Dict, List, Optional

import aiohttp
import structlog

from app.core.models import LLMRequest, LLMResponse, TokenUsage
from .base_llm_service import BaseLLMService

logger = structlog.get_logger(__name__)


class GrokService(BaseLLMService):
    """Grok (X.AI) LLM service implementation."""
    
    def __init__(self, api_key: str, base_url: Optional[str] = None):
        """Initialize Grok service."""
        super().__init__(
            provider_name="grok",
            api_key=api_key,
            base_url=base_url or "https://api.x.ai/v1"
        )
        
        self._available_models = [
            "grok-3",
            "grok-3-latest",
            "grok-3-fast",
            "grok-3-fast-latest",
            "grok-3-mini",
            "grok-3-mini-latest",
            "grok-3-mini-fast",
            "grok-3-mini-fast-latest",
            "grok-2-vision-1212",
            "grok-2-vision",
            "grok-2-vision-latest",
            "grok-2-image-1212",
            "grok-2-image",
            "grok-2-image-latest",
            "grok-2-1212"
        ]
        
        self._model_limits = {
            "grok-3": {"max_tokens": 8192, "context_window": 131072},
            "grok-3-latest": {"max_tokens": 8192, "context_window": 131072},
            "grok-3-fast": {"max_tokens": 8192, "context_window": 131072},
            "grok-3-fast-latest": {"max_tokens": 8192, "context_window": 131072},
            "grok-3-mini": {"max_tokens": 8192, "context_window": 131072},
            "grok-3-mini-latest": {"max_tokens": 8192, "context_window": 131072},
            "grok-3-mini-fast": {"max_tokens": 8192, "context_window": 131072},
            "grok-3-mini-fast-latest": {"max_tokens": 8192, "context_window": 131072},
            "grok-2-vision-1212": {"max_tokens": 8192, "context_window": 32768},
            "grok-2-vision": {"max_tokens": 8192, "context_window": 32768},
            "grok-2-vision-latest": {"max_tokens": 8192, "context_window": 32768},
            "grok-2-image-1212": {"max_tokens": 8192, "context_window": 131072},
            "grok-2-image": {"max_tokens": 8192, "context_window": 131072},
            "grok-2-image-latest": {"max_tokens": 8192, "context_window": 131072},
            "grok-2-1212": {"max_tokens": 8192, "context_window": 131072}
        }
        
        self._api_version = "2024-03"
    
    @property
    def default_models(self) -> List[str]:
        """Get default models for Grok."""
        return ["grok-beta"]
    
    @property
    def supported_agent_types(self) -> List[str]:
        """Get supported agent types for Grok."""
        return ["all"]  # Grok supports all agent types
    
    async def _generate_response_internal(self, request: LLMRequest) -> LLMResponse:
        """Generate response using Grok API."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-API-Version": self._api_version
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
            "max_tokens": request.max_tokens or self._get_model_config(request.model).get("max_tokens", 4096),
            "stream": False  # Start with non-streaming for simplicity
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
            formatted_tools = self._format_tools_for_grok(request.tools)
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
                        raise Exception(f"Grok API error {response.status}: {error_text}")
                    
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
                            "usage": usage,
                            "api_version": self._api_version
                        },
                        token_usage=token_usage,
                        model=request.model,
                        provider=self.provider_name,
                        execution_time=0,  # Will be set by base class
                        success=True
                    )
                    
            except Exception as e:
                logger.error("Grok API request failed",
                            error=str(e),
                            model=request.model,
                            prompt_length=len(request.prompt))
                return await self._handle_provider_error(e, request)
    
    def _format_tools_for_grok(self, tools: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format tools for Grok function calling (OpenAI-compatible)."""
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
        """Check Grok rate limits."""
        # Grok handles rate limiting on their end
        # Could implement client-side rate limiting here if needed
        pass
    
    async def _handle_provider_error(self, error: Exception, request: LLMRequest) -> LLMResponse:
        """Handle Grok-specific errors."""
        error_message = str(error)
        
        # Grok-specific error handling
        if "invalid_api_key" in error_message.lower():
            error_message = "Invalid Grok API key. Please check your X.AI API key."
        elif "insufficient_quota" in error_message.lower():
            error_message = "Grok API quota exceeded. Please check your X.AI usage limits."
        elif "model_not_found" in error_message.lower():
            error_message = f"Grok model '{request.model}' not found. Available models: {self.get_available_models()}"
        elif "rate_limit" in error_message.lower():
            error_message = "Grok rate limit exceeded. Please try again later."
        elif "timeout" in error_message.lower():
            error_message = "Grok request timed out. Please try again."
        
        return LLMResponse(
            content=f"Grok Error: {error_message}",
            metadata={
                "provider": self.provider_name,
                "error": str(error),
                "error_type": type(error).__name__,
                "success": False
            },
            model=request.model,
            provider=self.provider_name,
            execution_time=0,
            success=False
        )