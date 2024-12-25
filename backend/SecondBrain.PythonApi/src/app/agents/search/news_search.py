from typing import Dict, Any, List, Optional
import logging
from newsapi import NewsApiClient
from duckduckgo_search import DDGS
from app.config.settings import settings
from ..core.agent_exceptions import NewsSearchError
from ..core.agent_types import NewsCategory
from ..utils.query_utils import clean_search_query, determine_news_category
from ..utils.response_utils import create_search_response, create_error_response
from ..utils.logging_utils import log_search_result, log_api_call

logger = logging.getLogger(__name__)

class NewsSearch:
    """News search implementation with NewsAPI and DuckDuckGo fallback"""
    
    def __init__(self):
        self.newsapi = NewsApiClient(api_key=settings.NEWS_API_KEY) if settings.NEWS_API_KEY else None
        self.ddg = DDGS()
        
    @log_api_call
    async def search(
        self,
        query: str,
        max_results: int = 3,
        category: Optional[str] = None,
        language: str = "en",
        sort_by: str = "relevancy"
    ) -> Dict[str, Any]:
        """Execute news search with fallback strategies"""
        try:
            # Clean and prepare query
            query = clean_search_query(query)
            if not category:
                category = determine_news_category(query).value
                
            logger.info(
                f"Starting news search with query: '{query}', "
                f"category: {category}, max_results: {max_results}"
            )
            
            # Try NewsAPI if available
            if self.newsapi:
                try:
                    results = await self._execute_newsapi_search(
                        query, max_results, category, language, sort_by
                    )
                    if results:
                        return results
                except Exception as e:
                    logger.warning(f"NewsAPI search failed: {str(e)}, falling back to DuckDuckGo")
                    
            # Fallback to DuckDuckGo news search
            return await self._execute_duckduckgo_search(query, max_results)
            
        except Exception as e:
            error_msg = f"News search failed: {str(e)}"
            logger.error(error_msg)
            return create_error_response(error_msg)
            
    async def _execute_newsapi_search(
        self,
        query: str,
        max_results: int,
        category: str,
        language: str,
        sort_by: str
    ) -> Optional[Dict[str, Any]]:
        """Execute search using NewsAPI"""
        try:
            # Try category-based search first
            if category in ["technology", "science", "business"]:
                response = self.newsapi.get_top_headlines(
                    q=query,
                    category=category,
                    language=language,
                    page_size=max_results
                )
            else:
                # Fallback to everything endpoint
                response = self.newsapi.get_everything(
                    q=query,
                    language=language,
                    sort_by=sort_by,
                    page_size=max_results
                )
                
            articles = response.get("articles", [])
            if articles:
                processed_results = self._process_newsapi_results(articles, category)
                log_search_result("newsapi", query, len(processed_results), 0.0)
                return create_search_response(
                    success=True,
                    results=processed_results,
                    query=query,
                    max_results=max_results
                )
                
            return None
            
        except Exception as e:
            logger.warning(f"NewsAPI search failed: {str(e)}")
            return None
            
    async def _execute_duckduckgo_search(
        self,
        query: str,
        max_results: int
    ) -> Dict[str, Any]:
        """Execute search using DuckDuckGo news"""
        try:
            results_list = list(self.ddg.news(
                keywords=query,
                max_results=max_results
            ))
            
            if results_list:
                processed_results = self._process_duckduckgo_results(results_list)
                log_search_result("duckduckgo", query, len(processed_results), 0.0)
                return create_search_response(
                    success=True,
                    results=processed_results,
                    query=query,
                    max_results=max_results
                )
                
            return create_error_response("No news results found")
            
        except Exception as e:
            logger.error(f"DuckDuckGo news search failed: {str(e)}")
            return create_error_response(str(e))
            
    def _process_newsapi_results(
        self,
        articles: List[Dict[str, Any]],
        category: str
    ) -> List[Dict[str, Any]]:
        """Process NewsAPI results"""
        processed_results = []
        for article in articles:
            if processed := self._process_newsapi_article(article, category):
                processed_results.append(processed)
        return processed_results
        
    def _process_newsapi_article(
        self,
        article: Dict[str, Any],
        category: str
    ) -> Optional[Dict[str, Any]]:
        """Process a single NewsAPI article"""
        try:
            # Extract required fields
            title = article.get("title", "").strip()
            url = article.get("url", "")
            description = article.get("description", "").strip()
            
            # Skip articles with missing essential fields
            if not all([title, url]):
                return None
                
            processed = {
                "title": title,
                "url": url,
                "description": description or "No description available",
                "source": article.get("source", {}).get("name", "Unknown source"),
                "published_at": article.get("publishedAt", ""),
                "category": category
            }
            
            # Add optional fields
            if author := article.get("author"):
                processed["author"] = author
                
            if content := article.get("content"):
                processed["content"] = content
                
            return processed
            
        except Exception as e:
            logger.warning(f"Failed to process NewsAPI article: {str(e)}")
            return None
            
    def _process_duckduckgo_results(
        self,
        results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Process DuckDuckGo news results"""
        processed_results = []
        for result in results:
            if processed := self._process_duckduckgo_result(result):
                processed_results.append(processed)
        return processed_results
        
    def _process_duckduckgo_result(
        self,
        result: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Process a single DuckDuckGo news result"""
        try:
            # Extract required fields
            title = result.get("title", "").strip()
            link = result.get("link", "")
            
            # Skip results with missing essential fields
            if not all([title, link]):
                return None
                
            processed = {
                "title": title,
                "url": link,
                "description": result.get("body", "No description available").strip(),
                "source": result.get("source", "Unknown source"),
                "published_at": result.get("date", ""),
                "category": determine_news_category(title).value
            }
            
            return processed
            
        except Exception as e:
            logger.warning(f"Failed to process DuckDuckGo result: {str(e)}")
            return None 