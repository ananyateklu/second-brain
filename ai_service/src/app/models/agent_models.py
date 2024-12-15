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
    name: str = Field(..., description="Name of the tool")
    type: ToolType = Field(..., description="Type of tool")
    description: str = Field(..., description="Description of what the tool does")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Tool-specific parameters")
    required_permissions: List[str] = Field(default_factory=list, description="Required permissions to use this tool")

class AgentRequest(BaseModel):
    """Model for agent execution requests"""
    model_config = ConfigDict(
        protected_namespaces=(),
        json_schema_extra={
            "example": {
                "prompt": "Research the impact of AI on healthcare",
                "model_id": "gpt-4",
                "max_tokens": 1000,
                "temperature": 0.7,
                "tools": [
                    {
                        "name": "medical_database",
                        "type": "database_query",
                        "description": "Query medical research database",
                        "parameters": {
                            "database_url": "https://example.com/medical-db",
                            "api_key": "YOUR_API_KEY"
                        },
                        "required_permissions": ["database_read"]
                    }
                ]
            }
        }
    )
    
    prompt: str = Field(..., description="The input prompt for the agent")
    model_id: str = Field(..., description="ID of the model to use")
    max_tokens: Optional[int] = Field(default=1000, description="Maximum number of tokens to generate")
    temperature: Optional[float] = Field(default=0.7, description="Temperature for response generation")
    tools: Optional[List[Tool]] = Field(default=None, description="List of tools to use during execution")
    
class TokenUsageDetails(BaseModel):
    """Model for detailed token usage information"""
    text_tokens: Optional[int] = None
    audio_tokens: Optional[int] = None
    image_tokens: Optional[int] = None
    cached_tokens: Optional[int] = None

class TokenUsage(BaseModel):
    """Model for token usage statistics"""
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    prompt_tokens_details: Optional[TokenUsageDetails] = None

class ExecutionMetadata(BaseModel):
    """Model for execution metadata"""
    model: str = Field(..., description="Model used for execution")
    execution_time: float = Field(..., description="Time taken for execution in seconds")
    prompt: str = Field(..., description="Original prompt")
    temperature: float = Field(..., description="Temperature used")
    provider: str = Field(..., description="Provider of the model")
    tools_used: Optional[List[Tool]] = Field(default=None, description="Tools used during execution")
    token_usage: Optional[TokenUsage] = Field(default=None, description="Token usage statistics")
    request_id: Optional[str] = Field(default=None, description="Unique request identifier")
    research_parameters: Optional[Dict[str, Any]] = Field(default=None, description="Research-specific parameters")
    agent_type: Optional[str] = Field(default=None, description="Type of agent used")
    base_agent: Optional[str] = Field(default=None, description="Base agent type")
    tool_success_rate: Optional[Dict[str, Any]] = Field(default=None, description="Tool execution success statistics")
    
class AgentResponse(BaseModel):
    """Model for agent execution responses"""
    result: str = Field(..., description="The generated response")
    metadata: Optional[ExecutionMetadata] = Field(default=None, description="Execution metadata")