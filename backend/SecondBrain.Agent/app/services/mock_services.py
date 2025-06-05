"""Mock service implementations for development and testing."""

import asyncio
import json
import time
from typing import Any, Dict, List, Optional

from app.core.interfaces import ILLMService, IToolManager, IContextManager
from app.core.models import (
    AgentContext,
    LLMRequest,
    LLMResponse,
    ToolCategory,
    ToolRequest,
    ToolResponse,
    TokenUsage,
)


class MockLLMService(ILLMService):
    """Mock LLM service for development and testing."""
    
    def __init__(self):
        self.models = [
            "gpt-3.5-turbo",
            "gpt-4",
            "claude-3-sonnet",
            "claude-3-haiku",
            "gemini-pro",
            "local-llama"
        ]
    
    async def generate_response(self, request: LLMRequest) -> LLMResponse:
        """Generate a mock response."""
        # Simulate processing time
        await asyncio.sleep(0.5)
        
        # Create a mock response based on the request
        content = f"Mock response for '{request.prompt[:50]}...' using model {request.model}"
        
        if request.agent_type:
            content += f" (Agent: {request.agent_type})"
        
        token_usage = TokenUsage(
            prompt_tokens=len(request.prompt.split()),
            completion_tokens=len(content.split()),
            total_tokens=len(request.prompt.split()) + len(content.split())
        )
        
        return LLMResponse(
            content=content,
            metadata={
                "mock": True,
                "request_id": f"mock_{int(time.time())}",
                "agent_type": request.agent_type
            },
            token_usage=token_usage,
            model=request.model,
            provider="mock",
            execution_time=0.5
        )
    
    async def validate_response(self, response: str) -> bool:
        """Validate the LLM response."""
        return len(response.strip()) > 0
    
    def get_available_models(self) -> List[str]:
        """Get list of available models."""
        return self.models
    
    def supports_agent_type(self, agent_type: str) -> bool:
        """Check if this LLM service supports the given agent type."""
        # Mock service supports all agent types
        return True


class MockToolManager(IToolManager):
    """Mock tool manager for development and testing."""
    
    def __init__(self):
        self.tools = {
            # Research agent tools
            "web_search": {
                "name": "web_search",
                "category": ToolCategory.SEARCH,
                "description": "Search the web for information",
                "parameters": {"query": "string", "max_results": "integer"},
                "supported_agent_types": []
            },
            "academic_search": {
                "name": "academic_search",
                "category": ToolCategory.SEARCH,
                "description": "Search academic papers and publications",
                "parameters": {"query": "string", "year_range": "string"},
                "supported_agent_types": []
            },
            "analysis": {
                "name": "analysis",
                "category": ToolCategory.ANALYSIS,
                "description": "Analyze data and information",
                "parameters": {"data": "object"},
                "supported_agent_types": []
            },
            "synthesis": {
                "name": "synthesis",
                "category": ToolCategory.SYNTHESIS,
                "description": "Synthesize information from multiple sources",
                "parameters": {"sources": "array"},
                "supported_agent_types": []
            },
            
            # Analysis agent tools
            "data_analysis": {
                "name": "data_analysis",
                "category": ToolCategory.ANALYSIS,
                "description": "Perform data analysis and pattern recognition",
                "parameters": {"data": "object", "analysis_type": "string"},
                "supported_agent_types": []
            },
            "statistical_analysis": {
                "name": "statistical_analysis",
                "category": ToolCategory.ANALYSIS,
                "description": "Perform statistical analysis and testing",
                "parameters": {"data": "object", "methods": "array"},
                "supported_agent_types": []
            },
            "visualization": {
                "name": "visualization",
                "category": ToolCategory.ANALYSIS,
                "description": "Create visualizations and charts",
                "parameters": {"data": "object", "chart_type": "string"},
                "supported_agent_types": []
            },
            "interpretation": {
                "name": "interpretation",
                "category": ToolCategory.ANALYSIS,
                "description": "Interpret results and generate insights",
                "parameters": {"results": "object"},
                "supported_agent_types": []
            },
            
            # Summarization agent tools
            "text_analysis": {
                "name": "text_analysis",
                "category": ToolCategory.ANALYSIS,
                "description": "Analyze text structure and content",
                "parameters": {"text": "string"},
                "supported_agent_types": []
            },
            "key_extraction": {
                "name": "key_extraction",
                "category": ToolCategory.EXTRACTION,
                "description": "Extract key points and concepts",
                "parameters": {"content": "string"},
                "supported_agent_types": []
            },
            "structure_analysis": {
                "name": "structure_analysis",
                "category": ToolCategory.ANALYSIS,
                "description": "Analyze document structure and organization",
                "parameters": {"document": "string"},
                "supported_agent_types": []
            },
            
            # Creative agent tools
            "brainstorming": {
                "name": "brainstorming",
                "category": ToolCategory.SYNTHESIS,
                "description": "Generate creative ideas and concepts",
                "parameters": {"topic": "string", "constraints": "object"},
                "supported_agent_types": []
            },
            "creative_writing": {
                "name": "creative_writing",
                "category": ToolCategory.SYNTHESIS,
                "description": "Generate creative written content",
                "parameters": {"style": "string", "topic": "string"},
                "supported_agent_types": []
            },
            "idea_generation": {
                "name": "idea_generation",
                "category": ToolCategory.SYNTHESIS,
                "description": "Generate and develop new ideas",
                "parameters": {"prompt": "string", "context": "object"},
                "supported_agent_types": []
            }
        }
    
    async def execute_tool(self, tool_name: str, request: ToolRequest) -> ToolResponse:
        """Execute a specific tool."""
        start_time = time.time()
        
        # Simulate processing
        await asyncio.sleep(0.3)
        
        if tool_name not in self.tools:
            return ToolResponse.error_response(
                error=f"Tool '{tool_name}' not found",
                execution_time=time.time() - start_time
            )
        
        # Mock successful execution
        result = {
            "tool": tool_name,
            "query": request.query,
            "parameters": request.parameters,
            "result": f"Mock result from {tool_name} tool",
            "mock": True
        }
        
        return ToolResponse.success_response(
            data=result,
            execution_time=time.time() - start_time,
            metadata={
                "tool_name": tool_name,
                "agent_type": request.agent_type
            }
        )
    
    async def execute_tools_parallel(
        self, tool_names: List[str], request: ToolRequest
    ) -> List[ToolResponse]:
        """Execute multiple tools in parallel."""
        tasks = [self.execute_tool(tool_name, request) for tool_name in tool_names]
        return await asyncio.gather(*tasks)
    
    def list_available_tools(self, agent_type: Optional[str] = None) -> List[str]:
        """Get list of available tool names."""
        if agent_type:
            # Filter tools by agent type
            return [
                name for name, tool_info in self.tools.items()
                if not tool_info["supported_agent_types"] or agent_type in tool_info["supported_agent_types"]
            ]
        return list(self.tools.keys())
    
    def get_tool_info(self, tool_name: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific tool."""
        return self.tools.get(tool_name)
    
    def register_tool(self, tool) -> None:
        """Register a new tool."""
        # Mock implementation - just add to tools dict
        self.tools[tool.name] = {
            "name": tool.name,
            "category": tool.category,
            "description": tool.description,
            "parameters": tool._get_parameter_schema(),
            "supported_agent_types": tool.supported_agent_types
        }
    
    def get_tools_by_category(self, category: ToolCategory, agent_type: Optional[str] = None) -> List[str]:
        """Get tools by category."""
        tools = [
            name for name, tool_info in self.tools.items()
            if tool_info["category"] == category
        ]
        
        if agent_type:
            tools = [
                name for name in tools
                if not self.tools[name]["supported_agent_types"] or agent_type in self.tools[name]["supported_agent_types"]
            ]
        
        return tools
    
    def validate_tool_for_agent(self, tool_name: str, agent_type: str) -> bool:
        """Check if a tool can be used by a specific agent type."""
        tool_info = self.tools.get(tool_name)
        if not tool_info:
            return False
        
        supported_types = tool_info["supported_agent_types"]
        return not supported_types or agent_type in supported_types


class MockContextManager(IContextManager):
    """Mock context manager for development and testing."""
    
    def __init__(self):
        self.contexts: Dict[str, AgentContext] = {}
    
    async def store_context(self, session_id: str, context: AgentContext) -> None:
        """Store agent context."""
        self.contexts[session_id] = context
    
    async def retrieve_context(self, session_id: str) -> Optional[AgentContext]:
        """Retrieve agent context."""
        return self.contexts.get(session_id)
    
    async def update_context(self, session_id: str, context: AgentContext) -> None:
        """Update existing agent context."""
        if session_id in self.contexts:
            self.contexts[session_id] = context
    
    async def delete_context(self, session_id: str) -> None:
        """Delete agent context."""
        self.contexts.pop(session_id, None)
    
    async def get_relevant_context(
        self, session_id: str, query: str, max_items: int = 5
    ) -> List[Dict[str, Any]]:
        """Get context relevant to the current query."""
        context = self.contexts.get(session_id)
        if not context:
            return []
        
        # Mock implementation - return recent conversation history
        relevant_items = []
        for entry in context.conversation_history[-max_items:]:
            relevant_items.append({
                "type": "conversation",
                "content": entry.get("content", ""),
                "role": entry.get("role", ""),
                "timestamp": entry.get("timestamp", ""),
                "relevance_score": 0.8  # Mock relevance score
            })
        
        return relevant_items
    
    async def list_sessions_by_agent_type(self, agent_type: str) -> List[str]:
        """List all sessions for a specific agent type."""
        return [
            session_id for session_id, context in self.contexts.items()
            if context.agent_type == agent_type
        ] 