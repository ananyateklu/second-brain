from typing import Dict, Any, List, Optional
import logging
from duckduckgo_search import DDGS
from ..core.agent_exceptions import WebSearchError
from ..utils.query_utils import clean_search_query, simplify_query
from ..utils.response_utils import create_search_response, create_error_response
from ..utils.logging_utils import log_search_result, log_api_call

logger = logging.getLogger(__name__)

class WebSearch:
    """Web search implementation using DuckDuckGo"""
    
    def __init__(self):
        self.ddg = DDGS()
        
    @log_api_call
    async def search(
        self,
        query: str,
        max_results: int = 5,
        region: str = "us-en"
    ) -> Dict[str, Any]:
        """Execute web search with fallback strategies"""
        try:
            # Clean and prepare query
            query = clean_search_query(query)
            logger.info(f"Starting web search with query: '{query}', max_results: {max_results}")
            
            # Try text search first
            results = await self._execute_text_search(query, max_results, region)
            if results:
                return results
                
            # Fallback to news search
            logger.info("Text search yielded no results, trying news search")
            results = await self._execute_news_search(query, max_results, region)
            if results:
                return results
                
            # Try with simplified query as last resort
            logger.info("News search yielded no results, trying simplified search")
            simplified_query = simplify_query(query)
            results = await self._execute_text_search(simplified_query, max_results, region)
            if results:
                return results
                
            # No results found
            return create_error_response("No results found with any search method")
            
        except Exception as e:
            logger.error(f"Web search failed: {str(e)}")
            return create_error_response(f"Web search failed: {str(e)}")
            
    async def _execute_text_search(
        self,
        query: str,
        max_results: int,
        region: str
    ) -> Optional[Dict[str, Any]]:
        """Execute DuckDuckGo text search"""
        try:
            results_list = list(self.ddg.text(
                keywords=query,
                region=region,
                max_results=max_results
            ))
            
            if results_list:
                processed_results = self._process_results(results_list)
                log_search_result("text", query, len(processed_results), 0.0)
                return create_search_response(
                    success=True,
                    results=processed_results,
                    query=query,
                    max_results=max_results
                )
                
            return None
            
        except Exception as e:
            logger.warning(f"Text search failed: {str(e)}")
            return None
            
    async def _execute_news_search(
        self,
        query: str,
        max_results: int,
        region: str
    ) -> Optional[Dict[str, Any]]:
        """Execute DuckDuckGo news search"""
        try:
            results_list = list(self.ddg.news(
                keywords=query,
                region=region,
                max_results=max_results
            ))
            
            if results_list:
                processed_results = self._process_results(results_list, source_type="news")
                log_search_result("news", query, len(processed_results), 0.0)
                return create_search_response(
                    success=True,
                    results=processed_results,
                    query=query,
                    max_results=max_results
                )
                
            return None
            
        except Exception as e:
            logger.warning(f"News search failed: {str(e)}")
            return None
            
    def _process_results(
        self,
        results: List[Dict[str, Any]],
        source_type: str = "web"
    ) -> List[Dict[str, Any]]:
        """Process search results into a standard format"""
        processed_results = []
        for result in results:
            if processed := self._process_single_result(result, source_type):
                processed_results.append(processed)
                
        return processed_results
        
    def _process_single_result(
        self,
        result: Dict[str, Any],
        source_type: str
    ) -> Optional[Dict[str, Any]]:
        """Process a single search result"""
        try:
            # Extract basic fields
            title = result.get("title", "").strip()
            link = result.get("link", "")
            snippet = result.get("body", result.get("snippet", "")).strip()
            
            # Skip results with missing essential fields
            if not all([title, link, snippet]):
                return None
                
            processed = {
                "title": title,
                "link": link,
                "snippet": snippet,
                "source": source_type
            }
            
            # Add optional fields if present
            if date := result.get("date"):
                processed["published"] = date
                
            if source := result.get("source"):
                processed["source_name"] = source
                
            return processed
            
        except Exception as e:
            logger.warning(f"Failed to process result: {str(e)}")
            return None 