from typing import Dict, Any, List, Optional, Union
import logging
from datetime import datetime
from ..core.agent_exceptions import MemoryError
from ..utils.logging_utils import log_api_call

logger = logging.getLogger(__name__)

class ConversationMemory:
    """Conversation history and memory management"""
    
    def __init__(
        self,
        max_history: int = 100,
        max_tokens_per_message: int = 1000
    ):
        self.max_history = max_history
        self.max_tokens_per_message = max_tokens_per_message
        self.history = []
        self.metadata = {}
        
    @log_api_call
    def add_message(
        self,
        message: Union[str, Dict[str, Any]],
        role: str = "user",
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Add message to conversation history"""
        try:
            # Format message if string
            if isinstance(message, str):
                message_obj = {
                    "role": role,
                    "content": message,
                    "timestamp": datetime.utcnow().isoformat(),
                    "metadata": metadata or {}
                }
            else:
                message_obj = {
                    **message,
                    "role": role,
                    "timestamp": datetime.utcnow().isoformat(),
                    "metadata": {**(message.get("metadata", {})), **(metadata or {})}
                }
            
            # Add to history
            self.history.append(message_obj)
            
            # Trim history if needed
            if len(self.history) > self.max_history:
                self.history = self.history[-self.max_history:]
                
        except Exception as e:
            logger.error(f"Error adding message to history: {str(e)}")
            raise MemoryError(f"Failed to add message: {str(e)}")
            
    def get_history(self) -> List[Dict[str, Any]]:
        """Get conversation history"""
        return self.history
            
    def clear_history(self) -> None:
        """Clear conversation history"""
        try:
            self.history = []
            
        except Exception as e:
            error_msg = f"Failed to clear history: {str(e)}"
            logger.error(error_msg)
            raise MemoryError(error_msg)
            
    def get_context_window(
        self,
        max_tokens: int,
        include_system: bool = True
    ) -> List[Dict[str, Any]]:
        """Get messages that fit within token limit"""
        try:
            context = []
            token_count = 0
            
            # Add system messages first if requested
            if include_system:
                system_messages = [
                    msg for msg in self.history
                    if msg["role"] == "system"
                ]
                for msg in system_messages:
                    tokens = self._estimate_tokens(msg["content"])
                    if token_count + tokens <= max_tokens:
                        context.append(msg)
                        token_count += tokens
                        
            # Add recent messages
            for msg in reversed(self.history):
                if msg["role"] == "system":
                    continue
                    
                tokens = self._estimate_tokens(msg["content"])
                if token_count + tokens <= max_tokens:
                    context.insert(0, msg)
                    token_count += tokens
                else:
                    break
                    
            return context
            
        except Exception as e:
            error_msg = f"Failed to get context window: {str(e)}"
            logger.error(error_msg)
            raise MemoryError(error_msg)
            
    def summarize_history(
        self,
        max_length: Optional[int] = None
    ) -> Dict[str, Any]:
        """Generate conversation summary"""
        try:
            summary = {
                "message_count": len(self.history),
                "roles": self._count_roles(),
                "timespan": self._get_timespan(),
                "topics": self._extract_topics()
            }
            
            if max_length:
                # Generate text summary
                messages = [
                    f"{msg['role']}: {msg['content'][:50]}..."
                    for msg in self.history[-max_length:]
                ]
                summary["text"] = "\n".join(messages)
                
            return summary
            
        except Exception as e:
            error_msg = f"Failed to summarize history: {str(e)}"
            logger.error(error_msg)
            raise MemoryError(error_msg)
            
    def search_history(
        self,
        query: str,
        max_results: int = 5
    ) -> List[Dict[str, Any]]:
        """Search conversation history"""
        try:
            # Simple keyword search
            results = []
            query = query.lower()
            
            for msg in self.history:
                content = msg["content"].lower()
                if query in content:
                    score = content.count(query)
                    results.append({
                        "message": msg,
                        "score": score
                    })
                    
            # Sort by relevance
            results.sort(key=lambda x: x["score"], reverse=True)
            
            return [
                r["message"] for r in results[:max_results]
            ]
            
        except Exception as e:
            error_msg = f"Failed to search history: {str(e)}"
            logger.error(error_msg)
            raise MemoryError(error_msg)
            
    def update_metadata(
        self,
        metadata: Dict[str, Any]
    ) -> None:
        """Update conversation metadata"""
        try:
            self.metadata.update(metadata)
            
        except Exception as e:
            error_msg = f"Failed to update metadata: {str(e)}"
            logger.error(error_msg)
            raise MemoryError(error_msg)
            
    def _estimate_tokens(self, text: str) -> int:
        """Estimate token count for text"""
        # Simple estimation: ~4 chars per token
        return len(text) // 4
        
    def _count_roles(self) -> Dict[str, int]:
        """Count messages by role"""
        counts = {}
        for msg in self.history:
            role = msg["role"]
            counts[role] = counts.get(role, 0) + 1
        return counts
        
    def _get_timespan(self) -> Optional[Dict[str, str]]:
        """Get conversation timespan"""
        if not self.history:
            return None
            
        timestamps = [
            datetime.fromisoformat(msg["timestamp"].replace("Z", "+00:00"))
            for msg in self.history
        ]
        
        return {
            "start": min(timestamps).isoformat(),
            "end": max(timestamps).isoformat(),
            "duration": str(max(timestamps) - min(timestamps))
        }
        
    def _extract_topics(self) -> List[str]:
        """Extract main topics from conversation"""
        # Simple keyword extraction
        from collections import Counter
        import re
        
        words = []
        for msg in self.history:
            content = msg["content"].lower()
            # Extract words (simple tokenization)
            words.extend(re.findall(r'\b\w+\b', content))
            
        # Count word frequencies
        counter = Counter(words)
        
        # Filter common words
        common_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to"}
        topics = [
            word for word, count in counter.most_common(10)
            if word not in common_words and len(word) > 3
        ]
        
        return topics 