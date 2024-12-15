from pydantic_settings import BaseSettings
import os
from pathlib import Path

# Get the project root directory (ai_service)
root_dir = Path(__file__).parent.parent.parent.parent

class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str
    OPENAI_API_KEY: str
    OLLAMA_BASE_URL: str  # Default to localhost
    
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
            
            print("============================\n")
        else:
            print("\n⚠️  Warning: No .env file found!")
            print("Please ensure you have a .env file with required configurations\n")

settings = Settings() 