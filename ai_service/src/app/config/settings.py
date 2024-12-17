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

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        env_file_used = next((f for f in self.Config.env_file if f.exists()), None)
        if env_file_used:
            print("\n=== AI Service Configuration ===")
            print(f"Using .env file: {env_file_used}")
            
            # Show Anthropic API key status
            if self.ANTHROPIC_API_KEY:
                print(f"✅ Anthropic API Key loaded: {self.ANTHROPIC_API_KEY[:10]}...")
            else:
                print("❌ Anthropic API Key not found!")
                
            # Show OpenAI API key status
            if self.OPENAI_API_KEY:
                print(f"✅ OpenAI API Key loaded: {self.OPENAI_API_KEY[:10]}...")
            else:
                print("❌ OpenAI API Key not found!")

            # Show Ollama configuration
            print(f"✅ Ollama URL configured: {self.OLLAMA_BASE_URL}")
            
            # Show Gemini API key status
            if self.GEMINI_API_KEY:
                print(f"✅ Gemini API Key loaded: {self.GEMINI_API_KEY[:10]}...")
            else:
                print("❌ Gemini API Key not found!")
                
            # Show Grok API key status
            if self.GROK_API_KEY:
                print(f"✅ Grok API Key loaded: {self.GROK_API_KEY[:10]}...")
            else:
                print("❌ Grok API Key not found!")
            
            # Show NewsAPI key status
            if self.NEWS_API_KEY:
                print(f"✅ NewsAPI Key loaded: {self.NEWS_API_KEY[:10]}...")
            else:
                print("⚠️ NewsAPI Key not configured - news search will be disabled")
                
            # Show Proxy configuration status
            if self.PROXY_URL:
                print(f"✅ Proxy configured: {self.PROXY_URL}")
            else:
                print("⚠️ No proxy configured - some services may have rate limits")
            
            print("============================\n")
        else:
            print("\n⚠️  Warning: No .env file found!")
            print("Please ensure you have a .env file with required configurations\n")

settings = Settings() 