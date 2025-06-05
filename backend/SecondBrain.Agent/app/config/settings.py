"""Application settings and configuration."""

from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )
    
    # Application settings
    environment: str = Field(default="development", description="Environment")
    debug: bool = Field(default=True, description="Debug mode")
    log_level: str = Field(default="INFO", description="Logging level")
    
    # Server settings
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8001, description="Server port")
    reload: bool = Field(default=True, description="Auto-reload on changes")
    
    # CORS settings - maintain compatibility with C# backend
    allowed_origins: List[str] = Field(
        default=[
            "http://localhost:5127",  # C# backend
            "http://localhost:3000",  # React frontend (if direct access needed)
            "http://localhost:5173",  # Vite dev server
        ],
        description="Allowed CORS origins"
    )
    
    # LLM Provider settings
    openai_api_key: str = Field(default="", description="OpenAI API key")
    openai_base_url: str = Field(
        default="https://api.openai.com/v1", description="OpenAI base URL"
    )
    
    anthropic_api_key: str = Field(default="", description="Anthropic API key")
    anthropic_base_url: str = Field(
        default="https://api.anthropic.com", description="Anthropic base URL"
    )
    
    gemini_api_key: str = Field(default="", description="Google Gemini API key")
    gemini_base_url: str = Field(
        default="https://generativelanguage.googleapis.com", description="Gemini base URL"
    )
    
    grok_api_key: str = Field(default="", description="Grok (X.AI) API key")
    grok_base_url: str = Field(
        default="https://api.x.ai/v1", description="Grok base URL"
    )
    
    ollama_base_url: str = Field(
        default="http://localhost:11434", description="Ollama server URL"
    )
    
    # Redis settings
    redis_url: str = Field(
        default="redis://localhost:6379", description="Redis connection URL"
    )
    redis_password: str = Field(default="", description="Redis password")
    redis_db: int = Field(default=0, description="Redis database number")
    
    # Cache settings
    cache_ttl_default: int = Field(default=3600, description="Default cache TTL in seconds")
    cache_ttl_search: int = Field(default=1800, description="Search cache TTL in seconds")
    cache_ttl_analysis: int = Field(default=7200, description="Analysis cache TTL in seconds")
    
    # Rate limiting settings
    rate_limit_requests_per_minute: int = Field(
        default=60, description="Rate limit requests per minute"
    )
    rate_limit_burst: int = Field(
        default=10, description="Rate limit burst capacity"
    )
    
    # Tool settings
    max_parallel_tools: int = Field(
        default=5, description="Maximum parallel tool executions"
    )
    tool_timeout_seconds: int = Field(
        default=30, description="Tool execution timeout in seconds"
    )
    
    # Research settings
    max_research_iterations: int = Field(
        default=10, description="Maximum research iterations"
    )
    max_context_length: int = Field(
        default=10000, description="Maximum context length"
    )
    
    # External API settings for search tools
    semantic_scholar_api_key: str = Field(
        default="", description="Semantic Scholar API key"
    )
    news_api_key: str = Field(default="", description="News API key")
    
    # Search configuration
    default_max_search_results: int = Field(
        default=10, description="Default maximum search results per query"
    )
    enable_parallel_search: bool = Field(
        default=True, description="Enable parallel execution of search tools"
    )
    search_timeout_seconds: int = Field(
        default=30, description="Search operation timeout in seconds"
    )
    
    # Security settings
    api_key_header: str = Field(
        default="X-API-Key", description="API key header name"
    )
    allowed_api_keys: List[str] = Field(
        default_factory=list, description="Allowed API keys for authentication"
    )
    
    # Monitoring settings
    enable_metrics: bool = Field(default=True, description="Enable metrics collection")
    metrics_port: int = Field(default=9090, description="Metrics server port")
    
    # Health check settings
    health_check_timeout: int = Field(
        default=5, description="Health check timeout in seconds"
    )
    
    def get_openai_config(self) -> dict:
        """Get OpenAI configuration."""
        return {
            "api_key": self.openai_api_key,
            "base_url": self.openai_base_url,
        }
    
    def get_anthropic_config(self) -> dict:
        """Get Anthropic configuration."""
        return {
            "api_key": self.anthropic_api_key,
            "base_url": self.anthropic_base_url,
        }
    
    def get_gemini_config(self) -> dict:
        """Get Gemini configuration."""
        return {
            "api_key": self.gemini_api_key,
            "base_url": self.gemini_base_url,
        }
    
    def get_grok_config(self) -> dict:
        """Get Grok configuration."""
        return {
            "api_key": self.grok_api_key,
            "base_url": self.grok_base_url,
        }
    
    def get_ollama_config(self) -> dict:
        """Get Ollama configuration."""
        return {
            "base_url": self.ollama_base_url,
        }
    
    def get_redis_config(self) -> dict:
        """Get Redis configuration."""
        return {
            "url": self.redis_url,
            "password": self.redis_password or None,
            "db": self.redis_db,
            "decode_responses": True,
        }


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings() 