"""Agent-related endpoints."""

from fastapi import APIRouter

# Create router for future agent-specific endpoints
router = APIRouter(prefix="/api/agent", tags=["agent"])

# Note: The main agent endpoints are currently in main.py for backward compatibility
# This router is for future additional agent-specific endpoints 