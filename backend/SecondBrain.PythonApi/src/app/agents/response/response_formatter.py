from typing import Dict, Any, List, Optional, Union
import logging
import json
import markdown
from ..core.agent_exceptions import FormattingError
from ..utils.logging_utils import log_api_call

logger = logging.getLogger(__name__)

class ResponseFormatter:
    """Response formatting and generation"""
    
    SUPPORTED_FORMATS = ["text", "markdown", "html", "json"]
    
    @log_api_call
    def format_response(
        self,
        content: Union[str, Dict[str, Any], List[Any]],
        format_type: str = "text",
        include_metadata: bool = True,
        **kwargs
    ) -> Dict[str, Any]:
        """Format response content"""
        try:
            if format_type not in self.SUPPORTED_FORMATS:
                raise FormattingError(f"Unsupported format type: {format_type}")
                
            # Get formatting method
            formatter = getattr(self, f"_format_{format_type}", self._format_text)
            
            # Format content
            formatted = formatter(content, **kwargs)
            
            # Add metadata if requested
            if include_metadata:
                return {
                    "content": formatted,
                    "format": format_type,
                    "metadata": self._generate_metadata(content, format_type)
                }
                
            return {"content": formatted}
            
        except Exception as e:
            error_msg = f"Response formatting failed: {str(e)}"
            logger.error(error_msg)
            raise FormattingError(error_msg)
            
    def format_search_results(
        self,
        results: List[Dict[str, Any]],
        format_type: str = "markdown",
        max_results: Optional[int] = None,
        include_metadata: bool = True
    ) -> Dict[str, Any]:
        """Format search results"""
        try:
            if not results:
                return self.format_response(
                    "No results found",
                    format_type=format_type,
                    include_metadata=include_metadata
                )
                
            # Limit results if specified
            if max_results:
                results = results[:max_results]
                
            # Format based on type
            if format_type == "json":
                return self.format_response(
                    results,
                    format_type=format_type,
                    include_metadata=include_metadata
                )
                
            # Format as text/markdown/html
            formatted = []
            
            for i, result in enumerate(results, 1):
                # Extract common fields
                title = result.get("title", "Untitled")
                url = result.get("url", "")
                description = result.get("description", "").strip()
                
                if format_type == "text":
                    formatted.append(
                        f"{i}. {title}\n"
                        f"   URL: {url}\n"
                        f"   {description}\n"
                    )
                else:  # markdown/html
                    formatted.append(
                        f"### {i}. {title}\n"
                        f"[View Source]({url})\n\n"
                        f"{description}\n"
                    )
                    
                # Add additional fields if present
                for key, value in result.items():
                    if key not in ["title", "url", "description"]:
                        if format_type == "text":
                            formatted.append(f"   {key}: {value}")
                        else:
                            formatted.append(f"**{key}**: {value}")
                            
                formatted.append("")  # Add separator
                
            return self.format_response(
                "\n".join(formatted),
                format_type=format_type,
                include_metadata=include_metadata
            )
            
        except Exception as e:
            error_msg = f"Search results formatting failed: {str(e)}"
            logger.error(error_msg)
            raise FormattingError(error_msg)
            
    def format_error(
        self,
        error: Union[str, Exception],
        format_type: str = "text",
        include_stack_trace: bool = False
    ) -> Dict[str, Any]:
        """Format error response"""
        try:
            if isinstance(error, Exception):
                error_msg = str(error)
                error_type = error.__class__.__name__
            else:
                error_msg = error
                error_type = "Error"
                
            if format_type == "json":
                formatted = {
                    "error": error_msg,
                    "type": error_type
                }
                if include_stack_trace and isinstance(error, Exception):
                    import traceback
                    formatted["stack_trace"] = traceback.format_exc()
                    
            elif format_type in ["markdown", "html"]:
                formatted = f"### {error_type}\n\n{error_msg}"
                if include_stack_trace and isinstance(error, Exception):
                    import traceback
                    formatted += f"\n\n```\n{traceback.format_exc()}\n```"
                    
            else:  # text
                formatted = f"{error_type}: {error_msg}"
                if include_stack_trace and isinstance(error, Exception):
                    import traceback
                    formatted += f"\n\nStack trace:\n{traceback.format_exc()}"
                    
            return self.format_response(
                formatted,
                format_type=format_type,
                include_metadata=True
            )
            
        except Exception as e:
            error_msg = f"Error formatting failed: {str(e)}"
            logger.error(error_msg)
            raise FormattingError(error_msg)
            
    def _format_text(
        self,
        content: Union[str, Dict[str, Any], List[Any]],
        **kwargs
    ) -> str:
        """Format as plain text"""
        if isinstance(content, str):
            return content
            
        return json.dumps(content, indent=2)
        
    def _format_markdown(
        self,
        content: Union[str, Dict[str, Any], List[Any]],
        **kwargs
    ) -> str:
        """Format as markdown"""
        if isinstance(content, str):
            return content
            
        return f"```json\n{json.dumps(content, indent=2)}\n```"
        
    def _format_html(
        self,
        content: Union[str, Dict[str, Any], List[Any]],
        **kwargs
    ) -> str:
        """Format as HTML"""
        if isinstance(content, str):
            return markdown.markdown(content)
            
        return (
            "<pre><code class='json'>\n"
            f"{json.dumps(content, indent=2)}\n"
            "</code></pre>"
        )
        
    def _format_json(
        self,
        content: Union[str, Dict[str, Any], List[Any]],
        **kwargs
    ) -> Dict[str, Any]:
        """Format as JSON"""
        if isinstance(content, str):
            return {"text": content}
            
        return content
        
    def _generate_metadata(
        self,
        content: Union[str, Dict[str, Any], List[Any]],
        format_type: str
    ) -> Dict[str, Any]:
        """Generate response metadata"""
        metadata = {
            "format": format_type,
            "timestamp": self._get_timestamp()
        }
        
        # Add content-specific metadata
        if isinstance(content, str):
            metadata.update({
                "content_type": "string",
                "length": len(content),
                "word_count": len(content.split())
            })
        elif isinstance(content, dict):
            metadata.update({
                "content_type": "object",
                "keys": list(content.keys())
            })
        elif isinstance(content, list):
            metadata.update({
                "content_type": "array",
                "length": len(content)
            })
            
        return metadata
        
    def _get_timestamp(self) -> str:
        """Get current timestamp"""
        from datetime import datetime
        return datetime.utcnow().isoformat()