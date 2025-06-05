"""Google Gemini LLM service implementation."""

import json
from typing import Any, Dict, List, Optional

import aiohttp
import structlog

from app.core.models import LLMRequest, LLMResponse, TokenUsage
from .base_llm_service import BaseLLMService

logger = structlog.get_logger(__name__)


class GeminiService(BaseLLMService):
    """Google Gemini LLM service implementation."""
    
    def __init__(self, api_key: str, base_url: Optional[str] = None):
        """Initialize Gemini service."""
        super().__init__(
            provider_name="gemini",
            api_key=api_key,
            base_url=base_url or "https://generativelanguage.googleapis.com"
        )
        
        self._available_models = [
            "gemini-1.5-pro-latest",
            "gemini-1.5-pro",
            "gemini-1.5-flash",
            "gemini-1.0-pro"
        ]
        
        self._model_limits = {
            "gemini-1.5-pro-latest": {"max_tokens": 8192, "context_window": 2000000},
            "gemini-1.5-pro": {"max_tokens": 8192, "context_window": 2000000},
            "gemini-1.5-flash": {"max_tokens": 8192, "context_window": 1000000},
            "gemini-1.0-pro": {"max_tokens": 2048, "context_window": 30720}
        }
    
    @property
    def default_models(self) -> List[str]:
        """Get default models for Gemini."""
        return ["gemini-1.5-pro", "gemini-1.5-flash"]
    
    @property
    def supported_agent_types(self) -> List[str]:
        """Get supported agent types for Gemini."""
        return ["all"]  # Gemini supports all agent types
    
    async def _generate_response_internal(self, request: LLMRequest) -> LLMResponse:
        """Generate response using Gemini API."""
        # Prepare the request payload
        contents = []
        
        # Add conversation history if provided
        if request.conversation_history:
            for entry in request.conversation_history:
                role = entry.get("role", "user")
                # Gemini uses "user" and "model" roles
                if role == "assistant":
                    role = "model"
                elif role == "system":
                    # System messages are added as user messages in Gemini
                    role = "user"
                    
                contents.append({
                    "role": role,
                    "parts": [{"text": entry.get("content", "")}]
                })
        
        # Add system prompt as user message if provided
        if request.system_prompt:
            contents.append({
                "role": "user",
                "parts": [{"text": f"System: {request.system_prompt}"}]
            })
        
        # Add current prompt
        contents.append({
            "role": "user",
            "parts": [{"text": request.prompt}]
        })
        
        # Prepare generation config
        generation_config = {
            "temperature": request.temperature or 0.7,
            "maxOutputTokens": request.max_tokens or self._get_model_config(request.model).get("max_tokens", 2048)
        }
        
        if request.top_p is not None:
            generation_config["topP"] = request.top_p
        
        payload = {
            "contents": contents,
            "generationConfig": generation_config
        }
        
        # Add tools if provided
        if request.tools:
            formatted_tools = self._format_tools_for_gemini(request.tools)
            if formatted_tools:
                payload["tools"] = [{"functionDeclarations": formatted_tools}]
        
        # Build URL with API key
        url = f"{self.base_url}/v1beta/models/{request.model}:generateContent?key={self.api_key}"
        
        headers = {
            "Content-Type": "application/json"
        }
        
        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(
                    url,
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=120)
                ) as response:
                    
                    if response.status != 200:
                        error_text = await response.text()
                        raise Exception(f"Gemini API error {response.status}: {error_text}")
                    
                    result = await response.json()
                    
                    # Extract response content
                    candidates = result.get("candidates", [])
                    if not candidates:
                        raise Exception("No candidates returned from Gemini API")
                    
                    candidate = candidates[0]
                    content_parts = candidate.get("content", {}).get("parts", [])
                    
                    content = ""
                    function_calls = []
                    
                    for part in content_parts:
                        if "text" in part:
                            content += part["text"]
                        elif "functionCall" in part:
                            function_calls.append(part["functionCall"])
                    
                    # Handle function calls if present
                    if function_calls:
                        content = self._format_function_calls_response(content, function_calls)
                    
                    # Extract token usage (if available)
                    usage_metadata = result.get("usageMetadata", {})
                    token_usage = TokenUsage(
                        prompt_tokens=usage_metadata.get("promptTokenCount", 0),
                        completion_tokens=usage_metadata.get("candidatesTokenCount", 0),
                        total_tokens=usage_metadata.get("totalTokenCount", 0)
                    )
                    
                    return LLMResponse(
                        content=content,
                        metadata={
                            "model": request.model,
                            "finish_reason": candidate.get("finishReason"),
                            "function_calls": function_calls,
                            "usage": usage_metadata,
                            "safety_ratings": candidate.get("safetyRatings", [])
                        },
                        token_usage=token_usage,
                        model=request.model,
                        provider=self.provider_name,
                        execution_time=0,  # Will be set by base class
                        success=True
                    )
                    
            except Exception as e:
                logger.error("Gemini API request failed",
                            error=str(e),
                            model=request.model,
                            prompt_length=len(request.prompt))
                return await self._handle_provider_error(e, request)
    
    def _format_tools_for_gemini(self, tools: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format tools for Gemini function calling."""
        formatted_tools = []
        
        for tool in tools:
            if isinstance(tool, dict) and "name" in tool:
                formatted_tool = {
                    "name": tool["name"],
                    "description": tool.get("description", ""),
                    "parameters": tool.get("parameters", {
                        "type": "object",
                        "properties": {},
                        "required": []
                    })
                }
                formatted_tools.append(formatted_tool)
        
        return formatted_tools
    
    def _format_function_calls_response(self, content: str, function_calls: List[Dict[str, Any]]) -> str:
        """Format response when function calls are present."""
        if not function_calls:
            return content
        
        response_parts = []
        if content:
            response_parts.append(content)
        
        response_parts.append("\n**Function Calls:**")
        for function_call in function_calls:
            name = function_call.get("name", "unknown")
            args = function_call.get("args", {})
            
            response_parts.append(f"\n- **{name}**:")
            if args:
                args_str = json.dumps(args, indent=2)
                response_parts.append(f"  ```json\n  {args_str}\n  ```")
        
        return "\n".join(response_parts)
    
    async def _check_rate_limits(self, model: str) -> None:
        """Check Gemini rate limits."""
        # Gemini handles rate limiting on their end
        # Could implement client-side rate limiting here if needed
        pass