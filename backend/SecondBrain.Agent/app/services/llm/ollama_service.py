"""Ollama LLM service implementation for local models."""

import asyncio
import json
import socket
from typing import Any, Dict, List, Optional

import aiohttp
import structlog

from app.core.models import LLMRequest, LLMResponse, TokenUsage
from .base_llm_service import BaseLLMService

logger = structlog.get_logger(__name__)


class OllamaService(BaseLLMService):
    """Ollama LLM service implementation for local models."""
    
    def __init__(self, base_url: Optional[str] = None):
        """Initialize Ollama service."""
        # Ollama doesn't require an API key for local instances
        super().__init__(
            provider_name="ollama",
            api_key="local",  # Placeholder since no API key needed
            base_url=base_url or self._discover_ollama_url()
        )
        
        self._available_models: List[str] = []
        self._model_limits = {}
        self._retry_count = 3
        self._retry_delay = 0.1
        
        # Initialize models asynchronously (will be populated on first use)
        self._models_loaded = False
    
    @property
    def default_models(self) -> List[str]:
        """Get default models for Ollama."""
        return ["llama2", "mistral", "codellama"]
    
    @property
    def supported_agent_types(self) -> List[str]:
        """Get supported agent types for Ollama."""
        return ["all"]  # Ollama supports all agent types
    
    def _discover_ollama_url(self) -> str:
        """Discover Ollama server URL with fallbacks."""
        urls_to_try = [
            "http://localhost:11434",
            "http://127.0.0.1:11434",
            "http://host.docker.internal:11434",
            f"http://{self._get_source_ip()}:11434"
        ]
        
        for url in urls_to_try:
            if self._test_connection(url):
                logger.info("Ollama server discovered", url=url)
                return url
        
        logger.warning("No Ollama server found, using default URL")
        return "http://localhost:11434"
    
    def _get_source_ip(self) -> str:
        """Get the source IP address for network interface detection."""
        try:
            # Connect to a remote address to determine source IP
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.connect(("8.8.8.8", 80))
                return s.getsockname()[0]
        except Exception:
            return "localhost"
    
    def _test_connection(self, url: str) -> bool:
        """Test connection to Ollama server."""
        try:
            import asyncio
            import aiohttp
            
            async def test():
                async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=2)) as session:
                    async with session.get(f"{url}/api/tags") as response:
                        return response.status == 200
            
            # Run the test synchronously
            loop = None
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            return loop.run_until_complete(test())
        except Exception:
            return False
    
    async def _load_available_models(self) -> None:
        """Load available models from Ollama server."""
        if self._models_loaded:
            return
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/api/tags",
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    
                    if response.status == 200:
                        result = await response.json()
                        models = result.get("models", [])
                        
                        self._available_models = []
                        for model in models:
                            model_name = model.get("name", "")
                            if model_name:
                                # Extract base model name (remove tags like :latest)
                                base_name = model_name.split(":")[0]
                                if base_name not in self._available_models:
                                    self._available_models.append(base_name)
                                
                                # Store model metadata
                                self._model_limits[base_name] = {
                                    "max_tokens": -1,  # Ollama doesn't have hard limits
                                    "context_window": model.get("details", {}).get("parameter_size", "7B"),
                                    "size": model.get("size", 0),
                                    "modified_at": model.get("modified_at", "")
                                }
                        
                        self._models_loaded = True
                        logger.info("Ollama models loaded",
                                   count=len(self._available_models),
                                   models=self._available_models)
                    else:
                        logger.warning("Failed to load Ollama models",
                                      status=response.status)
                        
        except Exception as e:
            logger.error("Error loading Ollama models",
                        error=str(e),
                        url=self.base_url)
    
    async def _generate_response_internal(self, request: LLMRequest) -> LLMResponse:
        """Generate response using Ollama API."""
        
        # Load models if not already loaded
        await self._load_available_models()
        
        # Prepare the prompt with conversation history
        full_prompt = self._format_prompt_with_history(request)
        
        # Prepare request payload
        payload = {
            "model": request.model,
            "prompt": full_prompt,
            "stream": False,
            "options": {
                "temperature": request.temperature or 0.7,
                "num_predict": request.max_tokens or 2048,
                "stop": ["Human:", "Assistant:", "\n\nHuman:", "\n\nAssistant:"]
            }
        }
        
        # Add system prompt if provided
        if request.system_prompt:
            payload["system"] = request.system_prompt
        
        async with aiohttp.ClientSession() as session:
            for attempt in range(self._retry_count):
                try:
                    async with session.post(
                        f"{self.base_url}/api/generate",
                        json=payload,
                        timeout=aiohttp.ClientTimeout(total=120)
                    ) as response:
                        
                        if response.status != 200:
                            error_text = await response.text()
                            raise Exception(f"Ollama API error {response.status}: {error_text}")
                        
                        result = await response.json()
                        
                        # Extract response content
                        content = result.get("response", "").strip()
                        
                        # Extract token usage (if available)
                        eval_count = result.get("eval_count", 0)
                        prompt_eval_count = result.get("prompt_eval_count", 0)
                        
                        token_usage = TokenUsage(
                            prompt_tokens=prompt_eval_count,
                            completion_tokens=eval_count,
                            total_tokens=prompt_eval_count + eval_count
                        )
                        
                        # Extract timing information
                        eval_duration = result.get("eval_duration", 0)
                        total_duration = result.get("total_duration", 0)
                        
                        return LLMResponse(
                            content=content,
                            metadata={
                                "model": request.model,
                                "done": result.get("done", True),
                                "eval_count": eval_count,
                                "eval_duration": eval_duration,
                                "total_duration": total_duration,
                                "context": result.get("context", []),
                                "server_url": self.base_url
                            },
                            token_usage=token_usage,
                            model=request.model,
                            provider=self.provider_name,
                            execution_time=total_duration / 1e9 if total_duration else 0,  # Convert to seconds
                            success=True
                        )
                        
                except Exception as e:
                    if attempt < self._retry_count - 1:
                        logger.warning("Ollama request failed, retrying",
                                      attempt=attempt + 1,
                                      error=str(e))
                        await asyncio.sleep(self._retry_delay * (2 ** attempt))
                        continue
                    else:
                        logger.error("Ollama API request failed after retries",
                                    error=str(e),
                                    model=request.model,
                                    attempts=self._retry_count)
                        return await self._handle_provider_error(e, request)
    
    def _format_prompt_with_history(self, request: LLMRequest) -> str:
        """Format prompt with conversation history for Ollama."""
        parts = []
        
        # Add conversation history if provided
        if request.conversation_history:
            for entry in request.conversation_history:
                role = entry.get("role", "user")
                content = entry.get("content", "")
                
                if role == "user":
                    parts.append(f"Human: {content}")
                elif role == "assistant":
                    parts.append(f"Assistant: {content}")
                elif role == "system":
                    parts.append(f"System: {content}")
        
        # Add current prompt
        parts.append(f"Human: {request.prompt}")
        parts.append("Assistant:")
        
        return "\n\n".join(parts)
    
    async def get_available_models(self) -> List[str]:
        """Get list of available models from Ollama server."""
        await self._load_available_models()
        return self._available_models if self._available_models else self.default_models
    
    async def _check_rate_limits(self, model: str) -> None:
        """Check rate limits - Ollama doesn't have rate limits for local models."""
        pass
    
    async def _validate_request(self, request: LLMRequest) -> bool:
        """Validate the LLM request for Ollama."""
        # Load models if needed
        await self._load_available_models()
        
        if not request.prompt or not request.prompt.strip():
            return False
            
        if not request.model:
            return False
        
        # Check if model is available (more lenient for Ollama)
        available_models = await self.get_available_models()
        if request.model not in available_models:
            # Log warning but don't fail - Ollama might have the model
            logger.warning("Model not in available list, attempting anyway",
                          requested_model=request.model,
                          available_models=available_models)
        
        return True
    
    async def _handle_provider_error(self, error: Exception, request: LLMRequest) -> LLMResponse:
        """Handle Ollama-specific errors."""
        error_message = str(error)
        
        # Ollama-specific error handling
        if "connection" in error_message.lower() or "refused" in error_message.lower():
            error_message = f"Cannot connect to Ollama server at {self.base_url}. Please ensure Ollama is running."
        elif "model" in error_message.lower() and "not found" in error_message.lower():
            error_message = f"Model '{request.model}' not found in Ollama. Available models: {await self.get_available_models()}"
        elif "timeout" in error_message.lower():
            error_message = "Ollama request timed out. The model might be loading or the prompt is too complex."
        elif "out of memory" in error_message.lower():
            error_message = "Ollama ran out of memory. Try using a smaller model or reducing the prompt length."
        
        return LLMResponse(
            content=f"Ollama Error: {error_message}",
            metadata={
                "provider": self.provider_name,
                "error": str(error),
                "error_type": type(error).__name__,
                "server_url": self.base_url,
                "success": False
            },
            model=request.model,
            provider=self.provider_name,
            execution_time=0,
            success=False
        )
    
    async def check_health(self) -> Dict[str, Any]:
        """Check Ollama server health."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/api/tags",
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    
                    if response.status == 200:
                        result = await response.json()
                        models = result.get("models", [])
                        
                        return {
                            "status": "healthy",
                            "server_url": self.base_url,
                            "models_available": len(models),
                            "models": [model.get("name", "") for model in models[:5]]  # First 5 models
                        }
                    else:
                        return {
                            "status": "unhealthy",
                            "server_url": self.base_url,
                            "error": f"HTTP {response.status}"
                        }
                        
        except Exception as e:
            return {
                "status": "unhealthy",
                "server_url": self.base_url,
                "error": str(e)
            }