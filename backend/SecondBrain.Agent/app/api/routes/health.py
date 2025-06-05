"""Health check endpoints."""

from typing import Dict

from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
async def health_check() -> Dict[str, str]:
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "service": "SecondBrain Research Agent",
        "version": "1.0.0",
    }


@router.get("/detailed")
async def detailed_health_check() -> Dict[str, dict]:
    """Detailed health check with component status."""
    # TODO: Add actual health checks for dependencies
    return {
        "status": "healthy",
        "service": "SecondBrain Research Agent",
        "version": "1.0.0",
        "components": {
            "api": {"status": "healthy", "checks": []},
            "cache": {"status": "unknown", "checks": ["TODO: Redis connection"]},
            "llm_services": {"status": "unknown", "checks": ["TODO: OpenAI/Anthropic"]},
            "tools": {"status": "unknown", "checks": ["TODO: Tool registry"]},
        },
    } 