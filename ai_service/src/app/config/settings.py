from pydantic_settings import BaseSettings
import os
from pathlib import Path
from typing import Optional

# Get the project root directory (ai_service)
root_dir = Path(__file__).parent.parent.parent.parent

class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str
    OPENAI_API_KEY: str
    OLLAMA_BASE_URL: str  # Default to localhost
    GEMINI_API_KEY: str  # Add Gemini API key
    GROK_API_KEY: str  # Add Grok API key
    GROK_API_BASE: str = "https://api.x.ai/v1"  # Updated Grok API base URL
    NEWS_API_KEY: Optional[str] = None  # Make NewsAPI key optional
    PROXY_URL: Optional[str] = None  # Add proxy URL configuration
    
    class Config:
        # Look for .env file in multiple locations
        env_file = (
            root_dir / ".env",
        )
        env_file_encoding = 'utf-8'
        case_sensitive = True

    def _print_api_status(self, key: str, value: Optional[str], optional: bool = False) -> None:
        if value:
            print(f"✅ {key} loaded: {value[:10]}...")
        else:
            status = "⚠️" if optional else "❌"
            suffix = "not configured" if optional else "not found!"
            print(f"{status} {key} {suffix}")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        env_file_used = next((f for f in self.Config.env_file if f.exists()), None)
        if not env_file_used:
            print("\n⚠️  Warning: No .env file found!")
            print("Please ensure you have a .env file with required configurations\n")
            return

        print("\n=== AI Service Configuration ===")
        print(f"Using .env file: {env_file_used}")
        
        self._print_api_status("Anthropic API Key", self.ANTHROPIC_API_KEY)
        self._print_api_status("OpenAI API Key", self.OPENAI_API_KEY)
        print(f"✅ Ollama URL configured: {self.OLLAMA_BASE_URL}")
        self._print_api_status("Gemini API Key", self.GEMINI_API_KEY)
        self._print_api_status("Grok API Key", self.GROK_API_KEY)
        self._print_api_status("NewsAPI Key", self.NEWS_API_KEY, optional=True)
        self._print_api_status("Proxy", self.PROXY_URL, optional=True)
        
        print("============================\n")

settings = Settings() 