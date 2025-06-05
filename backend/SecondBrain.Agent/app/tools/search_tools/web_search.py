"""Web search tool using DuckDuckGo with intelligent fallback strategies."""

import asyncio
import re
from typing import Any, Dict, List, Optional

import aiohttp
import structlog

from app.tools.base_tool import SearchTool

logger = structlog.get_logger(__name__)


class WebSearchTool(SearchTool):
    """Web search tool using DuckDuckGo with multiple search strategies."""
    
    def __init__(self):
        """Initialize the web search tool."""
        super().__init__(
            name="web_search",
            description="Search the web for general information using DuckDuckGo",
            max_results_default=5
        )
        self._supported_agent_types = ["research", "analysis", "all"]
        self._base_url = "https://duckduckgo.com"
        self._timeout = 10
    
    async def _search_internal(self, query: str, max_results: int, parameters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Execute web search with multiple fallback strategies."""
        
        # Clean and prepare query
        cleaned_query = self._clean_query(query)
        region = parameters.get("region", "us-en")
        
        logger.info("Starting web search", 
            original_query=query,
            cleaned_query=cleaned_query,
            max_results=max_results,
            region=region
        )
        
        # Strategy 1: Primary text search
        try:
            results = await self._execute_text_search(cleaned_query, max_results, region)
            if results:
                logger.info("Text search successful", results_count=len(results))
                return results
        except Exception as e:
            logger.warning("Text search failed", error=str(e))
        
        # Strategy 2: Fallback to news search for recent topics
        try:
            results = await self._execute_news_search(cleaned_query, max_results, region)
            if results:
                logger.info("News search fallback successful", results_count=len(results))
                return results
        except Exception as e:
            logger.warning("News search fallback failed", error=str(e))
        
        # Strategy 3: Simplified keyword search
        try:
            keywords = self._extract_keywords(cleaned_query)
            if keywords:
                simplified_query = " ".join(keywords[:3])  # Use top 3 keywords
                results = await self._execute_text_search(simplified_query, max_results, region)
                if results:
                    logger.info("Simplified search successful", 
                        simplified_query=simplified_query,
                        results_count=len(results)
                    )
                    return results
        except Exception as e:
            logger.warning("Simplified search failed", error=str(e))
        
        # Strategy 4: Single keyword fallback
        try:
            keywords = self._extract_keywords(cleaned_query)
            if keywords:
                single_keyword = keywords[0]  # Use most important keyword
                results = await self._execute_text_search(single_keyword, max_results, region)
                if results:
                    logger.info("Single keyword search successful", 
                        keyword=single_keyword,
                        results_count=len(results)
                    )
                    return results
        except Exception as e:
            logger.warning("Single keyword search failed", error=str(e))
        
        # All strategies failed
        raise Exception("All web search strategies failed")
    
    async def _execute_text_search(self, query: str, max_results: int, region: str) -> List[Dict[str, Any]]:
        """Execute DuckDuckGo text search."""
        try:
            from duckduckgo_search import DDGS
            
            results = []
            # DDGS doesn't support async, so we'll run it synchronously
            ddgs = DDGS()
            ddgs_results = ddgs.text(
                keywords=query,
                region=region,
                max_results=max_results,
                backend="api"
            )
            
            for result in ddgs_results:
                if isinstance(result, dict):
                    # Map result fields to our expected format
                    formatted_result = {
                        "title": result.get("title", ""),
                        "snippet": result.get("body", ""),
                        "source": result.get("href", ""),
                        "url": result.get("href", "")
                    }
                    results.append(formatted_result)
            
            return results
            
        except ImportError:
            # Fallback to manual implementation if duckduckgo_search not available
            return await self._manual_ddg_search(query, max_results, region, search_type="text")
        except Exception as e:
            logger.error("DuckDuckGo text search failed", 
                query=query,
                error=str(e)
            )
            raise
    
    async def _execute_news_search(self, query: str, max_results: int, region: str) -> List[Dict[str, Any]]:
        """Execute DuckDuckGo news search."""
        try:
            from duckduckgo_search import DDGS
            
            results = []
            # DDGS doesn't support async, so we'll run it synchronously
            ddgs = DDGS()
            ddgs_results = ddgs.news(
                keywords=query,
                region=region,
                max_results=max_results
            )
            
            for result in ddgs_results:
                if isinstance(result, dict):
                    # Map result fields to our expected format
                    formatted_result = {
                        "title": result.get("title", ""),
                        "snippet": result.get("body", ""),
                        "source": result.get("source", ""),
                        "url": result.get("url", "")
                    }
                    results.append(formatted_result)
            
            return results
            
        except ImportError:
            # Fallback to manual implementation
            return await self._manual_ddg_search(query, max_results, region, search_type="news")
        except Exception as e:
            logger.error("DuckDuckGo news search failed", 
                query=query,
                error=str(e)
            )
            raise
    
    async def _manual_ddg_search(self, query: str, max_results: int, region: str, search_type: str = "text") -> List[Dict[str, Any]]:
        """Manual DuckDuckGo search implementation as fallback."""
        
        # Prepare search URL
        if search_type == "news":
            url = f"{self._base_url}/?q={query}&iar=news&ia=news"
        else:
            url = f"{self._base_url}/?q={query}&kl={region}"
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=self._timeout)) as session:
            try:
                async with session.get(url, headers=headers) as response:
                    if response.status != 200:
                        raise Exception(f"HTTP {response.status}")
                    
                    html = await response.text()
                    return self._parse_ddg_html(html, max_results)
                    
            except Exception as e:
                logger.error("Manual DuckDuckGo search failed", 
                    url=url,
                    error=str(e)
                )
                raise
    
    def _parse_ddg_html(self, html: str, max_results: int) -> List[Dict[str, Any]]:
        """Parse DuckDuckGo HTML response to extract search results."""
        from bs4 import BeautifulSoup
        
        soup = BeautifulSoup(html, 'html.parser')
        results = []
        
        # Find result containers
        result_containers = soup.find_all('div', class_=re.compile(r'result'))
        
        for container in result_containers[:max_results]:
            try:
                # Extract title
                title_elem = container.find('h2') or container.find('a')
                title = title_elem.get_text(strip=True) if title_elem else ""
                
                # Extract URL
                link_elem = container.find('a', href=True)
                url = link_elem['href'] if link_elem else ""
                
                # Clean URL if it's a DuckDuckGo redirect
                if url.startswith('/l/?uddg='):
                    import urllib.parse
                    url = urllib.parse.unquote(url.split('uddg=')[1].split('&')[0])
                
                # Extract snippet
                snippet_elem = container.find('span', class_=re.compile(r'result-snippet'))
                snippet = snippet_elem.get_text(strip=True) if snippet_elem else ""
                
                if title and url:
                    results.append({
                        'title': title,
                        'href': url,
                        'body': snippet
                    })
                    
            except Exception as e:
                logger.warning("Failed to parse result container", error=str(e))
                continue
        
        return results
    
    def _format_single_result(self, raw_result: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Format a single DuckDuckGo result to standardized structure."""
        try:
            # DuckDuckGo result format varies, handle different field names
            title = raw_result.get('title') or raw_result.get('name', '')
            url = raw_result.get('href') or raw_result.get('url') or raw_result.get('link', '')
            snippet = raw_result.get('body') or raw_result.get('snippet') or raw_result.get('description', '')
            
            # Extract domain from URL for source attribution
            source = self._extract_domain(url)
            
            # Basic validation
            if not title or not url:
                return None
            
            formatted_result = {
                "title": title.strip(),
                "url": url.strip(),
                "snippet": snippet.strip()[:500],  # Limit snippet length
                "source": source,
                "search_type": "web",
                "relevance_score": self._calculate_relevance_score(title, snippet),
                "metadata": {
                    "domain": source,
                    "result_type": "web_page",
                    "search_engine": "duckduckgo"
                }
            }
            
            return formatted_result
            
        except Exception as e:
            logger.warning("Failed to format result", 
                error=str(e),
                raw_result=str(raw_result)[:200]
            )
            return None
    
    def _extract_domain(self, url: str) -> str:
        """Extract domain name from URL."""
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            domain = parsed.netloc
            
            # Remove www. prefix
            if domain.startswith('www.'):
                domain = domain[4:]
            
            return domain
        except Exception:
            return "unknown"
    
    def _calculate_relevance_score(self, title: str, snippet: str) -> float:
        """Calculate a simple relevance score for ranking results."""
        score = 0.0
        
        # Title gets higher weight
        title_words = len(title.split()) if title else 0
        score += min(title_words * 0.1, 0.5)
        
        # Snippet content
        snippet_words = len(snippet.split()) if snippet else 0
        score += min(snippet_words * 0.02, 0.3)
        
        # Bonus for having both title and snippet
        if title and snippet:
            score += 0.2
        
        return min(score, 1.0)
    
    def validate_parameters(self, parameters: Dict[str, Any]) -> bool:
        """Validate web search specific parameters."""
        if not super().validate_parameters(parameters):
            return False
        
        # Validate region parameter
        if "region" in parameters:
            region = parameters["region"]
            if not isinstance(region, str) or len(region) < 2:
                return False
        
        return True
    
    def _get_parameter_schema(self) -> Dict[str, Any]:
        """Get the parameter schema for web search."""
        schema = super()._get_parameter_schema()
        schema["properties"]["region"]["enum"] = [
            "us-en", "uk-en", "ca-en", "au-en", "in-en",
            "de-de", "fr-fr", "es-es", "it-it", "jp-jp"
        ]
        return schema