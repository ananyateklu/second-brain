from typing import Dict, Any, List, Optional, Union
import logging
from datetime import datetime
from abc import ABC, abstractmethod

from ..memory import ConversationMemory, TokenCounter, ContextManager
from ..search import WebSearch, NewsSearch, AcademicSearch, PatentSearch, ExpertSearch
from ..tools import ToolExecutor, ToolRegistry
from ..processors import ContentProcessor
from .agent_types import (
    SearchType, AgentResponse, Tool, ExecutionMetadata,
    DEFAULT_RETRY_CONFIG
)
from .agent_exceptions import AgentError, ToolExecutionError
from ..utils.logging_utils import log_api_call

logger = logging.getLogger(__name__)

class BaseAgent(ABC):
    """Abstract base class for AI agents"""
    
    def __init__(
        self,
        model_id: str,
        max_context_tokens: int = 4096,
        max_history: int = 100,
        max_tokens_per_message: int = 1000,
        retry_config: Optional[Dict[str, Any]] = None
    ):
        # Initialize components
        self.model_id = model_id
        self.token_counter = TokenCounter()
        self.conversation_memory = ConversationMemory(
            max_history=max_history,
            max_tokens_per_message=max_tokens_per_message
        )
        self.context_manager = ContextManager(
            max_context_tokens=max_context_tokens,
            token_counter=self.token_counter
        )
        
        # Initialize tools
        self.tool_registry = ToolRegistry()
        self.tool_executor = ToolExecutor(self.tool_registry)
        
        # Initialize search components
        self.web_search = WebSearch()
        self.news_search = NewsSearch()
        self.academic_search = AcademicSearch()
        self.patent_search = PatentSearch()
        self.expert_search = ExpertSearch()
        
        # Initialize processors
        self.content_processor = ContentProcessor()
        
        # Configuration
        self.retry_config = retry_config or DEFAULT_RETRY_CONFIG
        
    @abstractmethod
    async def process_message(
        self,
        message: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AgentResponse:
        """Process a user message and generate a response"""
        pass
        
    @log_api_call
    async def execute_tool(
        self,
        tool: Tool,
        parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute a tool with given parameters"""
        try:
            # Validate tool
            if not self.tool_registry.is_registered(tool["name"]):
                raise ToolExecutionError(f"Tool not registered: {tool['name']}")
                
            # Execute tool
            result = await self.tool_executor.execute(
                tool["name"],
                parameters
            )
            
            # Track usage
            self._track_tool_usage(tool, result)
            
            return result
            
        except Exception as e:
            error_msg = f"Tool execution failed: {str(e)}"
            logger.error(error_msg)
            raise ToolExecutionError(error_msg)
            
    async def search(
        self,
        query: str,
        search_type: SearchType,
        parameters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Execute a search operation"""
        try:
            # Get search component
            search_component = self._get_search_component(search_type)
            
            # Execute search
            result = await search_component.search(
                query,
                **(parameters or {})
            )
            
            # Add to context
            self.context_manager.add_to_context(
                content=result,
                content_type=f"{search_type.value}_search",
                metadata={"query": query}
            )
            
            return result
            
        except Exception as e:
            error_msg = f"Search failed: {str(e)}"
            logger.error(error_msg)
            raise AgentError(error_msg)
            
    def process_file(
        self,
        file_path: str,
        file_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """Process a file and extract content"""
        try:
            # Process file
            result = self.content_processor.process_file(
                file_path,
                file_type=file_type
            )
            
            # Add to context
            self.context_manager.add_to_context(
                content=result,
                content_type="file_content",
                metadata={"file_path": file_path}
            )
            
            return result
            
        except Exception as e:
            error_msg = f"File processing failed: {str(e)}"
            logger.error(error_msg)
            raise AgentError(error_msg)
            
    def get_context(
        self,
        max_tokens: Optional[int] = None,
        content_type: Optional[Union[str, List[str]]] = None
    ) -> List[Dict[str, Any]]:
        """Get current context"""
        return self.context_manager.get_context(
            max_tokens=max_tokens,
            content_type=content_type
        )
        
    def get_conversation_history(
        self,
        last_n: Optional[int] = None,
        role_filter: Optional[Union[str, List[str]]] = None
    ) -> List[Dict[str, Any]]:
        """Get conversation history"""
        return self.conversation_memory.get_history(
            last_n=last_n,
            role_filter=role_filter
        )
        
    def clear_context(self) -> None:
        """Clear current context"""
        self.context_manager.clear_context()
        
    def clear_history(self) -> None:
        """Clear conversation history"""
        self.conversation_memory.clear_history()
        
    def get_token_usage(self) -> Dict[str, Any]:
        """Get token usage statistics"""
        return self.token_counter.get_usage()
        
    def _track_tool_usage(
        self,
        tool: Tool,
        result: Dict[str, Any]
    ) -> None:
        """Track tool usage and update metadata"""
        metadata = ExecutionMetadata(
            timestamp=datetime.utcnow(),
            model_id=self.model_id,
            execution_time=result.get("execution_time", 0.0),
            tools_used=[tool["name"]],
            status=result.get("status", "completed"),
            error=result.get("error")
        )
        
        self.context_manager.update_metadata({
            "last_tool_execution": metadata.__dict__
        })
        
    def _get_search_component(self, search_type: SearchType):
        """Get appropriate search component"""
        components = {
            SearchType.WEB: self.web_search,
            SearchType.NEWS: self.news_search,
            SearchType.ACADEMIC: self.academic_search,
            SearchType.PATENT: self.patent_search,
            SearchType.EXPERT: self.expert_search
        }
        
        if search_type not in components:
            raise AgentError(f"Unknown search type: {search_type}")
            
        return components[search_type] 