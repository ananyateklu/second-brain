from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any
from enum import Enum

class ToolType(str, Enum):
    """Supported tool types"""
    API_CALL = "api_call"
    DATABASE_QUERY = "database_query"
    FILE_OPERATION = "file_operation"
    CUSTOM = "custom"

class Tool(BaseModel):
    """Model for tool configuration"""
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    name: str = Field(..., description="Name of the tool")
    type: ToolType = Field(..., description="Type of tool")
    description: str = Field(..., description="Description of what the tool does")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Tool-specific parameters")
    required_permissions: List[str] = Field(default_factory=list, description="Required permissions to use this tool")

class AgentRequest(BaseModel):
    """Request model for agent execution"""
    prompt: str
    model_id: str
    agent_type: str = 'research'  # Default to base research agent
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = None
    tools: Optional[List[Dict[str, Any]]] = None
    context: Dict[str, Any] = Field(default_factory=dict)  # Add context field

class AgentResponse(BaseModel):
    """Response model for agent execution"""
    result: str
    metadata: Dict[str, Any]