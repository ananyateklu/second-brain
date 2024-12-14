from pydantic_settings import BaseSettings
import os
from pathlib import Path

# Get the project root directory (ai_service)
root_dir = Path(__file__).parent.parent.parent.parent

class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str
    OPENAI_API_KEY: str
    
    class Config:
        # Look for .env file in multiple locations
        env_file = (
            root_dir / ".env",  # ai_service/.env
            root_dir / "src" / ".env",  # ai_service/src/.env
            root_dir / "src" / "app" / ".env",  # ai_service/src/app/.env
        )
        env_file_encoding = 'utf-8'
        case_sensitive = True

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        env_file_used = next((f for f in self.Config.env_file if f.exists()), None)
        if env_file_used:
            print(f"Using .env file: {env_file_used}")
            print(f"API Key loaded: {self.ANTHROPIC_API_KEY[:10]}...")
        else:
            print("Warning: No .env file found!")

settings = Settings() 