from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict

class AgentRequest(BaseModel):
    """Model for agent execution requests"""
    model_config = ConfigDict(protected_namespaces=())
    
    prompt: str
    model_id: str
    max_tokens: Optional[int] = 1000
    temperature: Optional[float] = 0.7
    tools: Optional[List[Dict]] = None
    
class AgentResponse(BaseModel):
    """Model for agent execution responses"""
    result: str
    metadata: Optional[Dict] = None 