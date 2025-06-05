"""LLM service factory for creating provider-specific implementations."""

from typing import Dict, Optional, Type

import structlog

from app.config.settings import get_settings
from app.core.interfaces import ILLMService
from .anthropic_service import AnthropicService
from .gemini_service import GeminiService
from .grok_service import GrokService
from .ollama_service import OllamaService
from .openai_service import OpenAIService

logger = structlog.get_logger(__name__)


class LLMFactory:
    """Factory for creating LLM service instances."""
    
    _providers: Dict[str, Type[ILLMService]] = {
        "openai": OpenAIService,
        "anthropic": AnthropicService,
        "gemini": GeminiService,
        "grok": GrokService,
        "ollama": OllamaService
    }
    
    _instances: Dict[str, ILLMService] = {}
    
    @classmethod
    def create_service(cls, provider: str, api_key: Optional[str] = None, base_url: Optional[str] = None) -> ILLMService:
        """Create an LLM service instance for the specified provider."""
        
        if provider not in cls._providers:
            available_providers = list(cls._providers.keys())
            raise ValueError(f"Unsupported LLM provider '{provider}'. Available providers: {available_providers}")
        
        # Use cached instance if available
        cache_key = f"{provider}_{api_key or 'default'}_{base_url or 'default'}"
        if cache_key in cls._instances:
            return cls._instances[cache_key]
        
        # Get settings
        settings = get_settings()
        
        # Determine API key and base URL
        if not api_key:
            if provider == "openai":
                api_key = settings.openai_api_key
                base_url = base_url or settings.openai_base_url
            elif provider == "anthropic":
                api_key = settings.anthropic_api_key
                base_url = base_url or settings.anthropic_base_url
            elif provider == "gemini":
                api_key = getattr(settings, "gemini_api_key", "")
                base_url = base_url or getattr(settings, "gemini_base_url", None)
            elif provider == "grok":
                api_key = getattr(settings, "grok_api_key", "")
                base_url = base_url or getattr(settings, "grok_base_url", None)
            elif provider == "ollama":
                # Ollama doesn't need API key, just base URL
                api_key = "local"
                base_url = base_url or getattr(settings, "ollama_base_url", None)
        
        if not api_key and provider != "ollama":
            raise ValueError(f"API key not provided for {provider} service")
        
        # Create service instance
        service_class = cls._providers[provider]
        try:
            if provider == "ollama":
                # Ollama service constructor is different
                service = service_class(base_url=base_url)
            elif base_url:
                service = service_class(api_key=api_key, base_url=base_url)
            else:
                service = service_class(api_key=api_key)
            
            # Cache the instance
            cls._instances[cache_key] = service
            
            logger.info("LLM service created",
                       provider=provider,
                       has_api_key=bool(api_key),
                       has_base_url=bool(base_url))
            
            return service
            
        except Exception as e:
            logger.error("Failed to create LLM service",
                        provider=provider,
                        error=str(e),
                        error_type=type(e).__name__)
            raise
    
    @classmethod
    def get_available_providers(cls) -> list[str]:
        """Get list of available LLM providers."""
        return list(cls._providers.keys())
    
    @classmethod
    def register_provider(cls, name: str, service_class: Type[ILLMService]) -> None:
        """Register a new LLM provider."""
        cls._providers[name] = service_class
        logger.info("LLM provider registered", provider=name)
    
    @classmethod
    def get_provider_info(cls, provider: str) -> Dict[str, any]:
        """Get information about a specific provider."""
        if provider not in cls._providers:
            return {}
        
        try:
            # Create a temporary instance to get info
            settings = get_settings()
            api_key = "dummy_key"  # Just for getting info
            
            if provider == "openai":
                service = OpenAIService(api_key=api_key)
            elif provider == "anthropic":
                service = AnthropicService(api_key=api_key)
            elif provider == "gemini":
                service = GeminiService(api_key=api_key)
            elif provider == "grok":
                service = GrokService(api_key=api_key)
            elif provider == "ollama":
                service = OllamaService()
            else:
                return {}
            
            return {
                "provider": provider,
                "default_models": service.default_models,
                "supported_agent_types": service.supported_agent_types,
                "available_models": service.get_available_models()
            }
            
        except Exception as e:
            logger.warning("Failed to get provider info",
                          provider=provider,
                          error=str(e))
            return {"provider": provider, "error": str(e)}
    
    @classmethod
    def create_multi_provider_service(cls, providers: list[str]) -> "MultiProviderLLMService":
        """Create a service that can use multiple providers."""
        services = {}
        
        for provider in providers:
            try:
                service = cls.create_service(provider)
                services[provider] = service
            except Exception as e:
                logger.warning("Failed to create service for provider",
                              provider=provider,
                              error=str(e))
        
        if not services:
            raise ValueError("No LLM services could be created")
        
        return MultiProviderLLMService(services)
    
    @classmethod
    def clear_cache(cls) -> None:
        """Clear the service instance cache."""
        cls._instances.clear()
        logger.info("LLM service cache cleared")


class MultiProviderLLMService(ILLMService):
    """Service that can route requests to multiple LLM providers."""
    
    def __init__(self, services: Dict[str, ILLMService]):
        """Initialize with a dictionary of provider services."""
        self.services = services
        self.default_provider = list(services.keys())[0] if services else None
    
    async def generate_response(self, request):
        """Generate response using the appropriate provider."""
        # Determine provider from model name or use default
        provider = self._get_provider_for_model(request.model)
        
        if provider not in self.services:
            raise ValueError(f"Provider '{provider}' not available")
        
        return await self.services[provider].generate_response(request)
    
    async def validate_response(self, response: str) -> bool:
        """Validate response using default provider."""
        if self.default_provider:
            return await self.services[self.default_provider].validate_response(response)
        return True
    
    def get_available_models(self) -> list[str]:
        """Get all available models from all providers."""
        all_models = []
        for service in self.services.values():
            all_models.extend(service.get_available_models())
        return all_models
    
    def supports_agent_type(self, agent_type: str) -> bool:
        """Check if any provider supports the agent type."""
        return any(service.supports_agent_type(agent_type) for service in self.services.values())
    
    def _get_provider_for_model(self, model: str) -> str:
        """Determine the provider based on the model name."""
        model_lower = model.lower()
        
        if any(prefix in model_lower for prefix in ["gpt", "openai"]):
            return "openai"
        elif any(prefix in model_lower for prefix in ["claude", "anthropic"]):
            return "anthropic"
        elif any(prefix in model_lower for prefix in ["gemini", "bard"]):
            return "gemini"
        elif any(prefix in model_lower for prefix in ["grok"]):
            return "grok"
        elif any(prefix in model_lower for prefix in ["llama", "mistral", "codellama", "phi", "qwen", "vicuna", "orca"]):
            return "ollama"
        
        # Default to first available provider
        return self.default_provider or list(self.services.keys())[0]