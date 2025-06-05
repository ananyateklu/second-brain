"""Anthropic LLM service implementation."""

import json
from typing import Any, Dict, List, Optional

import aiohttp
import structlog

from app.core.models import LLMRequest, LLMResponse, TokenUsage
from .base_llm_service import BaseLLMService

logger = structlog.get_logger(__name__)


class AnthropicService(BaseLLMService):
    """Anthropic LLM service implementation."""
    
    def __init__(self, api_key: str, base_url: Optional[str] = None):
        """Initialize Anthropic service."""
        super().__init__(
            provider_name="anthropic",
            api_key=api_key,
            base_url=base_url or "https://api.anthropic.com"
        )
        
        self._available_models = [
            "claude-3-5-sonnet-20241022",
            "claude-3-5-haiku-20241022", 
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307"
        ]
        
        self._model_limits = {
            "claude-3-5-sonnet-20241022": {"max_tokens": 8192, "context_window": 200000},
            "claude-3-5-haiku-20241022": {"max_tokens": 8192, "context_window": 200000},
            "claude-3-opus-20240229": {"max_tokens": 4096, "context_window": 200000},
            "claude-3-sonnet-20240229": {"max_tokens": 4096, "context_window": 200000},
            "claude-3-haiku-20240307": {"max_tokens": 4096, "context_window": 200000}
        }
    
    @property
    def default_models(self) -> List[str]:
        """Get default models for Anthropic."""
        return ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"]
    
    @property
    def supported_agent_types(self) -> List[str]:
        """Get supported agent types for Anthropic."""
        return ["all"]  # Anthropic supports all agent types
    
    async def _generate_response_internal(self, request: LLMRequest) -> LLMResponse:
        """Generate response using Anthropic API."""
        headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
        }
        
        # Prepare messages
        messages = []
        
        # Add conversation history if provided
        if request.conversation_history:
            for entry in request.conversation_history:
                role = entry.get("role", "user")
                # Anthropic uses "assistant" instead of "assistant"
                if role == "assistant":
                    role = "assistant"
                elif role == "system":
                    # System messages are handled separately in Anthropic
                    continue
                    
                messages.append({
                    "role": role,
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
            "max_tokens": request.max_tokens or self._get_model_config(request.model).get("max_tokens", 4096),
            "temperature": request.temperature or 0.7
        }
        
        # Add system prompt if provided
        if request.system_prompt:
            payload["system"] = request.system_prompt
        
        # Add optional parameters
        if request.top_p is not None:
            payload["top_p"] = request.top_p
        
        # Add tools if provided
        if request.tools:
            formatted_tools = self._format_tools_for_anthropic(request.tools)
            if formatted_tools:
                payload["tools"] = formatted_tools
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(
                    f"{self.base_url}/v1/messages",
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=120)
                ) as response:
                    
                    if response.status != 200:
                        error_text = await response.text()
                        raise Exception(f"Anthropic API error {response.status}: {error_text}")
                    
                    result = await response.json()
                    
                    # Extract response content
                    content = ""
                    tool_uses = []
                    
                    for content_block in result.get("content", []):
                        if content_block.get("type") == "text":
                            content += content_block.get("text", "")
                        elif content_block.get("type") == "tool_use":
                            tool_uses.append(content_block)
                    
                    # Handle tool uses if present
                    if tool_uses:
                        content = self._format_tool_uses_response(content, tool_uses)
                    
                    # Extract token usage
                    usage = result.get("usage", {})
                    token_usage = TokenUsage(
                        prompt_tokens=usage.get("input_tokens", 0),
                        completion_tokens=usage.get("output_tokens", 0),
                        total_tokens=usage.get("input_tokens", 0) + usage.get("output_tokens", 0)
                    )
                    
                    return LLMResponse(
                        content=content,
                        metadata={
                            "model": request.model,
                            "stop_reason": result.get("stop_reason"),
                            "tool_uses": tool_uses,
                            "usage": usage
                        },
                        token_usage=token_usage,
                        model=request.model,
                        provider=self.provider_name,
                        execution_time=0,  # Will be set by base class
                        success=True
                    )
                    
            except Exception as e:
                logger.error("Anthropic API request failed",
                            error=str(e),
                            model=request.model,
                            prompt_length=len(request.prompt))
                return await self._handle_provider_error(e, request)
    
    def _format_tools_for_anthropic(self, tools: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format tools for Anthropic function calling."""
        formatted_tools = []
        
        for tool in tools:
            if isinstance(tool, dict) and "name" in tool:
                formatted_tool = {
                    "name": tool["name"],
                    "description": tool.get("description", ""),
                    "input_schema": tool.get("parameters", {
                        "type": "object",
                        "properties": {},
                        "required": []
                    })
                }
                formatted_tools.append(formatted_tool)
        
        return formatted_tools
    
    def _format_tool_uses_response(self, content: str, tool_uses: List[Dict[str, Any]]) -> str:
        """Format response when tool uses are present."""
        if not tool_uses:
            return content
        
        response_parts = []
        if content:
            response_parts.append(content)
        
        response_parts.append("\n**Tool Uses:**")
        for tool_use in tool_uses:
            name = tool_use.get("name", "unknown")
            input_data = tool_use.get("input", {})
            
            response_parts.append(f"\n- **{name}**:")
            if input_data:
                input_str = json.dumps(input_data, indent=2)
                response_parts.append(f"  ```json\n  {input_str}\n  ```")
        
        return "\n".join(response_parts)
    
    async def _check_rate_limits(self, model: str) -> None:
        """Check Anthropic rate limits."""
        # Anthropic handles rate limiting on their end
        # Could implement client-side rate limiting here if needed
        pass