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

class TokenUsageDetails(BaseModel):
    """Model for detailed token usage information"""
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    text_tokens: Optional[int] = Field(default=None)
    audio_tokens: Optional[int] = Field(default=None)
    image_tokens: Optional[int] = Field(default=None)
    cached_tokens: Optional[int] = Field(default=None)

class TokenUsage(BaseModel):
    """Model for token usage statistics"""
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    prompt_tokens: int = Field(default=0)
    completion_tokens: int = Field(default=0)
    total_tokens: int = Field(default=0)
    prompt_tokens_details: Optional[TokenUsageDetails] = Field(default=None)

class ExecutionMetadata(BaseModel):
    """Model for execution metadata"""
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    model: Optional[str] = Field(default=None)
    execution_time: Optional[float] = Field(default=None)
    prompt: Optional[str] = Field(default=None)
    temperature: Optional[float] = Field(default=None)
    provider: Optional[str] = Field(default=None)
    tools_used: Optional[List[Tool]] = Field(default=None)
    token_usage: Optional[TokenUsage] = Field(default=None)
    request_id: Optional[str] = Field(default=None)
    research_parameters: Optional[Dict[str, Any]] = Field(default=None)
    agent_type: Optional[str] = Field(default=None)
    base_agent: Optional[str] = Field(default=None)
    tool_success_rate: Optional[Dict[str, Any]] = Field(default=None)

class AgentRequest(BaseModel):
    """Model for agent execution requests"""
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    prompt: str = Field(..., description="The input prompt for the agent")
    model_id: str = Field(..., description="ID of the model to use")
    max_tokens: Optional[int] = Field(default=1000, description="Maximum number of tokens to generate")
    temperature: Optional[float] = Field(default=0.7, description="Temperature for response generation")
    tools: Optional[List[Tool]] = Field(default=None, description="List of tools to use during execution")

class AgentResponse(BaseModel):
    """Model for agent execution responses"""
    model_config = ConfigDict(arbitrary_types_allowed=True)
    
    result: str = Field(..., description="The generated response")
    metadata: Optional[ExecutionMetadata] = Field(default=None, description="Execution metadata")