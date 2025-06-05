#!/usr/bin/env python3
"""Script to run the SecondBrain Research Agent server."""

import os
import sys
from pathlib import Path

# Add the app directory to Python path
app_dir = Path(__file__).parent
sys.path.insert(0, str(app_dir))

try:
    import uvicorn
except ImportError:
    print("❌ uvicorn not installed. Install with: pip install uvicorn[standard]")
    sys.exit(1)


def main():
    """Run the development server."""
    print("🚀 Starting SecondBrain Research Agent")
    print("=" * 50)
    print(f"📁 Working directory: {app_dir}")
    print("🌐 Server will be available at: http://localhost:8001")
    print("📚 API documentation: http://localhost:8001/docs")
    print("🏥 Health check: http://localhost:8001/health")
    print("=" * 50)
    print()
    
    # Check if .env file exists
    env_file = app_dir / ".env"
    if not env_file.exists():
        print("⚠️  No .env file found. Using default settings.")
        print("   Create .env file from .env.example for custom configuration.")
        print()
    
    # Run the server
    try:
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=8001,
            reload=True,
            reload_dirs=[str(app_dir / "app")],
            log_config=None,  # Use our structured logging
        )
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"\n❌ Server failed to start: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main() 