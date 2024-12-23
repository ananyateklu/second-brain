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
import httpx
from collections import defaultdict
from duckduckgo_search import DDGS

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
    
    NO_ABSTRACT_MSG = "No abstract available"
    
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
        self.logger = logger
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
    
    def _process_search_result(self, result: Dict[str, Any], method_name: str) -> Optional[Dict[str, Any]]:
        """Process a single search result"""
        if not isinstance(result, dict):
            return None
            
        processed = {
            "title": result.get("title", ""),
            "link": result.get("href", result.get("link", "")),  # Try both href and link fields
            "snippet": result.get("body", result.get("snippet", "")),  # Try both body and snippet fields
            "source": method_name,
            "published": result.get("date") if method_name == "news" else None
        }
        
        if processed["title"] and processed["snippet"] and len(processed["snippet"]) > 20:
            return processed
        return None

    async def _execute_search_method(self, ddgs: Any, method_name: str, search_method: Any, query: str, remaining_results: int, region: str) -> List[Dict[str, Any]]:
        """Execute a single search method"""
        results = []
        try:
            search_results = list(search_method(
                keywords=query,
                max_results=remaining_results,
                region=region
            ))
            
            for r in search_results:
                if processed := self._process_search_result(r, method_name):
                    results.append(processed)
                    
        except Exception as e:
            logger.warning(f"{method_name} search failed: {str(e)}")
        
        return results

    async def _try_simplified_search(self, query: str, max_results: int) -> List[Dict[str, Any]]:
        """Try a simplified search by removing special characters and shortening query"""
        # Remove special characters and extra whitespace
        simplified = re.sub(r'[^\w\s]', ' ', query).strip()
        simplified = ' '.join(simplified.split()[:3])  # Take first 3 words
        
        logger.info(f"Trying simplified search with query: '{simplified}'")
        
        try:
            with DDGS() as ddg:  # Use synchronous DDGS
                # Get results as a list
                results_list = list(ddg.text(simplified, region="us-en", max_results=max_results))
                logger.debug(f"Got {len(results_list)} raw simplified results")
                
                results = []
                for r in results_list:
                    logger.debug(f"Raw simplified search result: {r}")
                    processed = self._process_search_result(r, "web")
                    if processed:
                        processed["note"] = "From simplified search"  # Add note to indicate simplified results
                        logger.debug(f"Processed simplified search result: {processed}")
                        results.append(processed)
                    if len(results) >= max_results:
                        break
                
                logger.info(f"Simplified search completed. Found {len(results)} results")
                return results
        except Exception as e:
            logger.error(f"Error in simplified search: {str(e)}", exc_info=True)
            return []

    def _create_search_response(self, success: bool, results: List[Dict[str, Any]], query: str, max_results: int, error: Optional[str] = None) -> str:
        """Create a standardized search response"""
        response = {
            "success": success,
            "results": results[:max_results] if success else [],
            "total_found": len(results) if success else 0,
            "sources": ["DuckDuckGo Text Search", "DuckDuckGo News Search"] if success else [],
            "tools_used": ["web_search"],
            "query": query,
            "research_type": "web",
            "error": error
        }
        return json.dumps(response)

    async def _execute_web_search(self, parameters: Dict[str, Any]) -> str:
        """Execute a web search using DuckDuckGo"""
        try:
            query = self._clean_search_query(parameters.get("query", ""))
            max_results = parameters.get("max_results", 5)
            region = parameters.get("region", "us-en")
            
            logger.info(f"Starting web search with query: '{query}', max_results: {max_results}, region: {region}")
            results = []
            
            search_methods = [
                ("text", lambda ddg: ddg.text(keywords=query, region=region, max_results=max_results)),
                ("news", lambda ddg: ddg.news(keywords=query, region=region, max_results=max_results))
            ]
            
            for method_name, search_func in search_methods:
                if len(results) >= max_results:
                    break
                    
                try:
                    with DDGS() as ddg:
                        results.extend(self._process_search_results(search_func(ddg), method_name))
                except Exception as e:
                    logger.warning(f"{method_name} search failed: {str(e)}, trying next method")
            
            if not results:
                logger.info("No results found with main queries, attempting simplified search")
                results.extend(await self._try_simplified_search(query, max_results))
            
            return self._create_search_response(bool(results), results, query, max_results)
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error in web search: {error_msg}", exc_info=True)
            return self._create_search_response(False, [], parameters.get("query", ""), parameters.get("max_results", 5), error_msg)

    def _process_search_results(self, results: List[Dict[str, Any]], method_name: str) -> List[Dict[str, Any]]:
        """Process search results from a single method"""
        processed = []
        for r in results:
            if result := self._process_search_result(r, method_name):
                processed.append(result)
        return processed

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
    
    def _process_news_article(self, article: Dict[str, Any], category: str) -> Dict[str, Any]:
        """Process a single news article"""
        return {
            "title": article.get("title", ""),
            "description": article.get("description", ""),
            "url": article.get("url", ""),
            "source": article.get("source", {}).get("name", ""),
            "published_at": article.get("publishedAt", ""),
            "category": category
        }

    async def _execute_news_search_request(self, newsapi: Any, query: str, category: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the news search request"""
        try:
            if category in ["technology", "science", "business"]:
                return newsapi.get_top_headlines(
                    q=query,
                    category=category,
                    language=params["language"],
                    page_size=params["page_size"]
                )
            return newsapi.get_everything(**params)
        except Exception as e:
            logger.warning(f"Category-based search failed, falling back to everything: {str(e)}")
            return newsapi.get_everything(**params)

    async def _execute_news_search(self, parameters: Dict[str, Any]) -> str:
        """Execute news search using NewsAPI"""
        try:
            from newsapi import NewsApiClient
            if not settings.NEWS_API_KEY:
                raise ToolExecutionError("NewsAPI key not configured")
            
            newsapi = NewsApiClient(api_key=settings.NEWS_API_KEY)
            query = parameters.get("query", "")
            category = self._determine_news_category(query)
            
            # Use proper parameter values instead of string literals
            params = {
                "q": query,
                "language": "en",  # Fixed language code
                "sort_by": "relevancy",  # Fixed sort parameter
                "page_size": parameters.get("max_results", 3)
            }
            
            logger.info(f"Executing news search with params: {json.dumps(params, indent=2)}")
            
            try:
                if category in ["technology", "science", "business"]:
                    response = newsapi.get_top_headlines(
                        q=query,
                        category=category,
                        language="en",
                        page_size=params["page_size"]
                    )
                else:
                    response = newsapi.get_everything(**params)
                    
                articles = response.get("articles", [])
                processed_articles = [self._process_news_article(article, category) for article in articles]
                
                logger.info(f"Processed {len(processed_articles)} news articles")
                return json.dumps({
                    "success": True,
                    "results": processed_articles,
                    "total_found": len(processed_articles)
                })
                
            except ValueError as ve:
                logger.error(f"NewsAPI parameter error: {str(ve)}")
                return json.dumps({
                    "success": False,
                    "error": str(ve),
                    "results": []
                })
                
        except Exception as e:
            logger.error(f"News search failed: {str(e)}", exc_info=True)
            return json.dumps({
                "success": False,
                "error": str(e),
                "results": []
            })
    
    def _build_patent_search_urls(self, search_query: str) -> List[str]:
        """Build list of patent search URLs"""
        return [
            f"https://patents.google.com/xhr/query?url=q%3D{search_query}%26oq%3D{search_query}",
            f"https://patents.google.com/xhr/query?url=q%3D{search_query}%26patents%3Dtrue",
            f"https://patents.google.com/xhr/query?before=publication:{datetime.now().strftime('%Y%m%d')}&q={search_query}"
        ]

    def _get_patent_headers(self) -> Dict[str, str]:
        """Get headers for patent search requests"""
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://patents.google.com/",
            "DNT": "1",
            "Connection": "keep-alive"
        }

    def _process_json_patent(self, item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Process a single patent from JSON response"""
        result = {
            "title": item.get("title", "").strip(),
            "patent_number": item.get("patent_number", ""),
            "abstract": item.get("abstract", "").strip(),
            "inventors": item.get("inventors", []),
            "assignee": item.get("assignee", ""),
            "filing_date": item.get("filing_date", ""),
            "url": f"https://patents.google.com/patent/{item.get('patent_number', '')}"
        }
        return result if result["title"] and result["patent_number"] else None

    def _extract_patent_title(self, element: Any) -> str:
        """Extract patent title from element"""
        title_elem = element.find('h3', class_='result-title') or element.find('h3')
        return title_elem.text.strip() if title_elem else ""

    def _extract_patent_id(self, element: Any) -> str:
        """Extract patent ID from element"""
        patent_id = element.get('data-patent-number', '')
        if not patent_id and (link := element.find('a', href=True)):
            patent_id = link['href'].split('/')[-1]
        return patent_id

    def _extract_patent_abstract(self, element: Any) -> str:
        """Extract patent abstract from element"""
        abstract_elem = element.find('div', class_='abstract')
        return abstract_elem.text.strip() if abstract_elem else ""

    def _create_patent_result(self, title: str, patent_id: str, abstract: str) -> Dict[str, Any]:
        """Create a patent result dictionary"""
        return {
            "title": title,
            "patent_number": patent_id,
            "abstract": abstract,
            "url": f"https://patents.google.com/patent/{patent_id}"
        }

    def _find_patent_elements(self, soup: BeautifulSoup) -> List[Any]:
        """Find patent elements in HTML soup"""
        return (
            soup.find_all('search-result') or 
            soup.find_all('article', class_='patent-result') or
            soup.find_all('div', class_='patent-result')
        )

    async def _process_json_results(self, data: Dict[str, Any], max_results: int) -> List[Dict[str, Any]]:
        """Process JSON patent results"""
        results = []
        if isinstance(data, dict) and "results" in data:
            for item in data["results"]:
                if len(results) >= max_results:
                    break
                if result := self._process_json_patent(item):
                    results.append(result)
        return results

    def _extract_patent_info(self, element: Any) -> Optional[Dict[str, Any]]:
        """Extract patent information from HTML element"""
        title = self._extract_patent_title(element)
        patent_id = (
            element.get('data-result')
            or element.get('data-patent-number')
            or (element.find('a', href=True)['href'].split('/')[-1] if element.find('a', href=True) else "")
        )
        abstract = self._extract_patent_abstract(element)

        if title and patent_id:
            return self._create_patent_result(title, patent_id, abstract)
        return None

    async def _process_patent_response(self, response: aiohttp.ClientResponse, max_results: int) -> List[Dict[str, Any]]:
        """Process patent search response"""
        try:
            text = await response.text()
            soup = BeautifulSoup(text, 'html.parser')
            results = []
            
            for element in self._find_patent_elements(soup)[:max_results]:
                try:
                    title = self._extract_patent_title(element)
                    patent_id = self._extract_patent_id(element)
                    
                    if title and patent_id:
                        abstract = self._extract_patent_abstract(element)
                        results.append(self._create_patent_result(title, patent_id, abstract))
                except Exception as e:
                    logger.error(f"Error processing patent element: {str(e)}")
                    continue
            
            return results
            
        except Exception as e:
            logger.error(f"Error processing patent response: {str(e)}")
            return []

    def _process_academic_result(self, paper: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Process a single academic search result"""
        try:
            # Skip papers without required fields
            if not paper.get("title") or not paper.get("url"):
                return None
            
            # Safely get and clean text fields
            title = paper.get("title", "").strip()
            abstract = paper.get("abstract", "")
            if abstract:
                abstract = abstract.strip()
            else:
                abstract = self.NO_ABSTRACT_MSG
            
            # Process authors safely
            authors = paper.get("authors", [])
            author_names = []
            for author in authors:
                if author and isinstance(author, dict):
                    name = author.get("name")
                    if name and isinstance(name, str):
                        author_names.append(name.strip())
            
            # Get other metadata with defaults
            year = paper.get("year", "Unknown year")
            citation_count = paper.get("citationCount", 0)
            venue = paper.get("venue", {})
            venue_name = venue.get("name", "Unknown venue") if isinstance(venue, dict) else str(venue)
            fields = paper.get("fieldsOfStudy", [])
            
            # Construct processed result
            return {
                "title": title,
                "url": paper["url"],
                "abstract": abstract,
                "authors": author_names,
                "year": year,
                "citation_count": citation_count,
                "venue": venue_name,
                "fields": fields,
                "source": "Semantic Scholar",
                "type": "academic"
            }
            
        except Exception as e:
            logger.error(f"Error processing paper: {str(e)}", exc_info=True)
            return None

    async def _execute_patent_search(self, parameters: Dict[str, Any]) -> str:
        """Execute patent search using Google Patents"""
        try:
            query = quote(parameters.get("query", "").strip())
            max_results = parameters.get("max_results", self.PATENT_SEARCH_CONFIG["max_results"])
            
            # Build search URL
            base_url = "https://patents.google.com"
            search_url = f"{base_url}/patents/search?q={query}&oq={query}"
            
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1"
            }
            
            async with aiohttp.ClientSession() as session:
                try:
                    async with session.get(search_url, headers=headers, timeout=30) as response:
                        if response.status == 200:
                            results = await self._process_patent_response(response, max_results)
                            if results:
                                return json.dumps({
                                    "success": True,
                                    "results": results,
                                    "total_found": len(results)
                                })
                except Exception as e:
                    logger.error(f"Error fetching patents: {str(e)}")
            
            return json.dumps({
                "success": False,
                "error": "No patent results found",
                "results": []
            })
            
        except Exception as e:
            logger.error(f"Patent search failed: {str(e)}")
            return json.dumps({
                "success": False,
                "error": str(e),
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

    def _validate_paper_basics(self, paper: Dict[str, Any]) -> bool:
        """Validate basic paper requirements"""
        if not paper or not isinstance(paper, dict):
            logger.debug("Skipping invalid paper object")
            return False
            
        title = paper.get("title")
        if not title or not isinstance(title, str) or not title.strip():
            logger.debug("Skipping paper with invalid title")
            return False
            
        return True

    def _extract_authors(self, authors_data: List[Dict[str, Any]]) -> List[str]:
        """Extract valid author names from authors data"""
        authors = []
        for author in authors_data:
            if isinstance(author, dict) and "name" in author:
                name = author["name"]
                if isinstance(name, str) and name.strip():
                    authors.append(name.strip())
        return authors

    def _get_validated_field(self, data: Dict[str, Any], field: str, default: Any) -> Any:
        """Get and validate a field from paper data"""
        value = data.get(field)
        
        if field == "year":
            if not isinstance(value, (int, str)) or not value:
                return default
        elif field == "citationCount":
            if not isinstance(value, (int, float)) or value is None:
                return default
        elif field in ["abstract", "venue", "url"]:
            if not value or not isinstance(value, str):
                return default
            return value.strip()
            
        return value if value is not None else default

    async def _process_semantic_scholar_paper(self, paper: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Process a single paper from Semantic Scholar"""
        try:
            if not self._validate_paper_basics(paper):
                return None

            processed_paper = {
                "title": paper["title"].strip(),
                "authors": self._extract_authors(paper.get("authors", [])),
                "year": self._get_validated_field(paper, "year", "Unknown year"),
                "abstract": self._get_validated_field(paper, "abstract", self.NO_ABSTRACT_MSG),
                "url": self._get_validated_field(paper, "url", ""),
                "venue": self._get_validated_field(paper, "venue", "Unknown venue"),
                "citations": self._get_validated_field(paper, "citationCount", 0)
            }

            # Validate minimum required fields
            if processed_paper["title"] and (
                processed_paper["abstract"] != self.NO_ABSTRACT_MSG 
                or processed_paper["authors"]
            ):
                logger.debug(f"Successfully processed paper: {processed_paper['title'][:50]}...")
                return processed_paper

            logger.debug("Skipping paper due to insufficient data")
            return None

        except Exception as e:
            logger.error(f"Error processing paper: {str(e)}", exc_info=True)
            return None

    async def _process_papers_batch(self, papers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process a batch of papers"""
        processed_papers = []
        for paper in papers:
            try:
                if processed := await self._process_semantic_scholar_paper(paper):
                    processed_papers.append(processed)
                    logger.debug(f"Added paper to results: {processed['title'][:50]}...")
            except Exception as e:
                logger.error(f"Error processing paper in batch: {str(e)}")
                continue
        
        # Sort papers by citations and year
        processed_papers.sort(key=lambda x: (x.get("citations", 0), x.get("year", 0)), reverse=True)
        return processed_papers

    async def _fetch_semantic_scholar_papers(self, query: str) -> Optional[Dict[str, Any]]:
        """Fetch papers from Semantic Scholar API"""
        api_params = {
            "query": query,
            "fields": "title,authors,year,citationCount,url,abstract,venue,fieldsOfStudy",
            "offset": 0,
            "limit": 6  # Fetch a few extra for filtering
        }
        
        logger.info(f"Semantic Scholar API params: {api_params}")
        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                logger.info(f"Making Semantic Scholar API request (attempt {attempt + 1}/{max_retries})")
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        "https://api.semanticscholar.org/graph/v1/paper/search",
                        params=api_params,
                        timeout=30.0
                    )
                    logger.info(f"Semantic Scholar API response status: {response.status_code}")
                    
                    if response.status_code == 200:
                        return response.json()
                    elif response.status_code == 429:  # Rate limit
                        if attempt < max_retries - 1:
                            await asyncio.sleep(2 ** attempt)
                            continue
                        logger.error("Rate limit exceeded for Semantic Scholar API")
                        break
                    else:
                        logger.error(f"Semantic Scholar API error: {response.status_code}")
                        break
                        
            except Exception as e:
                logger.error(f"Error in Semantic Scholar request: {str(e)}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                    continue
                break
        
        return None

    async def _try_fetch_papers(self, query: str) -> Optional[Dict[str, Any]]:
        """Attempt to fetch and process papers with retry logic"""
        logger.info(f"Starting Semantic Scholar search with query: {query}")
        
        for attempt in range(3):
            try:
                data = await self._fetch_semantic_scholar_papers(query)
                if not data or "data" not in data:
                    continue
                
                if processed_papers := await self._process_papers_batch(data["data"]):
                    logger.info(f"Found {len(processed_papers)} processed papers")
                    return {
                        "papers": processed_papers,
                        "total": data.get("total", len(processed_papers))
                    }
                    
            except Exception as e:
                logger.error(f"Error processing papers: {str(e)}")
                if attempt < 2:
                    await asyncio.sleep(2 ** attempt)
        return None

    async def _execute_academic_search(self, params: Dict[str, Any]) -> str:
        """Execute academic search using Semantic Scholar"""
        try:
            query = params.get("query", "")
            logger.info(f"Starting academic search with query: {query}")
            
            if result := await self._try_fetch_papers(query):
                logger.info(f"Successfully found {len(result['papers'])} papers")
                return json.dumps({
                    "success": True,
                    "results": result["papers"],
                    "total_found": result["total"]
                })
            
            logger.warning("No academic search results found")
            return json.dumps({
                "success": False,
                "error": "Failed to retrieve academic search results",
                "results": []
            })
            
        except Exception as e:
            logger.error(f"Error in academic search: {str(e)}")
            return json.dumps({
                "success": False,
                "error": str(e),
                "results": []
            })

    async def _fetch_expert_papers(self, search_query: str) -> Optional[Dict[str, Any]]:
        """Fetch papers for expert analysis"""
        api_params = {
            "query": search_query,
            "fields": "title,authors,year,citationCount,url,abstract,venue,fieldsOfStudy",
            "offset": 0,
            "limit": 12
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.semanticscholar.org/graph/v1/paper/search",
                params=api_params,
                timeout=30.0
            )
            return response.json() if response.status_code == 200 else None

    def _process_expert_papers(self, papers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process papers and extract expert information"""
        author_stats = defaultdict(lambda: {
            "name": "",
            "papers": [],
            "total_citations": 0,
            "expertise_areas": set()
        })
        
        for paper in papers:
            for author in paper.get("authors", []):
                author_id = author.get("authorId")
                if not author_id:
                    continue
                    
                stats = author_stats[author_id]
                stats["name"] = author.get("name", "")
                stats["papers"].append({
                    "title": paper.get("title", ""),
                    "year": paper.get("year"),
                    "citations": paper.get("citationCount", 0),
                    "venue": paper.get("venue", ""),
                    "url": paper.get("url", "")
                })
                stats["total_citations"] += paper.get("citationCount", 0)
                if paper.get("fieldsOfStudy"):
                    stats["expertise_areas"].update(paper["fieldsOfStudy"])
        
        return self._convert_stats_to_experts(author_stats)

    def _convert_stats_to_experts(self, author_stats: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Convert author statistics to sorted expert list"""
        experts = []
        for stats in author_stats.values():
            if not stats["papers"]:
                continue
                
            experts.append({
                "name": stats["name"],
                "total_citations": stats["total_citations"],
                "paper_count": len(stats["papers"]),
                "expertise_areas": list(stats["expertise_areas"]),
                "recent_papers": sorted(
                    stats["papers"],
                    key=lambda x: (x.get("year", 0), x.get("citations", 0)),
                    reverse=True
                )[:3]
            })
        
        return sorted(experts, key=lambda x: x["total_citations"], reverse=True)[:5]

    async def _execute_expert_search(self, params: Dict[str, Any]) -> str:
        """Execute expert search using Semantic Scholar"""
        try:
            search_query = f"{params.get('query', '')} {params.get('expertise_area', '')}".strip()
            logger.info(f"Starting expert search with query: {search_query}")
            
            for attempt in range(3):
                try:
                    if data := await self._fetch_expert_papers(search_query):
                        if "data" not in data:
                            continue
                            
                        experts = self._process_expert_papers(data["data"])
                        if experts:
                            return json.dumps({
                                "success": True,
                                "results": experts,
                                "total_found": len(experts)
                            })
                            
                except Exception as e:
                    if attempt < 2:
                        await asyncio.sleep(2 ** attempt)
                    continue
            
            return json.dumps({
                "success": False,
                "error": "Failed to retrieve expert search results",
                "results": []
            })
            
        except Exception as e:
            logger.error(f"Error in expert search: {str(e)}")
            return json.dumps({
                "success": False,
                "error": str(e),
                "results": []
            })