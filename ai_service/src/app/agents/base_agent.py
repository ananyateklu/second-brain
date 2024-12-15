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

logger = logging.getLogger(__name__)

class ToolExecutionError(Exception):
    """Raised when a tool execution fails"""
    pass

class BaseAgent(ABC):
    """Base class for all AI agents"""
    
    def __init__(self, model_id: str, temperature: float = 0.7):
        self.model_id = model_id
        self.temperature = temperature
        self.execution_history = []
        
    @abstractmethod
    async def execute(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Execute the agent's task"""
        pass
    
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
            try:
                from duckduckgo_search import DDGS
                query = parameters.get("query", "") or tool.get("description", "")
                max_results = parameters.get("max_results", 5)
                time_range = parameters.get("time_range", "")
                region = parameters.get("region", "wt-wt")  # Default to worldwide
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
                        # Convert time range to DuckDuckGo format
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
                logger.error(f"DuckDuckGo search failed: {str(e)}")
                raise ToolExecutionError(f"Web search failed: {str(e)}")
                        
        elif tool_name == "academic_search":
            try:
                from scholarly import scholarly
                query = parameters.get("query", "") or tool.get("description", "")
                max_results = parameters.get("max_results", 3)
                year_range = parameters.get("year_range", "")
                sort_by = parameters.get("sort_by", "relevance")
                pub_type = parameters.get("publication_type", "")
                fields = parameters.get("fields", [])
                
                search_query = scholarly.search_pubs(query)
                results = []
                for i in range(max_results):
                    try:
                        pub = next(search_query)
                        # Filter by year if specified
                        if year_range:
                            year = pub.get("bib", {}).get("pub_year")
                            if year and not self._is_in_year_range(year, year_range):
                                continue
                                
                        # Filter by publication type if specified
                        if pub_type and pub.get("bib", {}).get("venue", "").lower() != pub_type.lower():
                            continue
                            
                        results.append({
                            "title": pub.get("bib", {}).get("title"),
                            "authors": pub.get("bib", {}).get("author", []),
                            "year": pub.get("bib", {}).get("pub_year"),
                            "abstract": pub.get("bib", {}).get("abstract"),
                            "url": pub.get("pub_url"),
                            "venue": pub.get("bib", {}).get("venue"),
                            "citations": pub.get("num_citations", 0)
                        })
                    except StopIteration:
                        break
                        
                # Sort results if needed
                if sort_by == "citations":
                    results.sort(key=lambda x: x["citations"], reverse=True)
                elif sort_by == "date":
                    results.sort(key=lambda x: x["year"], reverse=True)
                    
                return json.dumps(results)
            except Exception as e:
                logger.error(f"Academic search failed: {str(e)}")
                raise ToolExecutionError(f"Academic search failed: {str(e)}")
                
        elif tool_name == "expert_search":
            try:
                from scholarly import scholarly
                query = parameters.get("query", "") or tool.get("description", "")
                expertise_area = parameters.get("expertise_area", "")
                max_results = parameters.get("max_results", 3)
                include_metrics = parameters.get("include_metrics", True)
                
                # Extract relevant keywords for expert search
                keywords = []
                query_lower = query.lower()
                
                # Add battery technology experts
                known_authors = {
                    "jennifer doudna": ["Jennifer Doudna", "CRISPR", "gene editing"],
                    "feng zhang": ["Feng Zhang", "CRISPR", "gene editing"],
                    "emmanuelle charpentier": ["Emmanuelle Charpentier", "CRISPR"],
                    "david liu": ["David Liu", "base editing", "CRISPR"],
                    "virginijus siksnys": ["Virginijus Siksnys", "CRISPR"],
                    "george church": ["George Church", "synthetic biology", "CRISPR"],
                    "yet-ming chiang": ["Yet-Ming Chiang", "battery technology", "solid state batteries"],
                    "donald sadoway": ["Donald Sadoway", "battery technology", "liquid metal batteries"],
                    "john goodenough": ["John Goodenough", "battery technology", "solid state electrolytes"],
                    "stanley whittingham": ["Stanley Whittingham", "battery technology", "lithium batteries"]
                }
                
                # Domain-specific keywords
                domain_keywords = {
                    "crispr": ["CRISPR", "gene editing", "genomics"],
                    "quantum": ["quantum computing", "quantum information"],
                    "agi": ["artificial general intelligence", "machine learning"],
                    "battery": ["battery technology", "energy storage", "solid state batteries", "electrolytes"],
                    "solid_state_battery": ["solid state batteries", "solid electrolytes", "battery manufacturing", "energy density"]
                }

                # Extract author names from query
                found_authors = []
                results = []  # Initialize results list at the top level
                
                # First try to find specific authors
                for author_key, author_keywords in known_authors.items():
                    if author_key in query_lower:
                        found_authors.extend(author_keywords[:1])  # Add only the author name
                        keywords.extend(author_keywords[1:])  # Add their associated keywords

                # If no specific authors found, use domain-specific keywords
                if not found_authors:
                    # Check for battery-related queries first
                    if any(term in query_lower for term in ["battery", "batteries", "solid state", "energy storage", "electrolyte"]):
                        keywords.extend(domain_keywords["battery"])
                        keywords.extend(domain_keywords["solid_state_battery"])
                        # Add top battery technology experts
                        found_authors.extend(["Yet-Ming Chiang", "Donald Sadoway", "John Goodenough"])
                
                # If no specific authors found, use domain-specific keywords
                if not found_authors:
                    domain_keywords = {
                        "crispr": ["CRISPR", "gene editing", "genomics"],
                        "quantum": ["quantum computing", "quantum information"],
                        "agi": ["artificial general intelligence", "machine learning"],
                        "battery": ["battery technology", "energy storage"],
                    }
                    
                    for domain, domain_kw in domain_keywords.items():
                        if domain in query_lower or any(kw.lower() in query_lower for kw in domain_kw):
                            keywords.extend(domain_kw)
                            break
                
                if not keywords and not found_authors:
                    # Extract meaningful keywords (skip common words and question words)
                    stop_words = {"what", "who", "where", "when", "how", "why", "are", "is", "the", "in", "and", "or", "their", "recent", "find", "search", "look"}
                    keywords = [w for w in query_lower.split() 
                              if len(w) > 3 
                              and w not in stop_words 
                              and not any(c in w for c in '?.,!')]
                
                # Combine authors and keywords
                if found_authors:
                    # If we found specific authors, search for them directly
                    for author in found_authors:
                        try:
                            logger.debug(f"Searching for author: {author}")
                            author_search = scholarly.search_author(author)
                            author_result = next(author_search)
                            if include_metrics:
                                # Only fetch essential fields to reduce API calls
                                author_result = scholarly.fill(author_result, sections=['basics', 'indices'])
                            
                            expert_info = {
                                "name": author_result.get("name", ""),
                                "affiliation": author_result.get("affiliation", ""),
                                "interests": author_result.get("interests", []),
                                "metrics": {}
                            }
                            
                            if include_metrics and "citedby" in author_result:
                                expert_info["metrics"] = {
                                    "h_index": author_result.get("hindex", 0),
                                    "total_citations": author_result.get("citedby", 0),
                                    "i10_index": author_result.get("i10index", 0)
                                }
                                
                            results.append(expert_info)
                            logger.debug(f"Successfully added author: {expert_info['name']}")
                        except StopIteration:
                            logger.warning(f"Author not found: {author}")
                        except Exception as e:
                            logger.error(f"Error searching for author {author}: {str(e)}")
                else:
                    # If no authors found or author search failed, do regular keyword search
                    search_query = " ".join(keywords[:3])  # Limit to top 3 keywords
                    if expertise_area:
                        search_query = f"{expertise_area} {search_query}"
                    
                    logger.debug(f"Expert search query: {search_query}")
                    search_results = scholarly.search_author(search_query)
                    
                    for i in range(max_results):
                        try:
                            author = next(search_results)
                            if include_metrics:
                                # Fetch detailed author info including metrics
                                author = scholarly.fill(author)
                                
                            expert_info = {
                                "name": author.get("name", ""),
                                "affiliation": author.get("affiliation", ""),
                                "interests": author.get("interests", []),
                                "email_domain": author.get("email_domain", ""),
                                "homepage": author.get("homepage", ""),
                                "metrics": {}
                            }
                            
                            if include_metrics and "citedby" in author:
                                expert_info["metrics"] = {
                                    "h_index": author.get("hindex", 0),
                                    "total_citations": author.get("citedby", 0),
                                    "i10_index": author.get("i10index", 0)
                                }
                                
                            results.append(expert_info)
                        except StopIteration:
                            break
                
                return json.dumps(results)
            except Exception as e:
                logger.error(f"Expert search failed: {str(e)}")
                raise ToolExecutionError(f"Expert search failed: {str(e)}")
                
        elif tool_name == "patent_search":
            try:
                query = parameters.get("query", "") or tool.get("description", "")
                max_results = parameters.get("max_results", 3)
                patent_type = parameters.get("patent_type", "utility")
                jurisdiction = parameters.get("jurisdiction", "US")
                status = parameters.get("status", "all")
                
                # Convert jurisdiction to Google Patents format
                jurisdiction_map = {
                    "US": "US",
                    "EP": "EP",
                    "WO": "WO",
                    "CN": "CN",
                    "JP": "JP",
                    "KR": "KR"
                }
                jurisdiction_code = jurisdiction_map.get(jurisdiction.upper(), "US")
                
                # Build search query
                search_query = f"{query} country:{jurisdiction_code}"
                if patent_type != "all":
                    search_query += f" type:{patent_type}"
                if status != "all":
                    search_query += f" status:{status}"
                
                # Encode query for URL
                encoded_query = quote(search_query)
                base_url = "https://patents.google.com/api/search"
                
                # Make request to Google Patents API
                headers = {
                    "User-Agent": "Mozilla/5.0 (compatible; ResearchAgent/1.0)",
                    "Accept": "application/json",
                    "Referer": "https://patents.google.com/"
                }
                
                params = {
                    "q": encoded_query,
                    "page": "1",
                    "num": str(max_results),
                    "format": "json",
                    "sort": "new"
                }
                
                try:
                    response = requests.get(base_url, headers=headers, params=params, timeout=10)
                    response.raise_for_status()  # Raise an error for bad status codes
                    
                    if response.status_code == 200:
                        try:
                            data = response.json()
                            results = []
                            
                            # Process search results
                            patents = data.get("results", [])[:max_results]
                            for patent in patents:
                                patent_info = {
                                    "title": patent.get("title", ""),
                                    "inventors": patent.get("inventors", []),
                                    "assignee": patent.get("assignee", ""),
                                    "filing_date": patent.get("filing_date", ""),
                                    "publication_date": patent.get("publication_date", ""),
                                    "abstract": patent.get("abstract", ""),
                                    "patent_number": patent.get("patent_number", ""),
                                    "jurisdiction": jurisdiction_code,
                                    "url": f"https://patents.google.com/patent/{patent.get('patent_number', '')}"
                                }
                                results.append(patent_info)
                            
                            return json.dumps({
                                "status": "success",
                                "results": results,
                                "query": search_query
                            })
                            
                        except json.JSONDecodeError as e:
                            logger.error(f"Failed to parse patent search response: {str(e)}")
                            # Try to get HTML response for debugging
                            logger.debug(f"Response content: {response.text[:500]}")
                            return json.dumps({
                                "status": "error",
                                "message": "Failed to parse patent search response",
                                "results": []
                            })
                    else:
                        logger.warning(f"Patent search request failed with status code: {response.status_code}")
                        return json.dumps({
                            "status": "error",
                            "message": f"Patent search failed with status code: {response.status_code}",
                            "results": []
                        })
                        
                except requests.RequestException as e:
                    logger.error(f"Patent search request failed: {str(e)}")
                    return json.dumps({
                        "status": "error",
                        "message": f"Patent search request failed: {str(e)}",
                        "results": []
                    })
                    
            except Exception as e:
                logger.error(f"Patent search failed: {str(e)}")
                return json.dumps({
                    "status": "error",
                    "message": f"Patent search failed: {str(e)}",
                    "results": []
                })
                
        elif tool_name == "news_search":
            try:
                from newsapi import NewsApiClient
                from app.config.settings import settings
                
                if not settings.NEWS_API_KEY:
                    raise ToolExecutionError("NewsAPI key not configured")
                
                # Initialize NewsAPI client
                newsapi = NewsApiClient(api_key=settings.NEWS_API_KEY)
                
                # Clean and encode the query
                query = parameters.get("query", "") or tool.get("description", "")
                # Remove quotes and special characters that might cause issues
                query = query.replace('"', '').replace('?', '').strip()
                
                # Determine appropriate category based on query content
                query_lower = query.lower()
                category = None
                
                # More comprehensive category mapping
                category_keywords = {
                    "business": ["business", "market", "company", "investment", "startup", "finance", "economy", "stock", "venture"],
                    "technology": ["tech", "technology", "software", "hardware", "ai", "computing", "digital", "cyber", "robot", "crispr", "gene editing", "battery", "batteries", "energy"],
                    "science": ["science", "research", "study", "discovery", "scientific", "laboratory", "experiment", "physics", "chemistry", "biology", "genetics", "materials"],
                    "health": ["health", "medical", "medicine", "treatment", "therapy", "clinical", "disease", "patient", "doctor", "hospital"],
                    "general": ["news", "update", "development", "breakthrough", "announcement"]
                }

                # Initialize sources
                sources = parameters.get("sources", [])

                # Battery technology specific sources
                BATTERY_TECH_SOURCES = [
                    "techcrunch", "wired", "bloomberg", "reuters", "the-verge",
                    "ars-technica", "ieee-spectrum", "scientific-american",
                    "nature", "science-daily", "mit-technology-review"
                ]

                # Add relevant sources for battery technology queries
                if any(term in query_lower for term in ["battery", "batteries", "solid state", "energy storage", "electrolyte"]):
                    sources = BATTERY_TECH_SOURCES  # Always set sources for battery tech queries
                    category = "technology"  # Override category for battery tech
                
                # Prepare query parameters
                VALID_LANGUAGES = ["ar", "de", "en", "es", "fr", "he", "it", "nl", "no", "pt", "ru", "se", "zh"]
                language = parameters.get("language", "en")
                if language not in VALID_LANGUAGES:
                    language = "en"  # Default to English if invalid
                
                params = {
                    "q": query,
                    "language": language,
                    "sort_by": parameters.get("sort_by", "relevancy"),
                    "page_size": parameters.get("max_results", 3)
                }
                
                # Validate and add sources
                if sources:
                    try:
                        # Get available sources first
                        available_sources = newsapi.get_sources()
                        if not available_sources or "sources" not in available_sources:
                            logger.warning("Failed to fetch available sources from NewsAPI")
                            # Fall back to everything search without sources
                            params["sources"] = None
                        else:
                            valid_source_ids = [source['id'] for source in available_sources['sources']]
                            # Filter to only valid sources
                            valid_sources = [s for s in sources if s in valid_source_ids]
                            if valid_sources:
                                params["sources"] = ",".join(valid_sources)
                                logger.info(f"Using valid sources: {valid_sources}")
                            else:
                                logger.info("No valid sources found in provided list, using default sources")
                                # Fall back to default technology sources for battery queries
                                if any(term in query_lower for term in ["battery", "batteries", "solid state", "energy storage", "electrolyte"]):
                                    params["category"] = "technology"
                    except Exception as e:
                        logger.warning(f"Error validating sources: {str(e)}")
                        # Fall back to everything search without sources
                        params["sources"] = None
                
                # Find the category with the most keyword matches
                category_matches = {cat: sum(1 for kw in keywords if kw in query_lower) 
                                 for cat, keywords in category_keywords.items()}
                
                # Get the category with the most matches
                if "crispr" in query_lower or "gene" in query_lower:
                    category = "technology"
                elif any(category_matches.values()):
                    category = max(category_matches.items(), key=lambda x: x[1])[0]
                else:
                    category = "general"
                
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
                
                # Use top-headlines for technology and science categories
                if category in ["technology", "science"]:
                    try:
                        top_headlines_params = {
                            "q": query,
                            "category": category,
                            "language": params["language"],  # Use language from params
                            "page_size": params["page_size"]  # Use page_size from params
                        }
                        all_articles = newsapi.get_top_headlines(**top_headlines_params)
                    except Exception as e:
                        logger.warning(f"Top headlines search failed, falling back to everything: {str(e)}")
                        all_articles = newsapi.get_everything(**params)
                else:
                    all_articles = newsapi.get_everything(**params)
                
                # Process and filter results
                articles = all_articles.get("articles", [])
                processed_articles = []
                
                for article in articles:
                    processed_article = {
                        "title": article.get("title", ""),
                        "description": article.get("description", ""),
                        "url": article.get("url", ""),
                        "source": article.get("source", {}).get("name", ""),
                        "published_at": article.get("publishedAt", "")
                    }
                    processed_articles.append(processed_article)
                
                return json.dumps(processed_articles)
            except Exception as e:
                logger.error(f"News search failed: {str(e)}")
                raise ToolExecutionError(f"News search failed: {str(e)}")
        
        else:
            raise ToolExecutionError(f"Unsupported API call tool: {tool_name}")
            
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
    
    async def _execute_database_query(self, tool: Dict[str, Any]) -> Any:
        """Execute a database query tool"""
        # Implement database query logic here
        raise NotImplementedError("Database query not implemented yet")
    
    async def validate_response(self, response: Any) -> bool:
        """Validate the agent's response"""
        if not response or not isinstance(response, dict):
            return False
            
        required_fields = ["result", "metadata"]
        if not all(field in response for field in required_fields):
            return False
            
        # Validate metadata structure
        metadata = response.get("metadata", {})
        if not isinstance(metadata, dict):
            return False
            
        # Validate result is a non-empty string
        result = response.get("result")
        if not isinstance(result, str) or not result.strip():
            return False
            
        return True
    
    def get_execution_history(self) -> List[Dict[str, Any]]:
        """Get the agent's execution history"""
        return self.execution_history

    # Cache for author profiles to avoid duplicate lookups
    _author_cache = {}
    
    async def _fetch_author_profile(self, author_name: str, include_metrics: bool = True) -> Optional[Dict]:
        """Helper method to fetch and cache author profiles"""
        if author_name in self._author_cache:
            logger.debug(f"Using cached profile for {author_name}")
            return self._author_cache[author_name]
            
        try:
            logger.debug(f"Fetching profile for {author_name}")
            author_search = scholarly.search_author(author_name)
            author_result = next(author_search)
            
            # Only fetch full profile for specific authors we care about
            if author_name.lower() in ["jennifer doudna", "feng zhang", "emmanuelle charpentier"]:
                if include_metrics:
                    author_result = scholarly.fill(author_result, sections=['basics', 'indices'])
            
            expert_info = {
                "name": author_result.get("name", ""),
                "affiliation": author_result.get("affiliation", ""),
                "interests": author_result.get("interests", []),
                "metrics": {
                    "h_index": author_result.get("hindex", 0),
                    "total_citations": author_result.get("citedby", 0),
                    "i10_index": author_result.get("i10index", 0)
                } if include_metrics and "citedby" in author_result else {}
            }
            
            self._author_cache[author_name] = expert_info
            return expert_info
        except Exception as e:
            logger.warning(f"Failed to fetch author profile for {author_name}: {str(e)}")
            return None

    async def _execute_expert_search(self, query: str, found_authors: List[str], include_metrics: bool = True) -> List[Dict]:
        """Helper method to execute expert search with caching"""
        results = []
        
        # Process found authors in parallel
        tasks = [self._fetch_author_profile(author, include_metrics) for author in found_authors]
        author_profiles = await asyncio.gather(*tasks, return_exceptions=True)
        
        for profile in author_profiles:
            if isinstance(profile, dict):
                results.append(profile)
        
        return results

    # Optimize academic search
    async def _execute_academic_search(self, query: str, max_results: int = 3, year_range: str = "") -> List[Dict]:
        """Helper method to execute academic search with optimizations"""
        try:
            search_query = scholarly.search_pubs(query)
            results = []
            seen_titles = set()  # To avoid duplicates
            
            while len(results) < max_results:
                try:
                    pub = next(search_query)
                    title = pub.get("bib", {}).get("title")
                    
                    # Skip duplicates
                    if title in seen_titles:
                        continue
                    seen_titles.add(title)
                    
                    # Filter by year if specified
                    if year_range:
                        year = pub.get("bib", {}).get("pub_year")
                        if year and not self._is_in_year_range(year, year_range):
                            continue
                    
                    results.append({
                        "title": title,
                        "authors": pub.get("bib", {}).get("author", []),
                        "year": pub.get("bib", {}).get("pub_year"),
                        "abstract": pub.get("bib", {}).get("abstract"),
                        "url": pub.get("pub_url"),
                        "citations": pub.get("num_citations", 0)
                    })
                except StopIteration:
                    break
            
            return results
        except Exception as e:
            logger.error(f"Academic search failed: {str(e)}")
            return []