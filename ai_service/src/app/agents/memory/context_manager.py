from typing import Dict, Any, List, Optional, Union
import logging
from datetime import datetime
from .token_counter import TokenCounter
from ..core.agent_exceptions import ContextError
from ..utils.logging_utils import log_api_call

logger = logging.getLogger(__name__)

class ContextManager:
    """Context window management"""
    
    def __init__(
        self,
        max_context_tokens: int = 4096,
        token_counter: Optional[TokenCounter] = None
    ):
        self.max_context_tokens = max_context_tokens
        self.token_counter = token_counter or TokenCounter()
        self.context = []
        self.metadata = {}
        
    @log_api_call
    def add_to_context(
        self,
        content: Union[str, Dict[str, Any], List[Any]],
        content_type: str = "message",
        metadata: Optional[Dict[str, Any]] = None,
        priority: int = 0
    ) -> None:
        """Add content to context window"""
        try:
            # Format content
            context_item = {
                "content": content,
                "type": content_type,
                "priority": priority,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            if metadata:
                context_item["metadata"] = metadata
                
            # Add to context
            self.context.append(context_item)
            
            # Trim context if needed
            self._trim_context()
            
        except Exception as e:
            error_msg = f"Failed to add to context: {str(e)}"
            logger.error(error_msg)
            raise ContextError(error_msg)
            
    def get_context(
        self,
        max_tokens: Optional[int] = None,
        content_type: Optional[Union[str, List[str]]] = None,
        min_priority: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Get context items within token limit"""
        try:
            # Apply filters
            filtered = self.context
            
            if content_type:
                if isinstance(content_type, str):
                    content_type = [content_type]
                filtered = [
                    item for item in filtered
                    if item["type"] in content_type
                ]
                
            if min_priority is not None:
                filtered = [
                    item for item in filtered
                    if item["priority"] >= min_priority
                ]
                
            # Sort by priority and timestamp
            filtered.sort(
                key=lambda x: (-x["priority"], x["timestamp"])
            )
            
            # Apply token limit
            if max_tokens or self.max_context_tokens:
                limit = max_tokens or self.max_context_tokens
                return self._fit_to_token_limit(filtered, limit)
                
            return filtered
            
        except Exception as e:
            error_msg = f"Failed to get context: {str(e)}"
            logger.error(error_msg)
            raise ContextError(error_msg)
            
    def clear_context(
        self,
        content_type: Optional[Union[str, List[str]]] = None
    ) -> None:
        """Clear context items"""
        try:
            if content_type:
                if isinstance(content_type, str):
                    content_type = [content_type]
                self.context = [
                    item for item in self.context
                    if item["type"] not in content_type
                ]
            else:
                self.context = []
                
        except Exception as e:
            error_msg = f"Failed to clear context: {str(e)}"
            logger.error(error_msg)
            raise ContextError(error_msg)
            
    def update_priorities(
        self,
        priority_updates: Dict[int, int]
    ) -> None:
        """Update priorities of context items"""
        try:
            for i, new_priority in priority_updates.items():
                if 0 <= i < len(self.context):
                    self.context[i]["priority"] = new_priority
                    
            # Re-trim context after priority updates
            self._trim_context()
            
        except Exception as e:
            error_msg = f"Failed to update priorities: {str(e)}"
            logger.error(error_msg)
            raise ContextError(error_msg)
            
    def merge_contexts(
        self,
        other_context: List[Dict[str, Any]],
        merge_strategy: str = "append"
    ) -> None:
        """Merge another context into this one"""
        try:
            if merge_strategy == "append":
                self.context.extend(other_context)
            elif merge_strategy == "prepend":
                self.context = other_context + self.context
            elif merge_strategy == "priority":
                # Merge and sort by priority
                self.context.extend(other_context)
                self.context.sort(key=lambda x: (-x["priority"], x["timestamp"]))
            else:
                raise ContextError(f"Unknown merge strategy: {merge_strategy}")
                
            # Trim merged context
            self._trim_context()
            
        except Exception as e:
            error_msg = f"Context merge failed: {str(e)}"
            logger.error(error_msg)
            raise ContextError(error_msg)
            
    def summarize_context(
        self,
        max_length: Optional[int] = None
    ) -> Dict[str, Any]:
        """Generate context summary"""
        try:
            summary = {
                "total_items": len(self.context),
                "types": self._count_types(),
                "token_usage": self._get_token_usage(),
                "priority_distribution": self._get_priority_distribution()
            }
            
            if max_length:
                # Generate text summary
                items = [
                    f"{item['type']}: {str(item['content'])[:50]}..."
                    for item in self.context[-max_length:]
                ]
                summary["text"] = "\n".join(items)
                
            return summary
            
        except Exception as e:
            error_msg = f"Context summarization failed: {str(e)}"
            logger.error(error_msg)
            raise ContextError(error_msg)
            
    def _trim_context(self) -> None:
        """Trim context to fit token limit"""
        while self.context:
            total_tokens = sum(
                self.token_counter.count_tokens(item["content"])
                for item in self.context
            )
            
            if total_tokens <= self.max_context_tokens:
                break
                
            # Remove lowest priority items first
            min_priority_item = min(
                enumerate(self.context),
                key=lambda x: (x[1]["priority"], x[0])
            )
            self.context.pop(min_priority_item[0])
            
    def _fit_to_token_limit(
        self,
        items: List[Dict[str, Any]],
        limit: int
    ) -> List[Dict[str, Any]]:
        """Filter items to fit within token limit"""
        result = []
        total_tokens = 0
        
        for item in items:
            tokens = self.token_counter.count_tokens(item["content"])
            if total_tokens + tokens <= limit:
                result.append(item)
                total_tokens += tokens
            else:
                break
                
        return result
        
    def _count_types(self) -> Dict[str, int]:
        """Count items by type"""
        counts = {}
        for item in self.context:
            type_ = item["type"]
            counts[type_] = counts.get(type_, 0) + 1
        return counts
        
    def _get_token_usage(self) -> Dict[str, int]:
        """Get token usage statistics"""
        usage = {
            "total": 0,
            "by_type": {}
        }
        
        for item in self.context:
            tokens = self.token_counter.count_tokens(item["content"])
            usage["total"] += tokens
            
            type_ = item["type"]
            if type_ not in usage["by_type"]:
                usage["by_type"][type_] = 0
            usage["by_type"][type_] += tokens
            
        return usage
        
    def _get_priority_distribution(self) -> Dict[int, int]:
        """Get distribution of priorities"""
        distribution = {}
        for item in self.context:
            priority = item["priority"]
            distribution[priority] = distribution.get(priority, 0) + 1
        return distribution 