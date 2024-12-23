from typing import Dict, Any, Optional, List
from ..research_agent import ResearchAgent
import logging

logger = logging.getLogger(__name__)

class BaseSpecializedAgent(ResearchAgent):
    """Base class for all specialized research agents"""
    
    def __init__(self, model_id: str, temperature: float = 0.7):
        super().__init__(model_id, temperature)
        self.domain_expertise = self._get_domain_expertise()
        self.specialized_tools = self._get_specialized_tools()
        self.response_format = self._get_response_format()
        
        # Combine base research tools with specialized tools
        self.available_tools = self.BASE_RESEARCH_TOOLS + self.specialized_tools
        logger.info(f"Initialized specialized agent with {len(self.available_tools)} tools")
        
    def _get_domain_expertise(self) -> Dict[str, Any]:
        """Get domain-specific expertise configuration"""
        raise NotImplementedError("Specialized agents must implement domain expertise")
        
    def _get_specialized_tools(self) -> List[Dict[str, Any]]:
        """Get specialized tools configuration"""
        raise NotImplementedError("Specialized agents must implement specialized tools")
        
    def _get_response_format(self) -> Dict[str, Any]:
        """Get specialized response format"""
        raise NotImplementedError("Specialized agents must implement response format")
        
    def _get_specialized_prompt(self, prompt: str) -> str:
        """Get specialized prompt template"""
        raise NotImplementedError("Specialized agents must implement specialized prompt")
        
    async def execute(self, prompt: str, tools: Optional[List[Dict[str, Any]]] = None, **kwargs) -> Dict[str, Any]:
        """Execute specialized research task"""
        try:
            # Enhance prompt with specialized template
            enhanced_prompt = self._get_specialized_prompt(prompt)
            
            # Execute with combined tools (base + specialized)
            result = await super().execute(
                enhanced_prompt,
                tools=self.available_tools,  # Use all available tools by default
                **kwargs
            )
            
            # Add specialized metadata
            if isinstance(result, dict) and "metadata" in result:
                result["metadata"].update({
                    "agent_type": "specialized",
                    "domain_expertise": self.domain_expertise,
                    "response_format": self.response_format
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Error in specialized agent execution: {str(e)}")
            raise
            
    async def validate_response(self, response: Any) -> bool:
        """Validate specialized agent response"""
        # First use base validation
        if not await super().validate_response(response):
            return False
            
        # Add specialized validation
        try:
            if isinstance(response, dict):
                metadata = response.get("metadata", {})
                
                # Check for specialized fields
                if "domain_expertise" not in metadata:
                    logger.warning("Missing domain expertise in response metadata")
                    return False
                    
                if "response_format" not in metadata:
                    logger.warning("Missing response format in response metadata")
                    return False
                    
                # Validate response format
                result = response.get("result", "")
                if not self._validate_response_format(result):
                    logger.warning("Response format validation failed")
                    return False
                    
            return True
            
        except Exception as e:
            logger.error(f"Error in specialized validation: {str(e)}")
            return False
            
    def _validate_response_format(self, result: str) -> bool:
        """Validate if response follows the required format"""
        raise NotImplementedError("Specialized agents must implement format validation") 