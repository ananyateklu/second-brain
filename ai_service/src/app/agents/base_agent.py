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
    
    async def _execute_tool(self, tool: Dict[str, Any]) -> Any:
        """Execute a single tool"""
        tool_type = tool.get("type")
        tool_name = tool.get("name", "unknown")
        
        if not tool_type:
            raise ToolExecutionError("Tool type not specified")
            
        try:
            if tool_type == "api_call":
                return await self._execute_api_call(tool)
            elif tool_type == "database_query":
                return await self._execute_database_query(tool)
            else:
                raise ToolExecutionError(f"Unsupported tool type: {tool_type}")
        except Exception as e:
            logger.error(f"Tool execution failed: {str(e)}", exc_info=True)
            raise ToolExecutionError(f"Tool execution failed: {str(e)}")
    
    async def _execute_api_call(self, tool: Dict[str, Any]) -> Any:
        """Execute an API call tool"""
        tool_name = tool.get("name", "unknown")
        parameters = tool.get("parameters", {})
        
        # Configure the API endpoint based on tool name
        if tool_name == "web_search":
            return await self._execute_web_search(parameters)
        elif tool_name == "academic_search":
            return await self._execute_academic_search(
                parameters.get("query", ""),
                parameters.get("max_results", 3),
                parameters.get("year_range", "")
            )
        elif tool_name == "expert_search":
            return await self._execute_expert_search(
                parameters.get("query", ""),
                parameters.get("expertise_area", ""),
                parameters.get("max_results", 3),
                parameters.get("include_metrics", True)
            )
        elif tool_name == "news_search":
            return await self._execute_news_search(parameters)
        elif tool_name == "patent_search":
            return await self._execute_patent_search(parameters)
        else:
            raise ToolExecutionError(f"Unsupported API call tool: {tool_name}")
    
    async def _execute_web_search(self, parameters: Dict[str, Any]) -> str:
        """Execute web search using DuckDuckGo"""
        try:
            from duckduckgo_search import DDGS
            query = parameters.get("query", "")
            max_results = parameters.get("max_results", 5)
            time_range = parameters.get("time_range", "")
            region = parameters.get("region", "wt-wt")
            safe_search = parameters.get("safe_search", True)
            
            results = []
            with DDGS() as ddgs:
                search_params = {
                    "keywords": query,
                    "max_results": max_results,
                    "region": region,
                    "safesearch": safe_search
                }
                if time_range:
                    time_mapping = {
                        "day": "d",
                        "week": "w",
                        "month": "m",
                        "year": "y"
                    }
                    if time_range in time_mapping:
                        search_params["timelimit"] = time_mapping[time_range]
                
                for r in ddgs.text(**search_params):
                    results.append({
                        "title": r.get("title"),
                        "link": r.get("link"),
                        "snippet": r.get("body"),
                        "source": r.get("source"),
                        "published": r.get("published")
                    })
            return json.dumps(results)
        except Exception as e:
            logger.error(f"Web search failed: {str(e)}")
            raise ToolExecutionError(f"Web search failed: {str(e)}")
    
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
    
    async def _execute_academic_search(self, query: str, max_results: int = 3, year_range: str = "") -> str:
        """Execute academic search using Google Scholar with Semantic Scholar fallback"""
        try:
            # Try Google Scholar first
            try:
                # Configure scholarly with proxy settings if available
                if hasattr(settings, 'PROXY_URL') and settings.PROXY_URL:
                    try:
                        scholarly.use_proxy(settings.PROXY_URL)
                        scholarly.scholarly._HEADERS = {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                            'Accept-Language': 'en-US,en;q=0.5',
                            'Accept-Encoding': 'gzip, deflate',
                            'Connection': 'keep-alive',
                            'Upgrade-Insecure-Requests': '1'
                        }
                    except Exception as e:
                        logger.error(f"Failed to configure proxy: {str(e)}")
                
                await asyncio.sleep(2)
                
                search_query = scholarly.search_pubs(query)
                results = []
                seen_titles = set()
                
                while len(results) < max_results:
                    try:
                        pub = next(search_query)
                        title = pub.get("bib", {}).get("title")
                        
                        if title in seen_titles:
                            continue
                        seen_titles.add(title)
                        
                        if year_range:
                            year = pub.get("bib", {}).get("pub_year")
                            if year and not self._is_in_year_range(year, year_range):
                                continue
                        
                        results.append({
                            "title": title,
                            "authors": pub.get("bib", {}).get("author", []),
                            "year": pub.get("bib", {}).get("pub_year"),
                            "url": pub.get("pub_url"),
                            "citations": pub.get("num_citations", 0),
                            "source": "Google Scholar"
                        })
                        
                        await asyncio.sleep(1)
                        
                    except StopIteration:
                        break
                    except Exception as e:
                        logger.warning(f"Error processing Google Scholar publication: {str(e)}")
                        continue
                
                if results:
                    return json.dumps(results)
                
                logger.warning("No results found from Google Scholar, falling back to Semantic Scholar")
                raise Exception("No results from Google Scholar")
                
            except Exception as e:
                logger.warning(f"Google Scholar search failed: {str(e)}, falling back to Semantic Scholar")
                # Fall back to Semantic Scholar
                from semanticscholar import SemanticScholar
                
                sch = SemanticScholar()
                semantic_results = []
                
                # Single request with the desired number of results
                try:
                    response = sch.search_paper(
                        query,
                        limit=max_results,
                        fields=['title', 'authors', 'year', 'citationCount', 'url', 'abstract']
                    )
                    
                    # Check if we got any results
                    if not response or not isinstance(response, list):
                        logger.warning("No results found from Semantic Scholar")
                        return json.dumps([])
                    
                    # Process each paper
                    for paper in response:
                        # Skip if paper doesn't have required attributes
                        if not hasattr(paper, 'title') or not paper.title:
                            continue
                            
                        # Apply year filter if specified
                        if year_range and hasattr(paper, 'year') and paper.year:
                            if not self._is_in_year_range(str(paper.year), year_range):
                                continue
                        
                        semantic_results.append({
                            "title": paper.title if hasattr(paper, 'title') else None,
                            "authors": [author.name for author in (paper.authors or []) if hasattr(author, 'name')],
                            "year": paper.year if hasattr(paper, 'year') else None,
                            "url": paper.url if hasattr(paper, 'url') else None,
                            "citations": paper.citationCount if hasattr(paper, 'citationCount') else 0,
                            "abstract": paper.abstract if hasattr(paper, 'abstract') else None,
                            "source": "Semantic Scholar"
                        })
                        
                        # Break if we have enough results
                        if len(semantic_results) >= max_results:
                            break
                    
                    return json.dumps(semantic_results[:max_results])
                    
                except Exception as e:
                    logger.error(f"Semantic Scholar search failed: {str(e)}")
                    return json.dumps([])
                
        except Exception as e:
            logger.error(f"Both Google Scholar and Semantic Scholar searches failed: {str(e)}")
            return json.dumps([])
    
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
    
    async def _execute_expert_search(self, query: str, expertise_area: str = "", 
                                   max_results: int = 3, include_metrics: bool = True) -> str:
        """Execute expert search using Google Scholar"""
        try:
            # Extract relevant keywords and experts
            query_lower = query.lower()
            found_experts = []
            keywords = []
            
            # Check each domain for relevant experts
            for domain, config in self.KNOWN_EXPERTS.items():
                domain_keywords = config["keywords"]
                if any(kw.lower() in query_lower for kw in domain_keywords):
                    found_experts.extend(config["experts"])
                    keywords.extend(domain_keywords)
            
            # If no experts found through domain matching, use expertise area
            if not found_experts and expertise_area:
                expertise_config = self.KNOWN_EXPERTS.get(expertise_area.lower(), {})
                found_experts.extend(expertise_config.get("experts", []))
                keywords.extend(expertise_config.get("keywords", []))
            
            results = []
            # Search for specific experts if found
            if found_experts:
                for expert_name in found_experts[:max_results]:
                    try:
                        # Configure proxy if available
                        if hasattr(settings, 'PROXY_URL') and settings.PROXY_URL:
                            scholarly.use_proxy(settings.PROXY_URL)
                        
                        author_search = scholarly.search_author(expert_name)
                        author = next(author_search)
                        
                        if include_metrics:
                            author = scholarly.fill(author, sections=['basics', 'indices'])
                        
                        expert_info = {
                            "name": author.get("name", ""),
                            "affiliation": author.get("affiliation", ""),
                            "interests": author.get("interests", []),
                            "metrics": {}
                        }
                        
                        if include_metrics:
                            expert_info["metrics"] = {
                                "h_index": author.get("hindex", 0),
                                "citations": author.get("citedby", 0),
                                "i10_index": author.get("i10index", 0)
                            }
                        
                        results.append(expert_info)
                        await asyncio.sleep(1)  # Rate limiting
                    except Exception as e:
                        logger.warning(f"Error fetching expert {expert_name}: {str(e)}")
                        continue
            
            # If we still need more results, do a keyword search
            if len(results) < max_results:
                try:
                    search_query = " ".join(keywords[:3]) if keywords else query
                    if expertise_area:
                        search_query = f"{expertise_area} {search_query}"
                    
                    author_search = scholarly.search_author(search_query)
                    while len(results) < max_results:
                        try:
                            author = next(author_search)
                            if include_metrics:
                                author = scholarly.fill(author, sections=['basics', 'indices'])
                            
                            expert_info = {
                                "name": author.get("name", ""),
                                "affiliation": author.get("affiliation", ""),
                                "interests": author.get("interests", []),
                                "metrics": {}
                            }
                            
                            if include_metrics:
                                expert_info["metrics"] = {
                                    "h_index": author.get("hindex", 0),
                                    "citations": author.get("citedby", 0),
                                    "i10_index": author.get("i10index", 0)
                                }
                            
                            results.append(expert_info)
                            await asyncio.sleep(1)  # Rate limiting
                        except StopIteration:
                            break
                        except Exception as e:
                            logger.warning(f"Error processing author: {str(e)}")
                            continue
                except Exception as e:
                    logger.warning(f"Keyword search failed: {str(e)}")
            
            return json.dumps(results)
        except Exception as e:
            logger.error(f"Expert search failed: {str(e)}")
            return json.dumps([])