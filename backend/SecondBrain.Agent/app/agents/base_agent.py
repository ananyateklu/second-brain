"""Base agent implementation providing common functionality for all agent types."""

import time
import uuid
from abc import ABC, abstractmethod
from typing import Dict, List, Optional

import structlog

from app.core.interfaces import IAgent, IContextManager, ILLMService, IToolManager
from app.core.models import (
    AgentConfig,
    AgentExecutionContext,
    AgentRequest,
    AgentResponse,
    AgentStatus,
    ExecutionMetadata,
)

logger = structlog.get_logger(__name__)


class BaseAgent(IAgent, ABC):
    """Base agent class providing common functionality."""

    def __init__(
        self,
        llm_service: ILLMService,
        tool_manager: IToolManager,
        context_manager: IContextManager,
        config: Optional[AgentConfig] = None,
    ):
        """Initialize the base agent."""
        self.llm_service = llm_service
        self.tool_manager = tool_manager
        self.context_manager = context_manager
        self._config = config or self.get_default_config()

    @property
    def name(self) -> str:
        """Get agent name."""
        return self._config.name

    @property
    def agent_type(self) -> str:
        """Get agent type."""
        return self._config.agent_type.value

    @property
    def description(self) -> str:
        """Get agent description."""
        return self._config.description

    @property
    def capabilities(self) -> List[str]:
        """Get agent capabilities."""
        return [cap.value for cap in self._config.capabilities]

    @property
    def config(self) -> AgentConfig:
        """Get agent configuration."""
        return self._config

    @classmethod
    @abstractmethod
    def get_default_config(cls) -> AgentConfig:
        """Get default configuration for this agent type."""
        pass

    async def execute(self, request: AgentRequest) -> AgentResponse:
        """Execute the agent with the given request."""
        request_id = f"req_{uuid.uuid4().hex[:8]}"
        
        # Create execution context
        exec_context = AgentExecutionContext(
            request_id=request_id,
            agent_type=self.agent_type,
            status=AgentStatus.IDLE
        )

        logger.info("Agent execution started",
                   request_id=request_id,
                   agent_type=self.agent_type,
                   agent_name=self.name,
                   prompt_length=len(request.prompt))

        try:
            # Validate request
            exec_context.update_status(AgentStatus.THINKING, "Validating request")
            
            if not await self.validate_request(request):
                raise ValueError("Invalid request for this agent type")

            # Prepare context if session_id provided
            if request.session_id:
                await self._prepare_session_context(request.session_id, request)

            # Execute agent-specific logic
            exec_context.update_status(AgentStatus.EXECUTING_TOOL, "Executing agent logic")
            result = await self._execute_internal(request, exec_context)

            # Update context if session_id provided
            if request.session_id:
                await self._update_session_context(request.session_id, request, result)

            # Mark as completed
            exec_context.update_status(AgentStatus.COMPLETED, "Execution completed")

            # Create response
            response = AgentResponse(
                result=result,
                metadata=self._create_execution_metadata(request, exec_context),
                agent_type=self.agent_type,
                success=True,
                intermediate_steps=[
                    {
                        "step": result["step"],
                        "result": result["result"],
                        "metadata": result["metadata"],
                        "timestamp": result["timestamp"]
                    }
                    for result in exec_context.intermediate_results
                ]
            )

            logger.info("Agent execution completed successfully",
                       request_id=request_id,
                       agent_type=self.agent_type,
                       execution_time=exec_context.execution_time,
                       tools_used=exec_context.tools_executed)

            return response

        except Exception as e:
            exec_context.update_status(AgentStatus.ERROR, f"Error: {str(e)}")
            exec_context.add_error(str(e))

            logger.error("Agent execution failed",
                        request_id=request_id,
                        agent_type=self.agent_type,
                        execution_time=exec_context.execution_time,
                        error=str(e),
                        error_type=type(e).__name__)

            # Return error response
            return AgentResponse(
                result=f"Agent execution failed: {str(e)}",
                metadata=self._create_execution_metadata(request, exec_context),
                agent_type=self.agent_type,
                success=False,
                error=str(e)
            )

    @abstractmethod
    async def _execute_internal(self, request: AgentRequest, exec_context: AgentExecutionContext) -> str:
        """Execute agent-specific logic. Must be implemented by subclasses."""
        pass

    async def validate_request(self, request: AgentRequest) -> bool:
        """Validate if this agent can handle the request."""
        # Basic validation - can be overridden by subclasses
        if not request.prompt:
            return False
        
        if not request.model_id:
            return False

        # Check if tools are supported
        if request.tools:
            for tool_config in request.tools:
                tool_name = tool_config.get("name") if isinstance(tool_config, dict) else str(tool_config)
                if not self.tool_manager.validate_tool_for_agent(tool_name, self.agent_type):
                    logger.warning("Tool not supported for agent",
                                  tool_name=tool_name,
                                  agent_type=self.agent_type)
                    return False

        return True

    async def get_status(self) -> Dict[str, any]:
        """Get current agent status."""
        return {
            "agent_type": self.agent_type,
            "name": self.name,
            "description": self.description,
            "capabilities": self.capabilities,
            "status": "available",
            "config": {
                "default_model": self._config.default_model,
                "default_temperature": self._config.default_temperature,
                "max_iterations": self._config.max_iterations,
                "timeout_seconds": self._config.timeout_seconds,
                "default_tools": self._config.default_tools
            }
        }

    async def _prepare_session_context(self, session_id: str, request: AgentRequest) -> None:
        """Prepare session context for the request."""
        try:
            context = await self.context_manager.retrieve_context(session_id)
            if context:
                # Add current request to conversation history
                context.add_conversation_entry("user", request.prompt, {
                    "model_id": request.model_id,
                    "agent_type": self.agent_type,
                    "tools": request.tools
                })
                await self.context_manager.update_context(session_id, context)

        except Exception as e:
            logger.warning("Failed to prepare session context",
                          session_id=session_id,
                          error=str(e))

    async def _update_session_context(self, session_id: str, request: AgentRequest, result: str) -> None:
        """Update session context with the response."""
        try:
            context = await self.context_manager.retrieve_context(session_id)
            if context:
                # Add agent response to conversation history
                context.add_conversation_entry("assistant", result, {
                    "agent_type": self.agent_type,
                    "model_id": request.model_id
                })
                await self.context_manager.update_context(session_id, context)

        except Exception as e:
            logger.warning("Failed to update session context",
                          session_id=session_id,
                          error=str(e))

    def _create_execution_metadata(self, request: AgentRequest, exec_context: AgentExecutionContext) -> Dict[str, any]:
        """Create execution metadata."""
        return {
            "request_id": exec_context.request_id,
            "agent_type": self.agent_type,
            "agent_name": self.name,
            "execution_time": exec_context.execution_time,
            "model": request.model_id,
            "temperature": request.temperature,
            "tools_used": exec_context.tools_executed,
            "steps_completed": exec_context.steps_completed,
            "total_steps": exec_context.total_steps,
            "status": exec_context.status.value,
            "errors": exec_context.errors,
            "capabilities_used": self.capabilities,
            "session_id": request.session_id,
            "agent_parameters": request.agent_parameters
        } 