"""News search tool with NewsAPI and DuckDuckGo fallback support."""

import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import aiohttp
import structlog

from app.tools.base_tool import SearchTool

logger = structlog.get_logger(__name__)


class NewsSearchTool(SearchTool):
    """News search tool with multiple provider support."""
    
    def __init__(self, news_api_key: Optional[str] = None):
        """Initialize the news search tool."""
        super().__init__(
            name="news_search",
            description="Search for recent news articles using NewsAPI and DuckDuckGo",
            max_results_default=5
        )
        self._supported_agent_types = ["research", "analysis", "all"]
        self._news_api_key = news_api_key
        self._news_api_base = "https://newsapi.org/v2"
        self._timeout = 10
        
        # News categories for intelligent categorization
        self._news_categories = {
            "technology": ["tech", "AI", "software", "computer", "digital", "startup", "innovation"],
            "science": ["science", "research", "study", "discovery", "medical", "health"],
            "business": ["business", "economy", "market", "finance", "investment", "company"],
            "sports": ["sports", "football", "basketball", "soccer", "olympics", "game"],
            "entertainment": ["entertainment", "movie", "music", "celebrity", "film", "tv"],
            "politics": ["politics", "government", "election", "policy", "congress", "senate"]
        }
    
    async def _search_internal(self, query: str, max_results: int, parameters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Execute news search with multiple provider strategies."""
        
        # Clean and prepare query
        cleaned_query = self._clean_query(query)
        
        # Extract parameters
        language = parameters.get("language", "en")
        country = parameters.get("country", "us")
        category = parameters.get("category", self._detect_news_category(cleaned_query))
        sort_by = parameters.get("sort_by", "relevancy")
        from_date = parameters.get("from_date")
        to_date = parameters.get("to_date")
        
        logger.info("Starting news search", 
            original_query=query,
            cleaned_query=cleaned_query,
            max_results=max_results,
            category=category,
            language=language,
            sort_by=sort_by
        )
        
        # Strategy 1: NewsAPI if available
        if self._news_api_key:
            try:
                results = await self._execute_newsapi_search(
                    cleaned_query, max_results, language, country, 
                    category, sort_by, from_date, to_date
                )
                if results:
                    logger.info("NewsAPI search successful", results_count=len(results))
                    return results
            except Exception as e:
                logger.warning("NewsAPI search failed", error=str(e))
        
        # Strategy 2: DuckDuckGo news search
        try:
            results = await self._execute_ddg_news_search(cleaned_query, max_results, language)
            if results:
                logger.info("DuckDuckGo news search successful", results_count=len(results))
                return results
        except Exception as e:
            logger.warning("DuckDuckGo news search failed", error=str(e))
        
        # Strategy 3: Simplified keyword search
        try:
            keywords = self._extract_keywords(cleaned_query)
            if keywords:
                simplified_query = " ".join(keywords[:3])
                results = await self._execute_ddg_news_search(simplified_query, max_results, language)
                if results:
                    logger.info("Simplified news search successful", 
                        simplified_query=simplified_query,
                        results_count=len(results)
                    )
                    return results
        except Exception as e:
            logger.warning("Simplified news search failed", error=str(e))
        
        # All strategies failed
        raise Exception("All news search strategies failed")
    
    async def _execute_newsapi_search(
        self,
        query: str,
        max_results: int,
        language: str = "en",
        country: str = "us",
        category: Optional[str] = None,
        sort_by: str = "relevancy",
        from_date: Optional[str] = None,
        to_date: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Execute NewsAPI search."""
        
        # Prepare parameters
        params = {
            "q": query,
            "language": language,
            "sortBy": sort_by,
            "pageSize": min(max_results, 100),  # API limit
            "apiKey": self._news_api_key
        }
        
        # Add optional parameters
        if country and not from_date:  # Country filter only works with headlines endpoint
            params["country"] = country
        if from_date:
            params["from"] = from_date
        if to_date:
            params["to"] = to_date
        
        # Choose endpoint based on parameters
        if category and not from_date:
            endpoint = "top-headlines"
            params["category"] = category
        else:
            endpoint = "everything"
        
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=self._timeout)) as session:
            try:
                async with session.get(
                    f"{self._news_api_base}/{endpoint}",
                    params=params
                ) as response:
                    
                    if response.status != 200:
                        error_text = await response.text()
                        raise Exception(f"NewsAPI HTTP {response.status}: {error_text}")
                    
                    result = await response.json()
                    
                    if result.get("status") != "ok":
                        raise Exception(f"NewsAPI error: {result.get('message', 'Unknown error')}")
                    
                    return result.get("articles", [])
                    
            except Exception as e:
                logger.error("NewsAPI request failed", 
                    query=query,
                    endpoint=endpoint,
                    error=str(e)
                )
                raise
    
    async def _execute_ddg_news_search(self, query: str, max_results: int, language: str = "en") -> List[Dict[str, Any]]:
        """Execute DuckDuckGo news search."""
        try:
            from duckduckgo_search import DDGS
            
            results = []
            async with DDGS() as ddgs:
                ddgs_results = ddgs.news(
                    keywords=query,
                    max_results=max_results,
                    safesearch="moderate"
                )
                
                for result in ddgs_results:
                    if isinstance(result, dict):
                        results.append(result)
            
            return results
            
        except ImportError:
            # Fallback to manual implementation
            return await self._manual_ddg_news_search(query, max_results)
        except Exception as e:
            logger.error("DuckDuckGo news search failed", 
                query=query,
                error=str(e)
            )
            raise
    
    async def _manual_ddg_news_search(self, query: str, max_results: int) -> List[Dict[str, Any]]:
        """Manual DuckDuckGo news search implementation."""
        
        url = f"https://duckduckgo.com/?q={query}&iar=news&ia=news"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=self._timeout)) as session:
            try:
                async with session.get(url, headers=headers) as response:
                    if response.status != 200:
                        raise Exception(f"HTTP {response.status}")
                    
                    html = await response.text()
                    return self._parse_ddg_news_html(html, max_results)
                    
            except Exception as e:
                logger.error("Manual DuckDuckGo news search failed", 
                    url=url,
                    error=str(e)
                )
                raise
    
    def _parse_ddg_news_html(self, html: str, max_results: int) -> List[Dict[str, Any]]:
        """Parse DuckDuckGo news HTML response."""
        from bs4 import BeautifulSoup
        import re
        
        soup = BeautifulSoup(html, 'html.parser')
        results = []
        
        # Find news result containers
        news_containers = soup.find_all('div', class_=re.compile(r'news'))
        
        for container in news_containers[:max_results]:
            try:
                # Extract title
                title_elem = container.find('h2') or container.find('a')
                title = title_elem.get_text(strip=True) if title_elem else ""
                
                # Extract URL
                link_elem = container.find('a', href=True)
                url = link_elem['href'] if link_elem else ""
                
                # Extract snippet
                snippet_elem = container.find('div', class_=re.compile(r'snippet'))
                snippet = snippet_elem.get_text(strip=True) if snippet_elem else ""
                
                # Extract date
                date_elem = container.find('span', class_=re.compile(r'date'))
                date = date_elem.get_text(strip=True) if date_elem else ""
                
                # Extract source
                source_elem = container.find('span', class_=re.compile(r'source'))
                source = source_elem.get_text(strip=True) if source_elem else ""
                
                if title and url:
                    results.append({
                        'title': title,
                        'url': url,
                        'body': snippet,
                        'date': date,
                        'source': source
                    })
                    
            except Exception as e:
                logger.warning("Failed to parse news container", error=str(e))
                continue
        
        return results
    
    def _format_single_result(self, raw_result: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Format a single news result to standardized structure."""
        try:
            # Handle different result formats (NewsAPI vs DuckDuckGo)
            title = raw_result.get("title", "").strip()
            url = raw_result.get("url") or raw_result.get("link", "")
            
            # Handle description/snippet
            description = (
                raw_result.get("description") or 
                raw_result.get("body") or 
                raw_result.get("snippet") or 
                raw_result.get("content", "")
            ).strip()
            
            # Handle source
            source = self._extract_news_source(raw_result)
            
            # Handle publication date
            published_at = self._extract_publication_date(raw_result)
            
            # Basic validation
            if not title or not url:
                return None
            
            # Calculate freshness score
            freshness_score = self._calculate_freshness_score(published_at)
            
            formatted_result = {
                "title": title,
                "url": url,
                "snippet": description[:400],  # Limit snippet length
                "source": source,
                "search_type": "news",
                "relevance_score": self._calculate_news_relevance_score(raw_result, freshness_score),
                "metadata": {
                    "published_at": published_at,
                    "source_name": source,
                    "freshness_score": freshness_score,
                    "result_type": "news_article",
                    "category": self._detect_news_category(title + " " + description),
                    "url_domain": self._extract_domain(url)
                }
            }
            
            # Add NewsAPI specific metadata
            if "author" in raw_result:
                formatted_result["metadata"]["author"] = raw_result["author"]
            if "urlToImage" in raw_result:
                formatted_result["metadata"]["image_url"] = raw_result["urlToImage"]
            
            return formatted_result
            
        except Exception as e:
            logger.warning("Failed to format news result", 
                error=str(e),
                raw_result=str(raw_result)[:200]
            )
            return None
    
    def _extract_news_source(self, raw_result: Dict[str, Any]) -> str:
        """Extract news source from result."""
        # NewsAPI format
        if "source" in raw_result and isinstance(raw_result["source"], dict):
            return raw_result["source"].get("name", "Unknown")
        
        # Direct source field
        if "source" in raw_result and isinstance(raw_result["source"], str):
            return raw_result["source"]
        
        # Extract from URL
        url = raw_result.get("url", "")
        if url:
            domain = self._extract_domain(url)
            return domain.title() if domain != "unknown" else "Unknown"
        
        return "Unknown"
    
    def _extract_publication_date(self, raw_result: Dict[str, Any]) -> Optional[str]:
        """Extract publication date from result."""
        # Try different date field names
        date_fields = ["publishedAt", "published_at", "date", "datetime"]
        
        for field in date_fields:
            if field in raw_result and raw_result[field]:
                return raw_result[field]
        
        return None
    
    def _calculate_freshness_score(self, published_at: Optional[str]) -> float:
        """Calculate freshness score based on publication date."""
        if not published_at:
            return 0.5  # Neutral score for unknown dates
        
        try:
            # Parse date (handle multiple formats)
            from dateutil import parser
            pub_date = parser.parse(published_at)
            now = datetime.now(pub_date.tzinfo) if pub_date.tzinfo else datetime.now()
            
            # Calculate hours since publication
            hours_diff = (now - pub_date).total_seconds() / 3600
            
            # Scoring: newer is better
            if hours_diff <= 6:
                return 1.0  # Very fresh
            elif hours_diff <= 24:
                return 0.8  # Fresh
            elif hours_diff <= 72:
                return 0.6  # Recent
            elif hours_diff <= 168:  # 1 week
                return 0.4  # Somewhat recent
            else:
                return 0.2  # Old
                
        except Exception:
            return 0.5  # Neutral score if date parsing fails
    
    def _calculate_news_relevance_score(self, raw_result: Dict[str, Any], freshness_score: float) -> float:
        """Calculate relevance score for news articles."""
        score = 0.0
        
        # Freshness contributes significantly to news relevance
        score += freshness_score * 0.4
        
        # Source credibility (simplified)
        source = self._extract_news_source(raw_result).lower()
        credible_sources = [
            "reuters", "associated press", "bbc", "cnn", "nytimes", 
            "wsj", "guardian", "npr", "pbs", "axios"
        ]
        if any(cs in source for cs in credible_sources):
            score += 0.3
        
        # Article length (longer articles often more substantial)
        description = raw_result.get("description", "")
        if len(description) > 200:
            score += 0.1
        elif len(description) > 100:
            score += 0.05
        
        # Has image (often indicates higher quality)
        if raw_result.get("urlToImage"):
            score += 0.1
        
        # Has author
        if raw_result.get("author"):
            score += 0.05
        
        return min(score, 1.0)
    
    def _detect_news_category(self, text: str) -> Optional[str]:
        """Detect news category based on text content."""
        text_lower = text.lower()
        
        category_scores = {}
        for category, keywords in self._news_categories.items():
            score = sum(1 for keyword in keywords if keyword.lower() in text_lower)
            if score > 0:
                category_scores[category] = score
        
        if category_scores:
            return max(category_scores, key=category_scores.get)
        
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
    
    def validate_parameters(self, parameters: Dict[str, Any]) -> bool:
        """Validate news search specific parameters."""
        if not super().validate_parameters(parameters):
            return False
        
        # Validate category
        if "category" in parameters:
            category = parameters["category"]
            valid_categories = list(self._news_categories.keys()) + ["general", "health"]
            if category and category not in valid_categories:
                return False
        
        # Validate sort_by
        if "sort_by" in parameters:
            sort_by = parameters["sort_by"]
            valid_sort_options = ["relevancy", "popularity", "publishedAt"]
            if sort_by not in valid_sort_options:
                return False
        
        # Validate date format
        date_fields = ["from_date", "to_date"]
        for field in date_fields:
            if field in parameters and parameters[field]:
                date_value = parameters[field]
                if not isinstance(date_value, str) or len(date_value) != 10:
                    return False
                try:
                    datetime.strptime(date_value, "%Y-%m-%d")
                except ValueError:
                    return False
        
        return True
    
    def _get_parameter_schema(self) -> Dict[str, Any]:
        """Get the parameter schema for news search."""
        schema = super()._get_parameter_schema()
        
        # Add news-specific parameters
        schema["properties"].update({
            "category": {
                "type": "string",
                "description": "News category filter",
                "enum": list(self._news_categories.keys()) + ["general", "health"]
            },
            "country": {
                "type": "string",
                "description": "Country code for news (2-letter ISO)",
                "pattern": r"^[a-z]{2}$",
                "default": "us"
            },
            "sort_by": {
                "type": "string",
                "description": "Sort order for results",
                "enum": ["relevancy", "popularity", "publishedAt"],
                "default": "relevancy"
            },
            "from_date": {
                "type": "string",
                "description": "Start date for news search (YYYY-MM-DD)",
                "pattern": r"^\d{4}-\d{2}-\d{2}$"
            },
            "to_date": {
                "type": "string",
                "description": "End date for news search (YYYY-MM-DD)",
                "pattern": r"^\d{4}-\d{2}-\d{2}$"
            }
        })
        
        return schema