from typing import Dict, Type
from .base_agent import BaseAgent
from .research_agent import ResearchAgent
from .specialized.academic_agent import AcademicResearchAgent
from .specialized.technology_agent import TechnologyIntelligenceAgent
from .base_factory import BaseAgentFactory

class AgentFactory(BaseAgentFactory):
    """Factory class for creating AI agents"""
    
    _specialized_agent_registry: Dict[str, Type[ResearchAgent]] = {
        'research': ResearchAgent,
        'academic': AcademicResearchAgent,
        'technology': TechnologyIntelligenceAgent
    }
    
    @classmethod
    def register_specialized_agent(cls, agent_type: str, agent_class: Type[ResearchAgent]) -> None:
        """Register a new specialized agent type"""
        cls._specialized_agent_registry[agent_type] = agent_class
    
    @classmethod
    def create_agent(cls, model_id: str, temperature: float = 0.7, agent_type: str = 'research') -> BaseAgent:
        """Create an agent instance based on the model ID and agent type"""
        # Create specialized agent if specified
        if agent_type in cls._specialized_agent_registry:
            return cls._specialized_agent_registry[agent_type](model_id, temperature)
            
        # Fall back to base agent creation
        return cls.create_base_agent(model_id, temperature)
    
    @classmethod
    def get_registered_specialized_agents(cls) -> list[str]:
        """Get list of registered specialized agent types"""
        return list(cls._specialized_agent_registry.keys())