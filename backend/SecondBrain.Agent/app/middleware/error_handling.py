"""Error handling middleware for consistent error responses."""

import traceback
from typing import Callable

import structlog
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = structlog.get_logger(__name__)


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Middleware for handling and formatting errors consistently."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with error handling."""
        try:
            return await call_next(request)
        except Exception as e:
            return await self._handle_error(request, e)

    async def _handle_error(self, request: Request, error: Exception) -> JSONResponse:
        """Handle and format errors consistently."""
        request_id = getattr(request.state, "request_id", "unknown")
        
        # Log the error with context - following user's rule for safe logging
        logger.error("Unhandled error occurred", {
            "request_id": request_id,
            "error": str(error),
            "error_type": type(error).__name__,
            "path": request.url.path,
            "method": request.method,
            "traceback": traceback.format_exc(),
        })
        
        # Determine error response based on error type
        if isinstance(error, ValueError):
            status_code = 400
            detail = "Invalid request parameters"
        elif isinstance(error, FileNotFoundError):
            status_code = 404
            detail = "Resource not found"
        elif isinstance(error, PermissionError):
            status_code = 403
            detail = "Access denied"
        elif isinstance(error, TimeoutError):
            status_code = 408
            detail = "Request timeout"
        else:
            status_code = 500
            detail = "Internal server error"
        
        # Create error response
        error_response = {
            "error": detail,
            "request_id": request_id,
            "type": type(error).__name__,
        }
        
        # Add error details in development mode
        try:
            from app.config.settings import get_settings
            settings = get_settings()
            if settings.debug and settings.environment == "development":
                error_response["detail"] = str(error)
                error_response["traceback"] = traceback.format_exc().split("\n")
        except Exception:
            # If we can't get settings, just continue without debug info
            pass
        
        return JSONResponse(
            status_code=status_code,
            content=error_response,
            headers={"X-Request-ID": request_id},
        ) 