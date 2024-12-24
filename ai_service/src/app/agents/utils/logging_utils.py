import logging
import json
from typing import Any, Dict, Optional
from datetime import datetime
from functools import wraps
import time
import traceback

# Configure base logger
logger = logging.getLogger("agent")

def setup_logger(level: int = logging.INFO) -> None:
    """Setup the agent logger with proper formatting"""
    logger.setLevel(level)
    
    # Create console handler if none exists
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

def log_execution(func):
    """Decorator to log function execution with timing"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        func_name = func.__name__
        logger.info(f"Starting execution of {func_name}")
        
        try:
            result = await func(*args, **kwargs)
            execution_time = time.time() - start_time
            logger.info(f"Completed {func_name} in {execution_time:.2f}s")
            return result
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(
                f"Error in {func_name} after {execution_time:.2f}s: {str(e)}\n"
                f"Traceback: {traceback.format_exc()}"
            )
            raise
    return wrapper

def log_api_call(func):
    """Decorator to log API calls with request and response details"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        func_name = func.__name__
        start_time = time.time()
        
        # Log request
        logger.info(f"API Call: {func_name}")
        logger.debug(f"Request Args: {args}")
        logger.debug(f"Request Kwargs: {kwargs}")
        
        try:
            response = await func(*args, **kwargs)
            execution_time = time.time() - start_time
            
            # Log response
            logger.info(f"API Response received in {execution_time:.2f}s")
            logger.debug(f"Response: {response}")
            
            return response
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(
                f"API Error in {func_name} after {execution_time:.2f}s: {str(e)}\n"
                f"Traceback: {traceback.format_exc()}"
            )
            raise
    return wrapper

def log_tool_execution(tool_name: str, parameters: Dict[str, Any]) -> None:
    """Log tool execution details"""
    logger.info(f"Executing tool: {tool_name}")
    logger.debug(f"Tool parameters: {json.dumps(parameters, indent=2)}")

def log_search_result(
    search_type: str,
    query: str,
    result_count: int,
    execution_time: float,
    error: Optional[str] = None
) -> None:
    """Log search result details"""
    log_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "search_type": search_type,
        "query": query,
        "result_count": result_count,
        "execution_time": f"{execution_time:.2f}s"
    }
    
    if error:
        log_data["error"] = error
        logger.error(f"Search failed: {json.dumps(log_data, indent=2)}")
    else:
        logger.info(f"Search completed: {json.dumps(log_data, indent=2)}")

def log_error(error: Exception, context: Dict[str, Any] = None) -> None:
    """Log error with context"""
    error_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "error_type": type(error).__name__,
        "error_message": str(error),
        "traceback": traceback.format_exc(),
        **(context or {})
    }
    logger.error(f"Error occurred: {json.dumps(error_data, indent=2)}")

# Setup logger when module is imported
setup_logger() 