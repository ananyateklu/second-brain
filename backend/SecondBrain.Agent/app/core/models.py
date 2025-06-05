"""Core data models for the multi-agent system."""

from __future__ import annotations

import time
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, ConfigDict, Field


class ToolCategory(str, Enum):
    """Categories of available tools."""

    SEARCH = "search"
    ANALYSIS = "analysis"
    EXTRACTION = "extraction"
    SYNTHESIS = "synthesis"
    COMMUNICATION = "communication"
    COMPUTATION = "computation"
    CUSTOM = "custom"


class ToolType(str, Enum):
    """Supported tool types - maintaining compatibility."""

    API_CALL = "api_call"
    DATABASE_QUERY = "database_query"
    FILE_OPERATION = "file_operation"
    CUSTOM = "custom"


class AgentType(str, Enum):
    """Supported agent types."""

    RESEARCH = "research"
    ANALYSIS = "analysis"
    SUMMARIZATION = "summarization"
    CREATIVE = "creative"
    CODING = "coding"
    PLANNING = "planning"
    CUSTOMER_SERVICE = "customer_service"
    ACADEMIC = "academic"
    TECHNICAL = "technical"
    MARKET = "market"


class AgentCapability(str, Enum):
    """Agent capabilities."""

    TEXT_GENERATION = "text_generation"
    RESEARCH = "research"
    ANALYSIS = "analysis"
    REASONING = "reasoning"
    CODING = "coding"
    MULTIMODAL = "multimodal"
    TOOL_USAGE = "tool_usage"
    MEMORY = "memory"
    STREAMING = "streaming"


class Tool(BaseModel):
    """Model for tool configuration - maintains compatibility."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    name: str = Field(..., description="Name of the tool")
    type: ToolType = Field(..., description="Type of tool")
    description: str = Field(..., description="Description of what the tool does")
    parameters: Dict[str, Any] = Field(
        default_factory=dict, description="Tool-specific parameters"
    )
    required_permissions: List[str] = Field(
        default_factory=list, description="Required permissions to use this tool"
    )
    category: ToolCategory = Field(default=ToolCategory.CUSTOM, description="Tool category")


class TokenUsageDetails(BaseModel):
    """Model for detailed token usage information."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    text_tokens: Optional[int] = Field(default=None)
    audio_tokens: Optional[int] = Field(default=None)
    image_tokens: Optional[int] = Field(default=None)
    cached_tokens: Optional[int] = Field(default=None)


class TokenUsage(BaseModel):
    """Model for token usage statistics."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    prompt_tokens: int = Field(default=0)
    completion_tokens: int = Field(default=0)
    total_tokens: int = Field(default=0)
    prompt_tokens_details: Optional[TokenUsageDetails] = Field(default=None)


class ExecutionMetadata(BaseModel):
    """Model for execution metadata."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    model: Optional[str] = Field(default=None)
    execution_time: Optional[float] = Field(default=None)
    prompt: Optional[str] = Field(default=None)
    temperature: Optional[float] = Field(default=None)
    provider: Optional[str] = Field(default=None)
    tools_used: Optional[List[Tool]] = Field(default=None)
    token_usage: Optional[TokenUsage] = Field(default=None)
    request_id: Optional[str] = Field(default=None)
    agent_parameters: Optional[Dict[str, Any]] = Field(default=None)
    agent_type: Optional[str] = Field(default=None)
    base_agent: Optional[str] = Field(default=None)
    tool_success_rate: Optional[Dict[str, Any]] = Field(default=None)
    total_execution_time: Optional[float] = Field(default=None)
    capabilities_used: Optional[List[str]] = Field(default=None)


class AgentConfig(BaseModel):
    """Configuration for an agent type."""

    name: str = Field(..., description="Agent name")
    agent_type: AgentType = Field(..., description="Type of agent")
    description: str = Field(..., description="Agent description")
    capabilities: List[AgentCapability] = Field(..., description="Agent capabilities")
    default_tools: List[str] = Field(default_factory=list, description="Default tools for this agent")
    default_model: str = Field(default="gpt-3.5-turbo", description="Default LLM model")
    default_temperature: float = Field(default=0.7, description="Default temperature")
    max_iterations: int = Field(default=10, description="Maximum iterations")
    timeout_seconds: int = Field(default=300, description="Timeout in seconds")
    system_prompt: Optional[str] = Field(default=None, description="System prompt template")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Agent-specific parameters")


class AgentRequest(BaseModel):
    """Request model for agent execution - supports multiple agent types."""

    prompt: str = Field(..., description="The user's request/prompt")
    model_id: str = Field(..., description="LLM model to use")
    agent_type: str = Field(default="research", description="Type of agent to use")
    temperature: Optional[float] = Field(default=0.7, description="Temperature for LLM")
    max_tokens: Optional[int] = Field(default=None, description="Maximum tokens to generate")
    tools: Optional[List[Dict[str, Any]]] = Field(default=None, description="Tools to use")
    context: Dict[str, Any] = Field(default_factory=dict, description="Additional context")
    session_id: Optional[str] = Field(default=None, description="Session ID for context continuity")
    max_iterations: Optional[int] = Field(default=None, description="Override max iterations")
    timeout_seconds: Optional[int] = Field(default=None, description="Override timeout")
    agent_parameters: Optional[Dict[str, Any]] = Field(default=None, description="Agent-specific parameters")
    streaming: bool = Field(default=False, description="Enable streaming response")


class AgentResponse(BaseModel):
    """Response model for agent execution - supports multiple agent types."""

    result: str = Field(..., description="The agent's response")
    metadata: Dict[str, Any] = Field(..., description="Execution metadata")
    agent_type: str = Field(..., description="Type of agent that handled the request")
    success: bool = Field(default=True, description="Whether execution was successful")
    error: Optional[str] = Field(default=None, description="Error message if execution failed")
    intermediate_steps: Optional[List[Dict[str, Any]]] = Field(default=None, description="Intermediate processing steps")


# Internal models for the new architecture


class ToolRequest(BaseModel):
    """Request model for individual tool execution."""

    query: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    context: Optional[Dict[str, Any]] = None
    agent_type: Optional[str] = Field(default=None, description="Agent type requesting the tool")


class ToolResponse(BaseModel):
    """Response model for individual tool execution."""

    data: Any
    metadata: Dict[str, Any] = Field(default_factory=dict)
    success: bool = True
    execution_time: float = 0.0
    error: Optional[str] = None

    @classmethod
    def success_response(
        cls, data: Any, execution_time: float = 0.0, metadata: Optional[Dict[str, Any]] = None
    ) -> ToolResponse:
        """Create a successful tool response."""
        return cls(
            data=data,
            metadata=metadata or {},
            success=True,
            execution_time=execution_time,
        )

    @classmethod
    def error_response(
        cls, error: str, execution_time: float = 0.0, metadata: Optional[Dict[str, Any]] = None
    ) -> ToolResponse:
        """Create an error tool response."""
        return cls(
            data=None,
            metadata=metadata or {},
            success=False,
            execution_time=execution_time,
            error=error,
        )


class LLMRequest(BaseModel):
    """Request model for LLM service."""

    prompt: str
    model: str = "gpt-3.5-turbo"
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    top_p: Optional[float] = None
    frequency_penalty: Optional[float] = None
    presence_penalty: Optional[float] = None
    tools: Optional[List[Dict[str, Any]]] = None
    context: Optional[str] = None
    system_prompt: Optional[str] = None
    agent_type: Optional[str] = Field(default=None, description="Agent type making the request")
    conversation_history: List[Dict[str, Any]] = Field(default_factory=list, description="Conversation history")


class LLMResponse(BaseModel):
    """Response model for LLM service."""

    content: str
    success: bool = True
    metadata: Dict[str, Any] = Field(default_factory=dict)
    token_usage: Optional[TokenUsage] = None
    model: str
    provider: str
    execution_time: float = 0.0


class AgentContext(BaseModel):
    """Generic context model for agent sessions."""

    session_id: str
    agent_type: str
    conversation_history: List[Dict[str, Any]] = Field(default_factory=list)
    findings: List[Dict[str, Any]] = Field(default_factory=list)
    tools_used: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    def add_finding(self, finding: Dict[str, Any]) -> None:
        """Add a finding to the context."""
        self.findings.append(finding)
        self.updated_at = datetime.utcnow()

    def add_tool_usage(self, tool_name: str) -> None:
        """Record tool usage."""
        if tool_name not in self.tools_used:
            self.tools_used.append(tool_name)
        self.updated_at = datetime.utcnow()

    def add_conversation_entry(self, role: str, content: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        """Add a conversation entry."""
        self.conversation_history.append({
            "role": role,
            "content": content,
            "metadata": metadata or {},
            "timestamp": datetime.utcnow().isoformat()
        })
        self.updated_at = datetime.utcnow()


# Backward compatibility - alias for old ResearchContext
ResearchContext = AgentContext


class AgentStatus(str, Enum):
    """Status of agent execution."""

    IDLE = "idle"
    THINKING = "thinking"
    EXECUTING_TOOL = "executing_tool"
    SYNTHESIZING = "synthesizing"
    COMPLETED = "completed"
    ERROR = "error"


class AgentExecutionContext(BaseModel):
    """Context for agent execution tracking."""

    request_id: str
    agent_type: str
    status: AgentStatus = AgentStatus.IDLE
    current_step: str = ""
    steps_completed: int = 0
    total_steps: int = 0
    start_time: float = Field(default_factory=time.time)
    tools_executed: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
    intermediate_results: List[Dict[str, Any]] = Field(default_factory=list)

    @property
    def execution_time(self) -> float:
        """Get current execution time."""
        return time.time() - self.start_time

    def update_status(self, status: AgentStatus, step: str = "") -> None:
        """Update execution status."""
        self.status = status
        self.current_step = step

    def add_error(self, error: str) -> None:
        """Add an error to the context."""
        self.errors.append(error)

    def add_intermediate_result(self, step: str, result: Any, metadata: Optional[Dict[str, Any]] = None) -> None:
        """Add an intermediate result."""
        self.intermediate_results.append({
            "step": step,
            "result": result,
            "metadata": metadata or {},
            "timestamp": time.time()
        })


class AgentRegistry(BaseModel):
    """Registry of available agents."""

    agents: Dict[str, AgentConfig] = Field(default_factory=dict)

    def register_agent(self, config: AgentConfig) -> None:
        """Register a new agent configuration."""
        self.agents[config.agent_type.value] = config

    def get_agent_config(self, agent_type: str) -> Optional[AgentConfig]:
        """Get configuration for an agent type."""
        return self.agents.get(agent_type)

    def list_agent_types(self) -> List[str]:
        """List all available agent types."""
        return list(self.agents.keys())

    def get_agents_by_capability(self, capability: AgentCapability) -> List[AgentConfig]:
        """Get agents that have a specific capability."""
        return [
            config for config in self.agents.values()
            if capability in config.capabilities
        ] 