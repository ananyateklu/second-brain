"""Agent registry for managing and discovering available agents."""

from typing import Dict, List, Optional

import structlog

from app.core.interfaces import IAgent, IAgentRegistry
from app.core.models import AgentConfig

logger = structlog.get_logger(__name__)


class AgentRegistry(IAgentRegistry):
    """Registry for managing available agents."""

    def __init__(self):
        """Initialize the agent registry."""
        self._agents: Dict[str, IAgent] = {}
        self._configs: Dict[str, AgentConfig] = {}

    def register_agent(self, agent: IAgent) -> None:
        """Register a new agent."""
        agent_type = agent.agent_type
        
        logger.info("Registering agent",
                   agent_type=agent_type,
                   agent_name=agent.name,
                   capabilities=agent.capabilities)
        
        self._agents[agent_type] = agent
        self._configs[agent_type] = agent.config

    def get_agent(self, agent_type: str) -> Optional[IAgent]:
        """Get an agent by type."""
        return self._agents.get(agent_type)

    def list_agent_types(self) -> List[str]:
        """List all available agent types."""
        return list(self._agents.keys())

    def get_agents_by_capability(self, capability: str) -> List[IAgent]:
        """Get agents that have a specific capability."""
        matching_agents = []
        
        for agent in self._agents.values():
            if capability in agent.capabilities:
                matching_agents.append(agent)
        
        logger.debug("Found agents with capability",
                    capability=capability,
                    agent_count=len(matching_agents),
                    agent_types=[agent.agent_type for agent in matching_agents])
        
        return matching_agents

    def get_agent_config(self, agent_type: str) -> Optional[AgentConfig]:
        """Get configuration for an agent type."""
        return self._configs.get(agent_type)

    def is_agent_available(self, agent_type: str) -> bool:
        """Check if an agent type is available."""
        return agent_type in self._agents

    def get_agent_status(self, agent_type: str) -> Optional[Dict[str, any]]:
        """Get status information for an agent."""
        agent = self._agents.get(agent_type)
        if not agent:
            return None
        
        # This would typically be async, but for simplicity keeping it sync
        # In real implementation, you might want to make this async
        try:
            # Mock status for now since get_status is async
            return {
                "agent_type": agent_type,
                "name": agent.name,
                "description": agent.description,
                "capabilities": agent.capabilities,
                "status": "available",
                "registered": True
            }
        except Exception as e:
            logger.error("Error getting agent status",
                        agent_type=agent_type,
                        error=str(e))
            return {
                "agent_type": agent_type,
                "status": "error",
                "error": str(e)
            }

    def get_registry_summary(self) -> Dict[str, any]:
        """Get a summary of all registered agents."""
        return {
            "total_agents": len(self._agents),
            "agent_types": list(self._agents.keys()),
            "agents": {
                agent_type: {
                    "name": agent.name,
                    "description": agent.description,
                    "capabilities": agent.capabilities
                }
                for agent_type, agent in self._agents.items()
            }
        }

    def unregister_agent(self, agent_type: str) -> bool:
        """Unregister an agent."""
        if agent_type not in self._agents:
            logger.warning("Attempted to unregister non-existent agent",
                          agent_type=agent_type)
            return False
        
        logger.info("Unregistering agent",
                   agent_type=agent_type,
                   agent_name=self._agents[agent_type].name)
        
        del self._agents[agent_type]
        self._configs.pop(agent_type, None)
        
        return True

    def clear_registry(self) -> None:
        """Clear all registered agents."""
        logger.info("Clearing agent registry",
                   agents_removed=len(self._agents))
        
        self._agents.clear()
        self._configs.clear()

    def validate_registry(self) -> Dict[str, any]:
        """Validate all registered agents and return status."""
        validation_results = {
            "valid_agents": [],
            "invalid_agents": [],
            "total_agents": len(self._agents),
            "validation_errors": []
        }
        
        for agent_type, agent in self._agents.items():
            try:
                # Basic validation checks
                if not agent.name:
                    raise ValueError("Agent name is empty")
                
                if not agent.description:
                    raise ValueError("Agent description is empty")
                
                if not agent.capabilities:
                    raise ValueError("Agent has no capabilities")
                
                if agent.agent_type != agent_type:
                    raise ValueError(f"Agent type mismatch: {agent.agent_type} != {agent_type}")
                
                validation_results["valid_agents"].append(agent_type)
                
            except Exception as e:
                logger.error("Agent validation failed",
                            agent_type=agent_type,
                            error=str(e))
                
                validation_results["invalid_agents"].append({
                    "agent_type": agent_type,
                    "error": str(e)
                })
                validation_results["validation_errors"].append(str(e))
        
        validation_results["is_valid"] = len(validation_results["invalid_agents"]) == 0
        
        logger.info("Registry validation completed",
                   total_agents=validation_results["total_agents"],
                   valid_agents=len(validation_results["valid_agents"]),
                   invalid_agents=len(validation_results["invalid_agents"]),
                   is_valid=validation_results["is_valid"])
        
        return validation_results 