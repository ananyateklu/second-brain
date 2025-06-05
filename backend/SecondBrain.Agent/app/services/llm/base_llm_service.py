"""Base LLM service providing common functionality."""

import asyncio
import time
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

import structlog

from app.core.interfaces import ILLMService
from app.core.models import LLMRequest, LLMResponse, TokenUsage

logger = structlog.get_logger(__name__)


class BaseLLMService(ILLMService, ABC):
    """Base class for LLM service implementations."""
    
    def __init__(self, provider_name: str, api_key: str, base_url: Optional[str] = None):
        """Initialize the base LLM service."""
        self.provider_name = provider_name
        self.api_key = api_key
        self.base_url = base_url
        self._available_models: List[str] = []
        self._model_limits: Dict[str, Dict[str, int]] = {}
        
    @property
    @abstractmethod
    def default_models(self) -> List[str]:
        """Get default models for this provider."""
        pass
    
    @property
    @abstractmethod
    def supported_agent_types(self) -> List[str]:
        """Get supported agent types for this provider."""
        pass
    
    async def generate_response(self, request: LLMRequest) -> LLMResponse:
        """Generate a response using the LLM."""
        start_time = time.time()
        request_id = f"{self.provider_name}_{int(start_time * 1000)}"
        
        logger.info("Generating LLM response",
                   provider=self.provider_name,
                   model=request.model,
                   agent_type=request.agent_type,
                   prompt_length=len(request.prompt),
                   request_id=request_id)
        
        try:
            # Validate request
            if not await self._validate_request(request):
                raise ValueError(f"Invalid request for {self.provider_name}")
            
            # Check rate limits if applicable
            await self._check_rate_limits(request.model)
            
            # Generate response using provider-specific implementation
            response = await self._generate_response_internal(request)
            
            execution_time = time.time() - start_time
            
            # Add metadata
            response.metadata.update({
                "provider": self.provider_name,
                "request_id": request_id,
                "execution_time": execution_time,
                "agent_type": request.agent_type
            })
            
            logger.info("LLM response generated successfully",
                       provider=self.provider_name,
                       model=request.model,
                       execution_time=execution_time,
                       tokens_used=response.token_usage.total_tokens if response.token_usage else 0,
                       request_id=request_id)
            
            return response
            
        except Exception as e:
            execution_time = time.time() - start_time
            
            logger.error("LLM response generation failed",
                        provider=self.provider_name,
                        model=request.model,
                        error=str(e),
                        error_type=type(e).__name__,
                        execution_time=execution_time,
                        request_id=request_id)
            
            # Return error response
            return LLMResponse(
                content=f"Error generating response: {str(e)}",
                metadata={
                    "provider": self.provider_name,
                    "request_id": request_id,
                    "execution_time": execution_time,
                    "error": str(e),
                    "success": False
                },
                model=request.model,
                provider=self.provider_name,
                execution_time=execution_time,
                success=False
            )
    
    @abstractmethod
    async def _generate_response_internal(self, request: LLMRequest) -> LLMResponse:
        """Provider-specific response generation."""
        pass
    
    async def validate_response(self, response: str) -> bool:
        """Validate the LLM response."""
        if not response or not response.strip():
            return False
            
        # Check for common error patterns
        error_patterns = [
            "error:",
            "failed:",
            "unable to",
            "cannot process",
            "invalid request"
        ]
        
        response_lower = response.lower()
        for pattern in error_patterns:
            if pattern in response_lower:
                return False
                
        return True
    
    def get_available_models(self) -> List[str]:
        """Get list of available models."""
        return self._available_models if self._available_models else self.default_models
    
    def supports_agent_type(self, agent_type: str) -> bool:
        """Check if this LLM service supports the given agent type."""
        return agent_type in self.supported_agent_types or "all" in self.supported_agent_types
    
    async def _validate_request(self, request: LLMRequest) -> bool:
        """Validate the LLM request."""
        if not request.prompt or not request.prompt.strip():
            return False
            
        if not request.model:
            return False
            
        if request.model not in self.get_available_models():
            logger.warning("Model not available",
                          provider=self.provider_name,
                          requested_model=request.model,
                          available_models=self.get_available_models())
            return False
            
        if request.temperature is not None and (request.temperature < 0 or request.temperature > 2):
            return False
            
        if request.max_tokens is not None and request.max_tokens <= 0:
            return False
            
        return True
    
    async def _check_rate_limits(self, model: str) -> None:
        """Check rate limits for the model."""
        # Default implementation - can be overridden by providers
        pass
    
    def _create_token_usage(self, prompt_tokens: int, completion_tokens: int) -> TokenUsage:
        """Create token usage object."""
        return TokenUsage(
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens
        )
    
    def _get_model_config(self, model: str) -> Dict[str, Any]:
        """Get configuration for a specific model."""
        return self._model_limits.get(model, {
            "max_tokens": 4096,
            "context_window": 8192,
            "supports_streaming": True
        })
    
    async def _handle_provider_error(self, error: Exception, request: LLMRequest) -> LLMResponse:
        """Handle provider-specific errors."""
        error_message = str(error)
        
        # Common error handling
        if "rate limit" in error_message.lower():
            error_message = "Rate limit exceeded. Please try again later."
        elif "unauthorized" in error_message.lower() or "api key" in error_message.lower():
            error_message = "Authentication failed. Please check your API key."
        elif "quota" in error_message.lower():
            error_message = "API quota exceeded. Please check your usage limits."
        elif "timeout" in error_message.lower():
            error_message = "Request timed out. Please try again."
        
        return LLMResponse(
            content=f"Error: {error_message}",
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