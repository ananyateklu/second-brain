"""Main FastAPI application for SecondBrain Multi-Agent System."""

import time
import uuid
from contextlib import asynccontextmanager
from typing import Dict, List

import structlog
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.agents import AgentFactory, AgentRegistry
from app.api.routes import health, agent
from app.config.settings import get_settings
from app.core.models import AgentRequest, AgentResponse

# Import real services
from app.services.llm import LLMFactory
from app.services.tool_manager import ToolManager
from app.services.mock_services import MockContextManager

# Configure structured logging following user's rule for safe logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer(),
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)

# Global instances
agent_factory: AgentFactory = None
agent_registry: AgentRegistry = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management."""
    global agent_factory, agent_registry
    
    # Startup
    settings = get_settings()
    logger.info("Starting SecondBrain Multi-Agent System", {
        "version": "1.0.0",
        "environment": settings.environment,
        "log_level": settings.log_level
    })
    
    # Initialize services
    try:
        # Create multi-provider LLM service
        available_providers = []
        if settings.openai_api_key:
            available_providers.append("openai")
        if settings.anthropic_api_key:
            available_providers.append("anthropic")
        if getattr(settings, "gemini_api_key", ""):
            available_providers.append("gemini")
        if getattr(settings, "grok_api_key", ""):
            available_providers.append("grok")
        
        # Always try to add Ollama (local service)
        try:
            from app.services.llm import OllamaService
            ollama_test = OllamaService(getattr(settings, "ollama_base_url", None))
            # Test if Ollama is accessible
            import asyncio
            health = await ollama_test.check_health()
            if health.get("status") == "healthy":
                available_providers.append("ollama")
                logger.info("Ollama server detected and added", {
                    "server_url": health.get("server_url"),
                    "models_available": health.get("models_available", 0)
                })
            else:
                logger.info("Ollama server not available", {
                    "error": health.get("error")
                })
        except Exception as e:
            logger.info("Ollama not available", {"error": str(e)})
        
        if available_providers:
            llm_service = LLMFactory.create_multi_provider_service(available_providers)
            logger.info("Multi-provider LLM service initialized", {
                "providers": available_providers
            })
        else:
            logger.warning("No API keys provided, falling back to mock LLM service")
            from app.services.mock_services import MockLLMService
            llm_service = MockLLMService()
    except Exception as e:
        logger.error("Failed to initialize LLM service, using mock", {
            "error": str(e)
        })
        from app.services.mock_services import MockLLMService
        llm_service = MockLLMService()
    
    # Initialize real tool manager
    tool_manager = ToolManager()
    context_manager = MockContextManager()
    
    # Initialize agent factory and registry
    agent_factory = AgentFactory(
        llm_service=llm_service,
        tool_manager=tool_manager,
        context_manager=context_manager
    )
    agent_registry = AgentRegistry()
    
    # Pre-register default agent instances
    await _initialize_default_agents()
    
    logger.info("Multi-agent system initialized", {
        "available_agents": agent_registry.list_agent_types(),
        "total_agents": len(agent_registry.list_agent_types())
    })
    
    yield
    
    # Shutdown
    logger.info("Shutting down SecondBrain Multi-Agent System")


async def _initialize_default_agents():
    """Initialize and register default agent instances."""
    global agent_factory, agent_registry
    
    # Get supported agent types from factory
    supported_types = agent_factory.get_supported_types()
    
    logger.info("Initializing default agents", {
        "supported_types": supported_types
    })
    
    for agent_type in supported_types:
        try:
            # Create agent with default configuration
            agent = await agent_factory.create_agent(agent_type)
            
            # Register the agent
            agent_registry.register_agent(agent)
            
            logger.info("Agent registered successfully", {
                "agent_type": agent_type,
                "agent_name": agent.name
            })
            
        except Exception as e:
            logger.error("Failed to initialize agent", {
                "agent_type": agent_type,
                "error": str(e),
                "error_type": type(e).__name__
            })


# Create FastAPI app
app = FastAPI(
    title="SecondBrain Multi-Agent System",
    description="Clean, modular multi-agent system for SecondBrain application",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Get settings
settings = get_settings()

# Configure CORS - maintain compatibility with C# backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add custom middleware
from app.middleware.error_handling import ErrorHandlingMiddleware
from app.middleware.logging import LoggingMiddleware

app.add_middleware(ErrorHandlingMiddleware)
app.add_middleware(LoggingMiddleware)

# Include routers
app.include_router(health.router)
app.include_router(agent.router)


@app.get("/")
async def root() -> Dict[str, str]:
    """Root endpoint with API information - maintains compatibility."""
    return {
        "service": "SecondBrain Multi-Agent System",
        "version": "1.0.0",
        "docs_url": "/docs",
        "health_check": "/health",
        "agent_types": "/agent/types",
        "agent_execute": "/agent/execute",
        "status": "healthy",
        "features": ["multi_agent", "extensible", "configurable"]
    }


@app.get("/agent/types")
async def get_agent_types() -> Dict[str, any]:
    """Get available agent types with detailed information."""
    global agent_registry, agent_factory
    
    if not agent_registry:
        return {"error": "Agent registry not initialized"}
    
    # Get basic agent types (backward compatibility)
    agent_types = agent_registry.list_agent_types()
    
    # Get detailed agent information
    agent_info = {}
    for agent_type in agent_types:
        info = agent_factory.get_agent_info(agent_type)
        if info:
            agent_info[agent_type] = info
    
    return {
        "specialized_agents": agent_types,
        "base_providers": ["openai", "anthropic", "local"],  # Maintain compatibility
        "agent_details": agent_info,
        "total_agents": len(agent_types),
        "capabilities": _get_all_capabilities()
    }


@app.get("/agent/registry")
async def get_agent_registry() -> Dict[str, any]:
    """Get detailed registry information."""
    global agent_registry
    
    if not agent_registry:
        return {"error": "Agent registry not initialized"}
    
    return agent_registry.get_registry_summary()


@app.get("/agent/capabilities")
async def get_agent_capabilities() -> Dict[str, List[str]]:
    """Get agents organized by capabilities."""
    global agent_registry
    
    if not agent_registry:
        return {"error": "Agent registry not initialized"}
    
    capabilities_map = {}
    
    # Get all unique capabilities
    all_capabilities = _get_all_capabilities()
    
    for capability in all_capabilities:
        agents = agent_registry.get_agents_by_capability(capability)
        capabilities_map[capability] = [agent.agent_type for agent in agents]
    
    return capabilities_map


@app.get("/llm/providers")
async def get_llm_providers() -> Dict[str, any]:
    """Get information about available LLM providers."""
    from app.services.llm import LLMFactory
    
    available_providers = LLMFactory.get_available_providers()
    provider_info = {}
    
    for provider in available_providers:
        info = LLMFactory.get_provider_info(provider)
        provider_info[provider] = info
    
    return {
        "available_providers": available_providers,
        "provider_details": provider_info,
        "total_providers": len(available_providers)
    }


@app.get("/llm/models")
async def get_llm_models() -> Dict[str, List[str]]:
    """Get available models organized by provider."""
    from app.services.llm import LLMFactory
    
    models_by_provider = {}
    
    for provider in LLMFactory.get_available_providers():
        try:
            info = LLMFactory.get_provider_info(provider)
            models_by_provider[provider] = info.get("available_models", [])
        except Exception as e:
            logger.warning("Failed to get models for provider", {
                "provider": provider,
                "error": str(e)
            })
            models_by_provider[provider] = []
    
    return models_by_provider


@app.get("/llm/ollama/health")
async def get_ollama_health() -> Dict[str, any]:
    """Check Ollama server health and available models."""
    from app.services.llm import LLMFactory
    
    try:
        ollama_service = LLMFactory.create_service("ollama")
        health = await ollama_service.check_health()
        
        if health.get("status") == "healthy":
            # Get available models if healthy
            available_models = await ollama_service.get_available_models()
            health["available_models"] = available_models
            health["total_models"] = len(available_models)
        
        return health
        
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "message": "Failed to connect to Ollama service"
        }


@app.get("/tools/available")
async def get_available_tools() -> Dict[str, any]:
    """Get all available tools with their information."""
    global agent_factory
    
    if not agent_factory:
        return {"error": "Agent factory not initialized"}
    
    tool_manager = agent_factory.tool_manager
    available_tools = tool_manager.list_available_tools()
    
    tools_info = {}
    for tool_name in available_tools:
        tool_info = tool_manager.get_tool_info(tool_name)
        if tool_info:
            tools_info[tool_name] = tool_info
    
    return {
        "available_tools": available_tools,
        "tools_info": tools_info,
        "total_tools": len(available_tools)
    }


@app.get("/tools/health")
async def get_tools_health() -> Dict[str, any]:
    """Get health status of all tools and external dependencies."""
    global agent_factory
    
    if not agent_factory:
        return {"error": "Agent factory not initialized"}
    
    try:
        tool_manager = agent_factory.tool_manager
        if hasattr(tool_manager, 'get_tool_health'):
            return await tool_manager.get_tool_health()
        else:
            return {
                "status": "unknown",
                "message": "Tool manager does not support health checks"
            }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }


@app.post("/tools/test_search")
async def test_search_tools(request: Dict[str, any]) -> Dict[str, any]:
    """Test search tools with a sample query."""
    global agent_factory
    
    if not agent_factory:
        return {"error": "Agent factory not initialized"}
    
    query = request.get("query", "artificial intelligence")
    tool_name = request.get("tool", "intelligent_search")
    max_results = request.get("max_results", 5)
    
    try:
        tool_manager = agent_factory.tool_manager
        
        # Create tool request
        from app.core.models import ToolRequest
        tool_request = ToolRequest(
            query=query,
            parameters={"max_results": max_results},
            agent_type="research"
        )
        
        # Execute tool
        response = await tool_manager.execute_tool(tool_name, tool_request)
        
        return {
            "success": response.success,
            "query": query,
            "tool_used": tool_name,
            "results_count": len(response.data.get("results", [])) if response.data else 0,
            "execution_time": response.execution_time,
            "data": response.data,
            "error": response.error
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "query": query,
            "tool_used": tool_name
        }


@app.post("/agent/execute", response_model=AgentResponse)
async def execute_agent(request: AgentRequest) -> AgentResponse:
    """Execute an AI agent with the given parameters - supports multiple agent types."""
    global agent_registry
    
    start_time = time.time()
    request_id = f"req_{uuid.uuid4().hex[:8]}"
    
    logger.info("Agent execution requested", {
        "request_id": request_id,
        "agent_type": request.agent_type,
        "model_id": request.model_id,
        "has_tools": bool(request.tools),
        "has_context": bool(request.context),
        "session_id": request.session_id
    })
    
    try:
        # Check if agent registry is initialized
        if not agent_registry:
            raise HTTPException(
                status_code=503,
                detail="Agent registry not initialized"
            )
        
        # Get the appropriate agent
        agent = agent_registry.get_agent(request.agent_type)
        if not agent:
            available_types = agent_registry.list_agent_types()
            raise HTTPException(
                status_code=400,
                detail=f"Agent type '{request.agent_type}' not available. Available types: {available_types}"
            )
        
        # Execute the agent
        result = await agent.execute(request)
        
        execution_time = time.time() - start_time
        
        logger.info("Agent execution completed", {
            "request_id": request_id,
            "agent_type": request.agent_type,
            "execution_time": execution_time,
            "success": result.success
        })
        
        return result
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        execution_time = time.time() - start_time
        
        logger.error("Agent execution failed", {
            "request_id": request_id,
            "agent_type": request.agent_type,
            "execution_time": execution_time,
            "error": str(e),
            "error_type": type(e).__name__
        })
        
        # Return error response in expected format
        return AgentResponse(
            result=f"Agent execution failed: {str(e)}",
            metadata={
                "request_id": request_id,
                "agent_type": request.agent_type,
                "execution_time": execution_time,
                "error": str(e),
                "success": False
            },
            agent_type=request.agent_type,
            success=False,
            error=str(e)
        )


@app.get("/agent/{agent_type}/status")
async def get_agent_status(agent_type: str) -> Dict[str, any]:
    """Get status of a specific agent type."""
    global agent_registry
    
    if not agent_registry:
        return {"error": "Agent registry not initialized"}
    
    if not agent_registry.is_agent_available(agent_type):
        available_types = agent_registry.list_agent_types()
        raise HTTPException(
            status_code=404,
            detail=f"Agent type '{agent_type}' not found. Available types: {available_types}"
        )
    
    return agent_registry.get_agent_status(agent_type)


def _get_all_capabilities() -> List[str]:
    """Get all unique capabilities across all agents."""
    global agent_registry
    
    if not agent_registry:
        return []
    
    all_capabilities = set()
    
    for agent_type in agent_registry.list_agent_types():
        agent = agent_registry.get_agent(agent_type)
        if agent:
            all_capabilities.update(agent.capabilities)
    
    return sorted(list(all_capabilities))


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_config=None,  # Use our structured logging
    ) 