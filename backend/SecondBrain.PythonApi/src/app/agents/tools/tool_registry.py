from typing import Dict, Any, List, Optional, Type
from ..core.agent_types import Tool, ToolType
from ..core.agent_exceptions import ConfigurationError
import logging

logger = logging.getLogger(__name__)

class ToolRegistry:
    """Central registry for all available tools"""
    
    def __init__(self):
        self._base_tools: Dict[str, Tool] = {}
        self._specialized_tools: Dict[str, Dict[str, Tool]] = {}
        
    def register_base_tool(self, tool_config: Tool) -> None:
        """Register a base tool available to all agents"""
        tool_name = tool_config["name"]
        if tool_name in self._base_tools:
            logger.warning(f"Base tool {tool_name} is being overwritten")
        self._base_tools[tool_name] = tool_config
        
    def register_specialized_tool(self, agent_type: str, tool_config: Tool) -> None:
        """Register a specialized tool for specific agent types"""
        if agent_type not in self._specialized_tools:
            self._specialized_tools[agent_type] = {}
            
        tool_name = tool_config["name"]
        if tool_name in self._specialized_tools[agent_type]:
            logger.warning(f"Specialized tool {tool_name} for {agent_type} is being overwritten")
        self._specialized_tools[agent_type][tool_name] = tool_config
        
    def get_tools_for_agent(self, agent_type: str) -> List[Tool]:
        """Get all tools available for a specific agent type"""
        # Start with base tools
        tools = list(self._base_tools.values())
        
        # Add specialized tools if any
        if agent_type in self._specialized_tools:
            tools.extend(self._specialized_tools[agent_type].values())
            
        return tools
        
    def get_tool_config(self, tool_name: str, agent_type: Optional[str] = None) -> Optional[Tool]:
        """Get configuration for a specific tool"""
        # Check specialized tools first if agent type is provided
        if agent_type and agent_type in self._specialized_tools:
            tool = self._specialized_tools[agent_type].get(tool_name)
            if tool:
                return tool
                
        # Fall back to base tools
        return self._base_tools.get(tool_name)
        
    def validate_tool_config(self, tool_config: Tool) -> bool:
        """Validate a tool configuration"""
        required_fields = ["name", "type", "description"]
        if not all(field in tool_config for field in required_fields):
            return False
            
        if tool_config["type"] not in [t.value for t in ToolType]:
            return False
            
        return True
        
    def register_tools_from_config(self, config: Dict[str, Any]) -> None:
        """Register multiple tools from a configuration dictionary"""
        base_tools = config.get("base_tools", [])
        for tool_config in base_tools:
            if self.validate_tool_config(tool_config):
                self.register_base_tool(tool_config)
            else:
                raise ConfigurationError(f"Invalid base tool configuration: {tool_config}")
                
        specialized_tools = config.get("specialized_tools", {})
        for agent_type, tools in specialized_tools.items():
            for tool_config in tools:
                if self.validate_tool_config(tool_config):
                    self.register_specialized_tool(agent_type, tool_config)
                else:
                    raise ConfigurationError(
                        f"Invalid specialized tool configuration for {agent_type}: {tool_config}"
                    )
                    
    def list_all_tools(self) -> Dict[str, List[str]]:
        """List all registered tools by category"""
        return {
            "base_tools": list(self._base_tools.keys()),
            "specialized_tools": {
                agent_type: list(tools.keys())
                for agent_type, tools in self._specialized_tools.items()
            }
        }
        
    def clear_registry(self) -> None:
        """Clear all registered tools"""
        self._base_tools.clear()
        self._specialized_tools.clear() 