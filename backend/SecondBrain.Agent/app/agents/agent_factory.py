"""Agent factory for creating and configuring agent instances."""

from typing import Dict, List, Optional

import structlog

from app.core.interfaces import IAgent, IAgentFactory, IContextManager, ILLMService, IToolManager
from app.core.models import AgentConfig, AgentType

# Import specific agent implementations
from .analysis_agent import AnalysisAgent
from .creative_agent import CreativeAgent
from .research_agent import ResearchAgent
from .summarization_agent import SummarizationAgent

logger = structlog.get_logger(__name__)


class AgentFactory(IAgentFactory):
    """Factory for creating agent instances with proper dependency injection."""

    def __init__(
        self,
        llm_service: ILLMService,
        tool_manager: IToolManager,
        context_manager: IContextManager,
    ):
        """Initialize the agent factory with required services."""
        self.llm_service = llm_service
        self.tool_manager = tool_manager
        self.context_manager = context_manager
        
        # Map of agent types to their implementation classes
        self._agent_classes = {
            AgentType.RESEARCH.value: ResearchAgent,
            AgentType.ANALYSIS.value: AnalysisAgent,
            AgentType.SUMMARIZATION.value: SummarizationAgent,
            AgentType.CREATIVE.value: CreativeAgent,
        }

    async def create_agent(self, agent_type: str, config: Optional[AgentConfig] = None) -> IAgent:
        """Create an agent instance with dependency injection."""
        logger.info("Creating agent",
                   agent_type=agent_type,
                   has_custom_config=config is not None)

        if agent_type not in self._agent_classes:
            available_types = list(self._agent_classes.keys())
            raise ValueError(f"Unsupported agent type: {agent_type}. Available types: {available_types}")

        agent_class = self._agent_classes[agent_type]

        try:
            # Use provided config or get default from agent class
            agent_config = config or agent_class.get_default_config()
            
            # Validate configuration
            if not self.validate_config(agent_config):
                raise ValueError(f"Invalid configuration for agent type: {agent_type}")

            # Create agent instance with dependency injection
            agent = agent_class(
                llm_service=self.llm_service,
                tool_manager=self.tool_manager,
                context_manager=self.context_manager,
                config=agent_config,
            )

            logger.info("Agent created successfully",
                       agent_type=agent_type,
                       agent_name=agent.name,
                       capabilities=agent.capabilities)

            return agent

        except Exception as e:
            logger.error("Failed to create agent",
                        agent_type=agent_type,
                        error=str(e),
                        error_type=type(e).__name__)
            raise

    def get_supported_types(self) -> List[str]:
        """Get list of supported agent types."""
        return list(self._agent_classes.keys())

    def validate_config(self, config: AgentConfig) -> bool:
        """Validate agent configuration."""
        try:
            # Basic validation
            if not config.name:
                logger.warning("Agent config validation failed: empty name")
                return False

            if not config.agent_type:
                logger.warning("Agent config validation failed: missing agent_type")
                return False

            if not config.description:
                logger.warning("Agent config validation failed: empty description")
                return False

            if not config.capabilities:
                logger.warning("Agent config validation failed: no capabilities")
                return False

            if config.default_temperature < 0 or config.default_temperature > 2:
                logger.warning("Agent config validation failed: invalid temperature",
                              temperature=config.default_temperature)
                return False

            if config.max_iterations <= 0:
                logger.warning("Agent config validation failed: invalid max_iterations",
                              max_iterations=config.max_iterations)
                return False

            if config.timeout_seconds <= 0:
                logger.warning("Agent config validation failed: invalid timeout",
                              timeout_seconds=config.timeout_seconds)
                return False

            # Validate that agent type is supported
            if config.agent_type.value not in self._agent_classes:
                logger.warning("Agent config validation failed: unsupported agent type",
                              agent_type=config.agent_type.value,
                              supported_types=list(self._agent_classes.keys()))
                return False

            # Validate tools if specified (warn but don't fail for planned tools)
            if config.default_tools:
                available_tools = self.tool_manager.list_available_tools(config.agent_type.value)
                for tool in config.default_tools:
                    if tool not in available_tools:
                        # Check if it's a planned tool
                        tool_info = self.tool_manager.get_tool_info(tool)
                        if tool_info and tool_info.get("implementation_status") == "planned":
                            logger.info("Agent config includes planned tool",
                                       tool=tool,
                                       agent_type=config.agent_type.value,
                                       status="planned")
                        else:
                            logger.warning("Agent config includes unavailable tool",
                                          tool=tool,
                                          agent_type=config.agent_type.value,
                                          available_tools=available_tools)
                            # Don't fail validation, just warn

            return True

        except Exception as e:
            logger.error("Error during config validation",
                        error=str(e),
                        error_type=type(e).__name__)
            return False

    def get_agent_info(self, agent_type: str) -> Optional[Dict[str, any]]:
        """Get detailed information about an agent type."""
        if agent_type not in self._agent_classes:
            return None

        try:
            agent_class = self._agent_classes[agent_type]
            default_config = agent_class.get_default_config()

            return {
                "agent_type": agent_type,
                "name": default_config.name,
                "description": default_config.description,
                "capabilities": [cap.value for cap in default_config.capabilities],
                "default_tools": default_config.default_tools,
                "default_model": default_config.default_model,
                "default_temperature": default_config.default_temperature,
                "max_iterations": default_config.max_iterations,
                "timeout_seconds": default_config.timeout_seconds,
                "system_prompt": default_config.system_prompt[:200] + "..." if default_config.system_prompt and len(default_config.system_prompt) > 200 else default_config.system_prompt,
                "parameters": default_config.parameters
            }

        except Exception as e:
            logger.error("Error getting agent info",
                        agent_type=agent_type,
                        error=str(e))
            return None

    def register_agent_type(self, agent_type: str, agent_class: type) -> None:
        """Register a new agent type (for extensibility)."""
        logger.info("Registering new agent type",
                   agent_type=agent_type,
                   agent_class=agent_class.__name__)

        self._agent_classes[agent_type] = agent_class

    def unregister_agent_type(self, agent_type: str) -> bool:
        """Unregister an agent type."""
        if agent_type not in self._agent_classes:
            logger.warning("Attempted to unregister non-existent agent type",
                          agent_type=agent_type)
            return False

        logger.info("Unregistering agent type",
                   agent_type=agent_type)

        del self._agent_classes[agent_type]
        return True

    def get_factory_status(self) -> Dict[str, any]:
        """Get factory status and configuration."""
        return {
            "supported_agent_types": list(self._agent_classes.keys()),
            "total_types": len(self._agent_classes),
            "services": {
                "llm_service": type(self.llm_service).__name__,
                "tool_manager": type(self.tool_manager).__name__,
                "context_manager": type(self.context_manager).__name__,
            }
        } 