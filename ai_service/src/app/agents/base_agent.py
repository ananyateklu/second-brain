from typing import Dict, Any, Optional, List
from abc import ABC, abstractmethod
import time
from datetime import datetime, UTC
import aiohttp
import json
import logging
import urllib.parse
import asyncio
from scholarly import scholarly
import requests
from urllib.parse import quote
import re
from bs4 import BeautifulSoup
from app.config.settings import settings

logger = logging.getLogger(__name__)

class ToolExecutionError(Exception):
    """Raised when a tool execution fails"""
    pass

class BaseAgent(ABC):
    """Base class for all AI agents"""
    
    # Default configurations that can be overridden
    DEFAULT_RETRY_CONFIG = {
        "total": 5,
        "backoff_factor": 0.1,
        "status_forcelist": [500, 502, 503, 504]
    }
    
    # Expert search configurations
    KNOWN_EXPERTS = {
        "battery_technology": {
            "experts": [
                "Yet-Ming Chiang",
                "Donald Sadoway",
                "John Goodenough",
                "Stanley Whittingham"
            ],
            "keywords": [
                "battery technology",
                "solid state batteries",
                "liquid metal batteries",
                "battery manufacturing",
                "energy storage",
                "electrolytes"
            ]
        },
        "gene_editing": {
            "experts": [
                "Jennifer Doudna",
                "Feng Zhang",
                "Emmanuelle Charpentier",
                "David Liu",
                "Virginijus Siksnys",
                "George Church"
            ],
            "keywords": [
                "CRISPR",
                "gene editing",
                "genomics",
                "base editing",
                "synthetic biology"
            ]
        }
    }
    
    # Domain-specific configurations
    DOMAIN_KEYWORDS = {
        "battery": [
            "battery technology",
            "energy storage",
            "solid state batteries",
            "electrolytes",
            "battery manufacturing",
            "energy density"
        ],
        "crispr": [
            "CRISPR",
            "gene editing",
            "genomics",
            "genetic engineering",
            "molecular biology"
        ],
        "quantum": [
            "quantum computing",
            "quantum information",
            "quantum mechanics",
            "quantum algorithms",
            "quantum error correction"
        ],
        "ai": [
            "artificial intelligence",
            "machine learning",
            "deep learning",
            "neural networks",
            "natural language processing"
        ]
    }
    
    # News sources by category
    NEWS_SOURCES = {
        "technology": [
            "techcrunch",
            "wired",
            "the-verge",
            "ars-technica",
            "engadget",
            "recode"
        ],
        "science": [
            "new-scientist",
            "national-geographic",
            "next-big-future"
        ],
        "business": [
            "bloomberg",
            "business-insider",
            "financial-times",
            "fortune",
            "the-wall-street-journal"
        ]
    }
    
    # Common stop words for text processing
    STOP_WORDS = {
        "what", "who", "where", "when", "how", "why",
        "are", "is", "the", "in", "and", "or", "their",
        "recent", "find", "search", "look", "please",
        "could", "would", "should", "can", "will"
    }
    
    # Add valid language configurations
    VALID_LANGUAGES = {
        "ar", "de", "en", "es", "fr", "he", 
        "it", "nl", "no", "pt", "ru", "se", "zh"
    }
    
    # Add valid sort options for NewsAPI
    VALID_SORT_OPTIONS = {
        "relevancy", "popularity", "publishedAt"
    }
    
    # Add patent search configurations
    PATENT_SEARCH_CONFIG = {
        "max_results": 10,
        "sort_by": "relevance",
        "date_range": "5y"  # Default to last 5 years
    }
    
    def __init__(self, model_id: str, temperature: float = 0.7):
        self.model_id = model_id
        self.temperature = temperature
        self.execution_history = []
        self._author_cache = {}  # Cache for author profiles
        
    @abstractmethod
    async def execute(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Execute the agent's task"""
        pass
    
    def get_experts_for_domain(self, domain: str) -> Dict[str, List[str]]:
        """Get experts and keywords for a specific domain"""
        return self.KNOWN_EXPERTS.get(domain, {"experts": [], "keywords": []})
    
    def get_news_sources_for_category(self, category: str) -> List[str]:
        """Get news sources for a specific category"""
        return self.NEWS_SOURCES.get(category, [])
    
    def get_domain_keywords(self, domain: str) -> List[str]:
        """Get keywords for a specific domain"""
        return self.DOMAIN_KEYWORDS.get(domain, [])
    
    def is_stop_word(self, word: str) -> bool:
        """Check if a word is a stop word"""
        return word.lower() in self.STOP_WORDS
    
    @classmethod
    def add_domain_expert(cls, domain: str, expert_name: str, keywords: List[str]):
        """Add a new expert to a domain"""
        if domain not in cls.KNOWN_EXPERTS:
            cls.KNOWN_EXPERTS[domain] = {"experts": [], "keywords": []}
        if expert_name not in cls.KNOWN_EXPERTS[domain]["experts"]:
            cls.KNOWN_EXPERTS[domain]["experts"].append(expert_name)
        cls.KNOWN_EXPERTS[domain]["keywords"].extend(
            [k for k in keywords if k not in cls.KNOWN_EXPERTS[domain]["keywords"]]
        )
    
    @classmethod
    def add_news_source(cls, category: str, source: str):
        """Add a new news source to a category"""
        if category not in cls.NEWS_SOURCES:
            cls.NEWS_SOURCES[category] = []
        if source not in cls.NEWS_SOURCES[category]:
            cls.NEWS_SOURCES[category].append(source)
    
    async def execute_with_tools(self, prompt: str, tools: Optional[List[Dict[str, Any]]] = None, **kwargs) -> Dict[str, Any]:
        """Execute with optional tool support"""
        start_time = time.time()
        
        try:
            # Process tools if provided
            if tools:
                tool_results = []
                for tool in tools:
                    try:
                        logger.info(f"Executing tool: {tool['name']}")
                        result = await self._execute_tool(tool)
                        tool_results.append({
                            "tool": tool["name"],
                            "status": "success",
                            "result": result
                        })
                        logger.info(f"Tool {tool['name']} executed successfully")
                    except Exception as e:
                        logger.error(f"Tool {tool['name']} execution failed: {str(e)}")
                        tool_results.append({
                            "tool": tool["name"],
                            "status": "error",
                            "error": str(e)
                        })
                
                # Augment prompt with tool results
                tool_context = "\nTool Results:\n" + "\n".join(
                    f"- {r['tool']}: {r.get('result', f'Error: {r.get('error', 'Unknown error')}')})"
                    for r in tool_results
                )
                augmented_prompt = f"""
                Original Query: {prompt}
                
                Available Information from Tools:
                {tool_context}
                
                Please analyze the above information and provide a comprehensive response that:
                1. Synthesizes the gathered information
                2. Highlights key findings and developments
                3. Provides specific examples and data points
                4. Draws meaningful conclusions
                """
                prompt = augmented_prompt
            
            # Execute main task
            result = await self.execute(prompt, **kwargs)
            
            # Add execution metadata
            execution_time = time.time() - start_time
            execution_record = {
                "timestamp": datetime.now(UTC).isoformat(),
                "model_id": self.model_id,
                "execution_time": execution_time,
                "tools_used": [t["name"] for t in tools] if tools else [],
                "status": "success"
            }
            self.execution_history.append(execution_record)
            
            # Add metadata to result
            if isinstance(result, dict) and "metadata" in result:
                result["metadata"].update({
                    "execution_time": execution_time,
                    "tools_used": tools if tools else []
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Error in execute_with_tools: {str(e)}", exc_info=True)
            execution_record = {
                "timestamp": datetime.now(UTC).isoformat(),
                "model_id": self.model_id,
                "execution_time": time.time() - start_time,
                "tools_used": [t["name"] for t in tools] if tools else [],
                "status": "error",
                "error": str(e)
            }
            self.execution_history.append(execution_record)
            raise
    
    async def _execute_tool(self, tool: Dict[str, Any]) -> str:
        """Execute a tool and return the result"""
        try:
            tool_type = tool.get("type")
            if not tool_type:
                raise ToolExecutionError("Tool type not specified")
                
            if tool_type == "api_call":
                return await self._execute_api_call(tool)
            else:
                raise ToolExecutionError(f"Unsupported tool type: {tool_type}")
        except Exception as e:
            logger.error(f"Tool execution failed: {str(e)}")
            raise ToolExecutionError(f"Tool execution failed: {str(e)}")
    
    async def _execute_api_call(self, tool: Dict[str, Any]) -> str:
        """Execute an API call based on the tool name"""
        tool_name = tool.get("name", "").lower()
        parameters = tool.get("parameters", {})
        
        if tool_name == "web_search":
            return await self._execute_web_search(parameters)
        elif tool_name == "academic_search":
            return await self._execute_academic_search(parameters)
        elif tool_name == "news_search":
            return await self._execute_news_search(parameters)
        elif tool_name == "expert_search":
            return await self._execute_expert_search(parameters)
        elif tool_name == "patent_search":
            return await self._execute_patent_search(parameters)
        else:
            raise ToolExecutionError(f"Unknown tool name: {tool_name}")
    
    async def _execute_web_search(self, parameters: Dict[str, Any]) -> str:
        """Execute web search using DuckDuckGo"""
        try:
            from duckduckgo_search import DDGS
            query = parameters.get("query", "")
            max_results = parameters.get("max_results", 5)
            region = parameters.get("region", "wt-wt")
            
            # Clean and truncate query
            query = re.sub(r'[^\w\s-]', ' ', query)  # Remove special characters
            query = ' '.join(query.split())  # Normalize whitespace
            if len(query) > 100:  # Limit length
                query = query[:100].rsplit(' ', 1)[0]
            
            results = []
            with DDGS() as ddgs:
                try:
                    # Try to get news results first
                    try:
                        news_results = list(ddgs.news(
                            keywords=query,
                            max_results=max_results,
                            region=region
                        ))
                        
                        if news_results:
                            for r in news_results:
                                if isinstance(r, dict):
                                    results.append({
                                        "title": r.get("title"),
                                        "link": r.get("link"),
                                        "snippet": r.get("body"),
                                        "source": "news",
                                        "published": r.get("date")
                                    })
                    except Exception as news_error:
                        logger.warning(f"News search failed: {str(news_error)}")
                    
                    # Try to get web results
                    try:
                        web_results = list(ddgs.text(
                            keywords=query,
                            max_results=max_results,
                            region=region
                        ))
                        
                        for r in web_results:
                            if isinstance(r, dict):
                                results.append({
                                    "title": r.get("title"),
                                    "link": r.get("link"),
                                    "snippet": r.get("body"),
                                    "source": "web",
                                    "published": None
                                })
                    except Exception as web_error:
                        logger.warning(f"Web search failed: {str(web_error)}")
                    
                    # If both methods failed, try one last time with minimal parameters
                    if not results:
                        logger.warning("Trying fallback search method")
                        simple_query = " ".join(query.split()[:5])
                        fallback_results = list(ddgs.text(
                            keywords=simple_query,
                            max_results=3,
                            region="wt-wt"
                        ))
                        
                        for r in fallback_results:
                            if isinstance(r, dict):
                                results.append({
                                    "title": r.get("title"),
                                    "link": r.get("link"),
                                    "snippet": r.get("body"),
                                    "source": "fallback",
                                    "published": None
                                })
                
                except Exception as e:
                    logger.error(f"All search methods failed: {str(e)}")
            
            if not results:
                logger.warning("No results found from any search method")
                return json.dumps([{"message": "No results found"}])
            
            # Deduplicate results based on URL
            seen_urls = set()
            unique_results = []
            for r in results:
                if r.get("link") and r.get("link") not in seen_urls:
                    seen_urls.add(r.get("link"))
                    unique_results.append(r)
            
            return json.dumps(unique_results[:max_results])
            
        except Exception as e:
            logger.error(f"Web search failed: {str(e)}")
            return json.dumps([{"message": f"Search failed: {str(e)}"}])
    
    def _clean_search_query(self, query: str) -> str:
        """Clean and prepare search query"""
        # Remove special characters and extra whitespace
        query = re.sub(r'[^\w\s-]', ' ', query)
        query = ' '.join(query.split())
        
        # Limit query length
        if len(query) > 100:
            # Keep first 100 chars but break at last complete word
            query = query[:100].rsplit(' ', 1)[0]
        
        return query
    
    async def _execute_news_search(self, parameters: Dict[str, Any]) -> str:
        """Execute news search using NewsAPI"""
        try:
            from newsapi import NewsApiClient
            from app.config.settings import settings
            
            if not settings.NEWS_API_KEY:
                raise ToolExecutionError("NewsAPI key not configured")
            
            newsapi = NewsApiClient(api_key=settings.NEWS_API_KEY)
            query = parameters.get("query", "")
            category = self._determine_news_category(query)
            
            # Validate and set language
            language = parameters.get("language", "en")
            if isinstance(language, str) and language in self.VALID_LANGUAGES:
                params_language = language
            else:
                logger.warning(f"Invalid language {language}, defaulting to 'en'")
                params_language = "en"
            
            # Validate and set sort
            sort_by = parameters.get("sort_by", "relevancy")
            if isinstance(sort_by, str) and sort_by in self.VALID_SORT_OPTIONS:
                params_sort = sort_by
            else:
                logger.warning(f"Invalid sort option {sort_by}, defaulting to 'relevancy'")
                params_sort = "relevancy"
            
            # Build base parameters
            params = {
                "q": query,
                "language": params_language,
                "sort_by": params_sort,
                "page_size": parameters.get("max_results", 3)
            }
            
            # Add date range if specified
            date_range = parameters.get("date_range", "")
            if date_range:
                from datetime import datetime, timedelta
                if date_range == "day":
                    params["from_param"] = (datetime.now() - timedelta(days=1)).isoformat()
                elif date_range == "week":
                    params["from_param"] = (datetime.now() - timedelta(weeks=1)).isoformat()
                elif date_range == "month":
                    params["from_param"] = (datetime.now() - timedelta(days=30)).isoformat()
            
            # Try category-based search first
            try:
                if category in ["technology", "science", "business"]:
                    response = newsapi.get_top_headlines(
                        q=query,
                        category=category,
                        language=params_language,
                        page_size=params["page_size"]
                    )
                else:
                    response = newsapi.get_everything(**params)
            except Exception as e:
                logger.warning(f"Category-based search failed, falling back to everything: {str(e)}")
                response = newsapi.get_everything(**params)
            
            articles = response.get("articles", [])
            
            # Process and clean up articles
            processed_articles = []
            for article in articles:
                processed_article = {
                    "title": article.get("title", ""),
                    "description": article.get("description", ""),
                    "url": article.get("url", ""),
                    "source": article.get("source", {}).get("name", ""),
                    "published_at": article.get("publishedAt", ""),
                    "category": category
                }
                processed_articles.append(processed_article)
            
            return json.dumps(processed_articles)
                
        except Exception as e:
            logger.error(f"News search failed: {str(e)}")
            return json.dumps([])
    
    async def _execute_patent_search(self, parameters: Dict[str, Any]) -> str:
        """Execute patent search using Google Patents API via HTTP requests"""
        try:
            import aiohttp
            from datetime import datetime, timedelta
            import re
            from bs4 import BeautifulSoup
            
            query = parameters.get("query", "")
            max_results = parameters.get("max_results", self.PATENT_SEARCH_CONFIG["max_results"])
            date_range = parameters.get("date_range", self.PATENT_SEARCH_CONFIG["date_range"])
            
            # Clean and encode the query
            query = re.sub(r'[^\w\s-]', '', query)  # Remove special characters
            search_query = query.replace(" ", "+")
            
            # Add date filter
            if date_range:
                end_date = datetime.now()
                if date_range == "1y":
                    start_date = end_date - timedelta(days=365)
                elif date_range == "5y":
                    start_date = end_date - timedelta(days=365 * 5)
                else:
                    start_date = end_date - timedelta(days=365 * 10)
                search_query += f"+after:{start_date.strftime('%Y-%m-%d')}"
            
            # Direct web search for patents
            search_url = f"https://patents.google.com/xhr/query?url=q%3D{search_query}"
            headers = {
                "User-Agent": "Mozilla/5.0 (compatible; ResearchAgent/1.0)",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                "Referer": "https://patents.google.com/"
            }
            
            async with aiohttp.ClientSession() as session:
                try:
                    async with session.get(search_url, headers=headers) as response:
                        if response.status == 200:
                            html_content = await response.text()
                            soup = BeautifulSoup(html_content, 'html.parser')
                            
                            results = []
                            patent_elements = soup.find_all('search-result', limit=max_results)
                            
                            for element in patent_elements:
                                try:
                                    title_elem = element.find('h3')
                                    abstract_elem = element.find('search-result-abstract')
                                    patent_id = element.get('data-result', '')
                                    
                                    result = {
                                        "title": title_elem.text.strip() if title_elem else "",
                                        "abstract": abstract_elem.text.strip() if abstract_elem else "",
                                        "patent_number": patent_id,
                                        "url": f"https://patents.google.com/patent/{patent_id}" if patent_id else ""
                                    }
                                    
                                    # Only add if we have at least a title or patent number
                                    if result["title"] or result["patent_number"]:
                                        results.append(result)
                                except Exception as e:
                                    logger.warning(f"Error processing patent element: {str(e)}")
                                    continue
                            
                            return json.dumps({
                                "status": "success",
                                "results": results[:max_results],
                                "query": search_query
                            })
                        else:
                            logger.warning(f"Patent search failed with status code: {response.status}")
                except Exception as e:
                    logger.warning(f"Patent search request failed: {str(e)}")
            
            # If we get here, try a simpler search approach
            try:
                simple_search_url = f"https://patents.google.com/?q={search_query}&oq={search_query}"
                async with session.get(simple_search_url, headers=headers) as response:
                    if response.status == 200:
                        text = await response.text()
                        # Use regex to find patent numbers and titles
                        results = []
                        matches = re.finditer(r'<article[^>]*>.*?<h3[^>]*>([^<]+)</h3>.*?<a[^>]*href="/patent/([^"]+)"', 
                                           text, re.DOTALL)
                        
                        for match in matches:
                            title, patent_id = match.groups()
                            results.append({
                                "title": title.strip(),
                                "patent_number": patent_id,
                                "url": f"https://patents.google.com/patent/{patent_id}"
                            })
                            if len(results) >= max_results:
                                break
                        
                        return json.dumps({
                            "status": "success",
                            "results": results,
                            "query": search_query
                        })
            except Exception as e:
                logger.warning(f"Simple patent search failed: {str(e)}")
            
            return json.dumps({
                "status": "error",
                "message": "Failed to retrieve patent information",
                "results": []
            })
                        
        except Exception as e:
            logger.error(f"Patent search failed: {str(e)}")
            return json.dumps({
                "status": "error",
                "message": f"Patent search failed: {str(e)}",
                "results": []
            })
    
    def _determine_news_category(self, query: str) -> str:
        """Determine the news category based on the query"""
        query_lower = query.lower()
        
        # Check each domain's keywords
        for domain, keywords in self.DOMAIN_KEYWORDS.items():
            if any(keyword in query_lower for keyword in keywords):
                if domain in ["battery", "quantum", "ai"]:
                    return "technology"
                elif domain == "crispr":
                    return "science"
        
        return "general"
    
    async def _execute_database_query(self, tool: Dict[str, Any]) -> Any:
        """Execute a database query tool"""
        raise NotImplementedError("Database query not implemented yet")
    
    async def validate_response(self, response: Any) -> bool:
        """Validate the agent's response"""
        if not response or not isinstance(response, dict):
            return False
            
        required_fields = ["result", "metadata"]
        if not all(field in response for field in required_fields):
            return False
            
        metadata = response.get("metadata", {})
        if not isinstance(metadata, dict):
            return False
            
        result = response.get("result")
        if not isinstance(result, str) or not result.strip():
            return False
            
        return True
    
    def get_execution_history(self) -> List[Dict[str, Any]]:
        """Get the agent's execution history"""
        return self.execution_history
    
    async def _execute_academic_search(self, parameters: Dict[str, Any]) -> str:
        """Execute academic search using Semantic Scholar"""
        try:
            query = parameters.get("query", "")
            max_results = parameters.get("max_results", 3)
            year_range = parameters.get("year_range", "")
            
            # Clean and optimize query
            query = self._clean_search_query(query)
            
            # Extract key terms for better search
            key_terms = []
            for term in query.split():
                term_lower = term.lower()
                if term_lower in ["cnn", "ai", "ml", "deep", "learning", "neural", "generative", "machine", "model", "models"]:
                    key_terms.append(term)
            
            # Create optimized queries
            queries = []
            if key_terms:
                # Technical terms only
                queries.append(" ".join(key_terms))
                # Technical terms + truncated query
                if len(query) > 100:
                    queries.append(f"{' '.join(key_terms)} {query[:100]}")
            else:
                # Just use truncated query
                queries.append(query[:100])
            
            all_results = []
            seen_titles = set()
            
            for search_query in queries:
                try:
                    import httpx
                    
                    url = "https://api.semanticscholar.org/graph/v1/paper/search"
                    params = {
                        "query": search_query,
                        "fields": "title,authors,year,citationCount,url,abstract,venue,fieldsOfStudy",
                        "offset": 0,
                        "limit": max_results * 2
                    }
                    
                    async with httpx.AsyncClient() as client:
                        response = await client.get(url, params=params)
                        response.raise_for_status()
                        data = response.json()
                        
                        if data.get("data"):
                            for paper in data["data"]:
                                # Skip if we've seen this paper
                                title = paper.get("title")
                                if not title or title in seen_titles:
                                    continue
                                    
                                # Filter by year range if specified
                                if year_range and paper.get("year"):
                                    if not self._is_in_year_range(str(paper["year"]), year_range):
                                        continue
                                
                                # Calculate relevance score
                                relevance_score = 0
                                paper_text = " ".join([
                                    title,
                                    paper.get("abstract", ""),
                                    " ".join(paper.get("fieldsOfStudy", [])),
                                    paper.get("venue", "")
                                ]).lower()
                                
                                for term in key_terms:
                                    if term.lower() in paper_text:
                                        relevance_score += 1
                                
                                result = {
                                    "title": title,
                                    "authors": [author.get("name") for author in paper.get("authors", [])],
                                    "year": paper.get("year"),
                                    "citations": paper.get("citationCount"),
                                    "url": paper.get("url"),
                                    "abstract": paper.get("abstract"),
                                    "venue": paper.get("venue"),
                                    "fields": paper.get("fieldsOfStudy", []),
                                    "relevance_score": relevance_score,
                                    "source": "semantic_scholar"
                                }
                                
                                all_results.append(result)
                                seen_titles.add(title)
                
                except Exception as e:
                    logger.warning(f"Search failed for query '{search_query}': {str(e)}")
                    continue
            
            if all_results:
                # Sort by relevance and citations
                sorted_results = sorted(
                    all_results,
                    key=lambda x: (x["relevance_score"], x.get("citations", 0)),
                    reverse=True
                )
                
                # Return top results
                return json.dumps(sorted_results[:max_results])
            
            logger.warning("No results found from any query")
            return json.dumps([{"message": "No academic results found"}])
            
        except Exception as e:
            logger.error(f"Academic search failed: {str(e)}")
            return json.dumps([{"message": f"Search failed: {str(e)}"}])
    
    def _is_in_year_range(self, year: str, year_range: str) -> bool:
        """Helper method to check if a year falls within a specified range"""
        try:
            year = int(year)
            if "-" in year_range:
                start, end = map(int, year_range.split("-"))
                return start <= year <= end
            else:
                target = int(year_range)
                return year == target
        except (ValueError, TypeError):
            return False
    
    async def _execute_expert_search(self, parameters: Dict[str, Any]) -> str:
        """Execute expert search using Semantic Scholar"""
        try:
            query = parameters.get("query", "")
            expertise_area = parameters.get("expertise_area", "")
            max_results = parameters.get("max_results", 3)
            
            # Clean and prepare query
            query = self._clean_search_query(query)
            if expertise_area:
                expertise_area = self._clean_search_query(expertise_area)
                query = f"{query} {expertise_area}"
            
            # Extract key terms for better search
            key_terms = []
            for term in query.split():
                if term.lower() in ["cnn", "ai", "ml", "deep", "learning", "neural", "generative"]:
                    key_terms.append(term)
            
            # Optimize query
            search_query = " ".join(key_terms) if key_terms else query[:100]
            
            try:
                import httpx
                
                # Use Semantic Scholar API to find relevant papers first
                url = "https://api.semanticscholar.org/graph/v1/paper/search"
                params = {
                    "query": search_query,
                    "fields": "title,authors,year,citationCount,url,abstract,venue",
                    "offset": 0,
                    "limit": max_results * 2  # Get more results to find experts
                }
                
                async with httpx.AsyncClient() as client:
                    response = await client.get(url, params=params)
                    response.raise_for_status()
                    data = response.json()
                    
                    if not data.get("data"):
                        logger.warning("No papers found to identify experts")
                        return json.dumps([{"message": "No experts found"}])
                    
                    # Extract authors and their papers
                    author_papers = {}
                    for paper in data["data"]:
                        for author in paper.get("authors", []):
                            if not author.get("name"):
                                continue
                            
                            author_id = author.get("authorId")
                            if not author_id:
                                continue
                                
                            if author_id not in author_papers:
                                author_papers[author_id] = {
                                    "name": author.get("name"),
                                    "papers": [],
                                    "total_citations": 0,
                                    "venues": []  # Changed from set to list
                                }
                            
                            author_papers[author_id]["papers"].append({
                                "title": paper.get("title"),
                                "year": paper.get("year"),
                                "citations": paper.get("citationCount", 0),
                                "venue": paper.get("venue")
                            })
                            
                            if paper.get("venue") and paper["venue"] not in author_papers[author_id]["venues"]:
                                author_papers[author_id]["venues"].append(paper["venue"])
                            
                            author_papers[author_id]["total_citations"] += paper.get("citationCount", 0)
                    
                    # Sort authors by citation count and prepare results
                    sorted_authors = sorted(
                        author_papers.values(),
                        key=lambda x: x["total_citations"],
                        reverse=True
                    )
                    
                    results = []
                    for author in sorted_authors[:max_results]:
                        # Extract expertise areas from venues
                        expertise_areas = set()
                        for venue in author["venues"]:
                            if venue:
                                # Split venue name and add individual terms as expertise areas
                                terms = [t.strip() for t in venue.split() if len(t.strip()) > 2]
                                expertise_areas.update(terms)
                        
                        results.append({
                            "name": author["name"],
                            "total_citations": author["total_citations"],
                            "paper_count": len(author["papers"]),
                            "venues": author["venues"],
                            "recent_papers": sorted(
                                author["papers"],
                                key=lambda x: (x.get("year", 0), x.get("citations", 0)),
                                reverse=True
                            )[:3],
                            "expertise_areas": list(expertise_areas)[:5]
                        })
                    
                    if results:
                        return json.dumps(results)
                    
                    logger.warning("No experts found after processing")
                    return json.dumps([{"message": "No experts found"}])
            
            except Exception as e:
                logger.warning(f"Expert search failed: {str(e)}")
                return json.dumps([{"message": f"Expert search failed: {str(e)}"}])
            
        except Exception as e:
            logger.error(f"Expert search failed: {str(e)}")
            return json.dumps([{"message": f"Search failed: {str(e)}"}])