from typing import Dict, Any, List, Optional, Callable, Awaitable
import logging
from ..core.agent_types import Tool, ToolType
from ..core.agent_exceptions import ToolExecutionError
from ..utils.logging_utils import log_tool_execution, log_error
from .tool_registry import ToolRegistry

logger = logging.getLogger(__name__)

class ToolExecutor:
    """Handles execution of agent tools"""
    
    def __init__(self, tool_registry: ToolRegistry):
        self._tools: Dict[str, Callable[..., Awaitable[Any]]] = {}
        self._tool_configs: Dict[str, Tool] = {}
        self._registry = tool_registry
        
    def register_tool(self, tool_config: Tool, handler: Callable[..., Awaitable[Any]]) -> None:
        """Register a new tool with its handler"""
        tool_name = tool_config["name"]
        if tool_name in self._tools:
            logger.warning(f"Tool {tool_name} is being overwritten")
            
        self._tools[tool_name] = handler
        self._tool_configs[tool_name] = tool_config
        logger.info(f"Registered tool: {tool_name}")
        
    def get_tool_config(self, tool_name: str) -> Optional[Tool]:
        """Get the configuration for a specific tool"""
        return self._tool_configs.get(tool_name)
        
    def list_tools(self) -> List[str]:
        """List all registered tools"""
        return list(self._tools.keys())
        
    def get_tool_descriptions(self) -> List[Dict[str, Any]]:
        """Get descriptions of all registered tools"""
        return [
            {
                "name": name,
                "description": config.get("description", "No description available"),
                "type": config.get("type", "unknown"),
                "parameters": config.get("parameters", {})
            }
            for name, config in self._tool_configs.items()
        ]
        
    async def execute_tool(self, tool: Dict[str, Any]) -> Any:
        """Execute a tool and return the result"""
        try:
            tool_name = tool.get("name")
            if not tool_name:
                raise ToolExecutionError("Tool name not specified")
                
            handler = self._tools.get(tool_name)
            if not handler:
                raise ToolExecutionError(f"Unknown tool: {tool_name}")
                
            tool_config = self._tool_configs[tool_name]
            parameters = tool.get("parameters", {})
            
            # Log tool execution
            log_tool_execution(tool_name, parameters)
            
            # Validate tool type
            tool_type = tool_config.get("type")
            if not tool_type:
                raise ToolExecutionError("Tool type not specified")
                
            if tool_type not in [t.value for t in ToolType]:
                raise ToolExecutionError(f"Unsupported tool type: {tool_type}")
                
            # Execute the tool
            result = await handler(parameters)
            return result
            
        except Exception as e:
            log_error(e, {"tool": tool})
            raise ToolExecutionError(f"Tool execution failed: {str(e)}")
            
    def validate_tool_parameters(self, tool_name: str, parameters: Dict[str, Any]) -> bool:
        """Validate parameters for a specific tool"""
        tool_config = self._tool_configs.get(tool_name)
        if not tool_config:
            return False
            
        required_params = {
            name: param_config
            for name, param_config in tool_config.get("parameters", {}).items()
            if param_config.get("required", False)
        }
        
        return all(param in parameters for param in required_params)
        
    def check_tool_permissions(self, tool_name: str, available_permissions: List[str]) -> bool:
        """Check if all required permissions for a tool are available"""
        tool_config = self._tool_configs.get(tool_name)
        if not tool_config:
            return False
            
        required_permissions = tool_config.get("required_permissions", [])
        return all(perm in available_permissions for perm in required_permissions) 