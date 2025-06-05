"""Core interfaces for the multi-agent architecture."""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from .models import (
    AgentConfig,
    AgentContext,
    AgentRequest,
    AgentResponse,
    AgentType,
    LLMRequest,
    LLMResponse,
    ResearchContext,
    ToolCategory,
    ToolRequest,
    ToolResponse,
)


class ITool(ABC):
    """Interface for agent tools."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Get the tool name."""
        pass

    @property
    @abstractmethod
    def category(self) -> ToolCategory:
        """Get the tool category."""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Get the tool description."""
        pass

    @property
    def supports_parallel_execution(self) -> bool:
        """Whether this tool can be executed in parallel with others."""
        return True

    @property
    def supported_agent_types(self) -> List[str]:
        """Get list of agent types that can use this tool."""
        return []  # Empty list means all agents can use it

    @abstractmethod
    async def execute(self, request: ToolRequest) -> ToolResponse:
        """Execute the tool with the given request."""
        pass

    @abstractmethod
    def validate_parameters(self, parameters: Dict[str, Any]) -> bool:
        """Validate tool parameters."""
        pass

    def get_schema(self) -> Dict[str, Any]:
        """Get the tool parameter schema."""
        return {
            "name": self.name,
            "category": self.category.value,
            "description": self.description,
            "parameters": self._get_parameter_schema(),
            "supported_agent_types": self.supported_agent_types,
        }

    @abstractmethod
    def _get_parameter_schema(self) -> Dict[str, Any]:
        """Get the parameter schema for this tool."""
        pass


class IToolManager(ABC):
    """Interface for managing and executing tools."""

    @abstractmethod
    async def execute_tool(self, tool_name: str, request: ToolRequest) -> ToolResponse:
        """Execute a specific tool."""
        pass

    @abstractmethod
    async def execute_tools_parallel(
        self, tool_names: List[str], request: ToolRequest
    ) -> List[ToolResponse]:
        """Execute multiple tools in parallel."""
        pass

    @abstractmethod
    def list_available_tools(self, agent_type: Optional[str] = None) -> List[str]:
        """Get list of available tool names, optionally filtered by agent type."""
        pass

    @abstractmethod
    def get_tool_info(self, tool_name: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific tool."""
        pass

    @abstractmethod
    def register_tool(self, tool: ITool) -> None:
        """Register a new tool."""
        pass

    @abstractmethod
    def get_tools_by_category(self, category: ToolCategory, agent_type: Optional[str] = None) -> List[str]:
        """Get tools by category, optionally filtered by agent type."""
        pass

    @abstractmethod
    def validate_tool_for_agent(self, tool_name: str, agent_type: str) -> bool:
        """Check if a tool can be used by a specific agent type."""
        pass


class ILLMService(ABC):
    """Interface for LLM service providers."""

    @abstractmethod
    async def generate_response(self, request: LLMRequest) -> LLMResponse:
        """Generate a response using the LLM."""
        pass

    @abstractmethod
    async def validate_response(self, response: str) -> bool:
        """Validate the LLM response."""
        pass

    @abstractmethod
    def get_available_models(self) -> List[str]:
        """Get list of available models."""
        pass

    @abstractmethod
    def supports_agent_type(self, agent_type: str) -> bool:
        """Check if this LLM service supports the given agent type."""
        pass


class IContextManager(ABC):
    """Interface for managing agent context and memory."""

    @abstractmethod
    async def store_context(self, session_id: str, context: AgentContext) -> None:
        """Store agent context."""
        pass

    @abstractmethod
    async def retrieve_context(self, session_id: str) -> Optional[AgentContext]:
        """Retrieve agent context."""
        pass

    @abstractmethod
    async def update_context(self, session_id: str, context: AgentContext) -> None:
        """Update existing agent context."""
        pass

    @abstractmethod
    async def delete_context(self, session_id: str) -> None:
        """Delete agent context."""
        pass

    @abstractmethod
    async def get_relevant_context(
        self, session_id: str, query: str, max_items: int = 5
    ) -> List[Dict[str, Any]]:
        """Get context relevant to the current query."""
        pass

    @abstractmethod
    async def list_sessions_by_agent_type(self, agent_type: str) -> List[str]:
        """List all sessions for a specific agent type."""
        pass


class ICache(ABC):
    """Interface for caching operations."""

    @abstractmethod
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        pass

    @abstractmethod
    async def set(self, key: str, value: Any, ttl: int = 3600) -> None:
        """Set value in cache with TTL."""
        pass

    @abstractmethod
    async def delete(self, key: str) -> None:
        """Delete value from cache."""
        pass

    @abstractmethod
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        pass

    @abstractmethod
    async def clear_pattern(self, pattern: str) -> int:
        """Clear all keys matching pattern."""
        pass

    @abstractmethod
    async def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        pass


class IRateLimiter(ABC):
    """Interface for rate limiting operations."""

    @abstractmethod
    async def acquire(self, resource: str, cost: int = 1) -> bool:
        """Acquire permission to use resource."""
        pass

    @abstractmethod
    async def get_remaining(self, resource: str) -> int:
        """Get remaining quota for resource."""
        pass

    @abstractmethod
    async def reset(self, resource: str) -> None:
        """Reset rate limit for resource."""
        pass

    @abstractmethod
    async def get_rate_limit_info(self, resource: str) -> Dict[str, Any]:
        """Get rate limit information for a resource."""
        pass


class IAgentStrategy(ABC):
    """Interface for agent execution strategies."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Get strategy name."""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Get strategy description."""
        pass

    @property
    @abstractmethod
    def supported_agent_types(self) -> List[str]:
        """Get list of agent types this strategy supports."""
        pass

    @abstractmethod
    async def execute(
        self,
        request: AgentRequest,
        tool_manager: IToolManager,
        llm_service: ILLMService,
        context_manager: IContextManager,
    ) -> AgentResponse:
        """Execute the strategy."""
        pass

    @abstractmethod
    def get_recommended_tools(self, query: str) -> List[str]:
        """Get recommended tools for a query."""
        pass

    @abstractmethod
    def validate_request(self, request: AgentRequest) -> bool:
        """Validate if this strategy can handle the request."""
        pass


class IAgent(ABC):
    """Interface for AI agents."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Get agent name."""
        pass

    @property
    @abstractmethod
    def agent_type(self) -> str:
        """Get agent type."""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Get agent description."""
        pass

    @property
    @abstractmethod
    def capabilities(self) -> List[str]:
        """Get agent capabilities."""
        pass

    @property
    @abstractmethod
    def config(self) -> AgentConfig:
        """Get agent configuration."""
        pass

    @abstractmethod
    async def execute(self, request: AgentRequest) -> AgentResponse:
        """Execute the agent with the given request."""
        pass

    @abstractmethod
    async def validate_request(self, request: AgentRequest) -> bool:
        """Validate if this agent can handle the request."""
        pass

    @abstractmethod
    async def get_status(self) -> Dict[str, Any]:
        """Get current agent status."""
        pass


class IAgentRegistry(ABC):
    """Interface for agent registry."""

    @abstractmethod
    def register_agent(self, agent: IAgent) -> None:
        """Register a new agent."""
        pass

    @abstractmethod
    def get_agent(self, agent_type: str) -> Optional[IAgent]:
        """Get an agent by type."""
        pass

    @abstractmethod
    def list_agent_types(self) -> List[str]:
        """List all available agent types."""
        pass

    @abstractmethod
    def get_agents_by_capability(self, capability: str) -> List[IAgent]:
        """Get agents that have a specific capability."""
        pass

    @abstractmethod
    def get_agent_config(self, agent_type: str) -> Optional[AgentConfig]:
        """Get configuration for an agent type."""
        pass

    @abstractmethod
    def is_agent_available(self, agent_type: str) -> bool:
        """Check if an agent type is available."""
        pass


class IAgentFactory(ABC):
    """Interface for creating agents."""

    @abstractmethod
    async def create_agent(self, agent_type: str, config: Optional[AgentConfig] = None) -> IAgent:
        """Create an agent instance."""
        pass

    @abstractmethod
    def get_supported_types(self) -> List[str]:
        """Get list of supported agent types."""
        pass

    @abstractmethod
    def validate_config(self, config: AgentConfig) -> bool:
        """Validate agent configuration."""
        pass


class IEventHandler(ABC):
    """Interface for handling events."""

    @abstractmethod
    async def handle(self, event_type: str, data: Dict[str, Any]) -> None:
        """Handle an event."""
        pass

    @abstractmethod
    def get_supported_events(self) -> List[str]:
        """Get list of supported event types."""
        pass


class IEventPublisher(ABC):
    """Interface for publishing events."""

    @abstractmethod
    async def publish(self, event_type: str, data: Dict[str, Any]) -> None:
        """Publish an event."""
        pass

    @abstractmethod
    def subscribe(self, event_type: str, handler: IEventHandler) -> None:
        """Subscribe to an event type."""
        pass

    @abstractmethod
    def unsubscribe(self, event_type: str, handler: IEventHandler) -> None:
        """Unsubscribe from an event type."""
        pass


class IHealthCheck(ABC):
    """Interface for health checks."""

    @abstractmethod
    async def check_health(self) -> Dict[str, Any]:
        """Perform health check."""
        pass

    @abstractmethod
    def get_component_name(self) -> str:
        """Get component name for health check."""
        pass


class IMetricsCollector(ABC):
    """Interface for collecting metrics."""

    @abstractmethod
    def increment_counter(self, name: str, labels: Optional[Dict[str, str]] = None) -> None:
        """Increment a counter metric."""
        pass

    @abstractmethod
    def record_histogram(
        self, name: str, value: float, labels: Optional[Dict[str, str]] = None
    ) -> None:
        """Record a histogram metric."""
        pass

    @abstractmethod
    def set_gauge(
        self, name: str, value: float, labels: Optional[Dict[str, str]] = None
    ) -> None:
        """Set a gauge metric."""
        pass

    @abstractmethod
    def get_metrics(self) -> Dict[str, Any]:
        """Get current metrics."""
        pass


# Backward compatibility aliases
IResearchStrategy = IAgentStrategy 