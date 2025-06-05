"""Academic search tool using Semantic Scholar API for research papers."""

import asyncio
from typing import Any, Dict, List, Optional

import aiohttp
import structlog

from app.tools.base_tool import SearchTool

logger = structlog.get_logger(__name__)


class AcademicSearchTool(SearchTool):
    """Academic search tool using Semantic Scholar API."""
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize the academic search tool."""
        super().__init__(
            name="academic_search",
            description="Search academic papers and publications using Semantic Scholar",
            max_results_default=5
        )
        self._supported_agent_types = ["research", "analysis", "all"]
        self._api_key = api_key
        self._base_url = "https://api.semanticscholar.org/graph/v1"
        self._timeout = 15
        
        # Comprehensive field selection for rich paper metadata
        self._paper_fields = [
            "title", "abstract", "url", "year", "citationCount", "authors", 
            "venue", "publicationTypes", "openAccessPdf", "externalIds",
            "fieldsOfStudy", "influentialCitationCount", "publicationDate"
        ]
    
    async def _search_internal(self, query: str, max_results: int, parameters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Execute academic search with multiple strategies."""
        
        # Clean and prepare query
        cleaned_query = self._clean_query(query)
        
        # Extract search parameters
        year_filter = parameters.get("year_filter")
        min_citations = parameters.get("min_citations", 0)
        publication_types = parameters.get("publication_types", [])
        fields_of_study = parameters.get("fields_of_study", [])
        
        logger.info("Starting academic search", 
            original_query=query,
            cleaned_query=cleaned_query,
            max_results=max_results,
            year_filter=year_filter,
            min_citations=min_citations
        )
        
        # Strategy 1: Full query search
        try:
            results = await self._execute_paper_search(
                cleaned_query, max_results, year_filter, min_citations, 
                publication_types, fields_of_study
            )
            if results:
                logger.info("Full query search successful", results_count=len(results))
                return results
        except Exception as e:
            logger.warning("Full query search failed", error=str(e))
        
        # Strategy 2: Keyword-based search
        try:
            keywords = self._extract_keywords(cleaned_query)
            if keywords:
                keyword_query = " ".join(keywords[:4])  # Use top 4 keywords
                results = await self._execute_paper_search(
                    keyword_query, max_results, year_filter, min_citations,
                    publication_types, fields_of_study
                )
                if results:
                    logger.info("Keyword search successful", 
                        keyword_query=keyword_query,
                        results_count=len(results)
                    )
                    return results
        except Exception as e:
            logger.warning("Keyword search failed", error=str(e))
        
        # Strategy 3: Relaxed search (remove filters)
        try:
            results = await self._execute_paper_search(
                cleaned_query, max_results, None, 0, [], []
            )
            if results:
                logger.info("Relaxed search successful", results_count=len(results))
                return results
        except Exception as e:
            logger.warning("Relaxed search failed", error=str(e))
        
        # All strategies failed
        raise Exception("All academic search strategies failed")
    
    async def _execute_paper_search(
        self, 
        query: str, 
        max_results: int,
        year_filter: Optional[str] = None,
        min_citations: int = 0,
        publication_types: List[str] = None,
        fields_of_study: List[str] = None
    ) -> List[Dict[str, Any]]:
        """Execute Semantic Scholar paper search."""
        
        # Prepare search parameters
        params = {
            "query": query,
            "limit": min(max_results, 100),  # API limit
            "fields": ",".join(self._paper_fields)
        }
        
        # Add filters if specified
        if year_filter:
            params["year"] = year_filter
        if publication_types:
            params["publicationTypes"] = ",".join(publication_types)
        if fields_of_study:
            params["fieldsOfStudy"] = ",".join(fields_of_study)
        
        # Prepare headers
        headers = {
            "User-Agent": "SecondBrain-Research-Agent/1.0"
        }
        if self._api_key:
            headers["x-api-key"] = self._api_key
        
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=self._timeout)) as session:
            try:
                async with session.get(
                    f"{self._base_url}/paper/search",
                    params=params,
                    headers=headers
                ) as response:
                    
                    if response.status == 429:
                        # Rate limited, wait and retry once
                        logger.warning("Rate limited, waiting before retry")
                        await asyncio.sleep(2)
                        async with session.get(
                            f"{self._base_url}/paper/search",
                            params=params,
                            headers=headers
                        ) as retry_response:
                            if retry_response.status != 200:
                                raise Exception(f"HTTP {retry_response.status}")
                            result = await retry_response.json()
                    elif response.status != 200:
                        raise Exception(f"HTTP {response.status}")
                    else:
                        result = await response.json()
                    
                    # Extract papers from response
                    papers = result.get("data", [])
                    
                    # Apply post-processing filters
                    if min_citations > 0:
                        papers = [p for p in papers if p.get("citationCount", 0) >= min_citations]
                    
                    return papers
                    
            except Exception as e:
                logger.error("Semantic Scholar API request failed", 
                    query=query,
                    error=str(e),
                    url=f"{self._base_url}/paper/search"
                )
                raise
    
    def _format_single_result(self, raw_result: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Format a single Semantic Scholar paper to standardized structure."""
        try:
            # Extract basic information
            title = raw_result.get("title", "").strip()
            paper_id = raw_result.get("paperId", "")
            
            # Build URL
            url = f"https://www.semanticscholar.org/paper/{paper_id}" if paper_id else ""
            if raw_result.get("url"):
                url = raw_result["url"]
            
            # Extract abstract
            abstract = raw_result.get("abstract", "").strip()
            snippet = abstract[:300] + "..." if len(abstract) > 300 else abstract
            
            # Extract authors
            authors = []
            for author in raw_result.get("authors", []):
                if isinstance(author, dict) and author.get("name"):
                    authors.append(author["name"])
                elif isinstance(author, str):
                    authors.append(author)
            
            # Extract publication info
            year = raw_result.get("year")
            venue = raw_result.get("venue", "")
            publication_date = raw_result.get("publicationDate", "")
            
            # Extract metrics
            citation_count = raw_result.get("citationCount", 0)
            influential_citations = raw_result.get("influentialCitationCount", 0)
            
            # Extract additional metadata
            fields_of_study = raw_result.get("fieldsOfStudy", [])
            publication_types = raw_result.get("publicationTypes", [])
            external_ids = raw_result.get("externalIds", {})
            open_access_pdf = raw_result.get("openAccessPdf")
            
            # Basic validation
            if not title:
                return None
            
            formatted_result = {
                "title": title,
                "url": url,
                "snippet": snippet,
                "source": "Semantic Scholar",
                "search_type": "academic",
                "relevance_score": self._calculate_academic_relevance_score(raw_result),
                "metadata": {
                    "paper_id": paper_id,
                    "authors": authors,
                    "year": year,
                    "venue": venue,
                    "publication_date": publication_date,
                    "citation_count": citation_count,
                    "influential_citations": influential_citations,
                    "fields_of_study": fields_of_study,
                    "publication_types": publication_types,
                    "external_ids": external_ids,
                    "open_access_pdf": open_access_pdf,
                    "has_pdf": bool(open_access_pdf),
                    "result_type": "academic_paper"
                }
            }
            
            return formatted_result
            
        except Exception as e:
            logger.warning("Failed to format academic result", 
                error=str(e),
                raw_result=str(raw_result)[:200]
            )
            return None
    
    def _calculate_academic_relevance_score(self, paper: Dict[str, Any]) -> float:
        """Calculate relevance score for academic papers."""
        score = 0.0
        
        # Citation count (normalized)
        citation_count = paper.get("citationCount", 0)
        if citation_count > 0:
            # Logarithmic scaling for citations
            import math
            score += min(math.log10(citation_count + 1) * 0.2, 0.4)
        
        # Influential citations
        influential_citations = paper.get("influentialCitationCount", 0)
        if influential_citations > 0:
            score += min(influential_citations * 0.05, 0.2)
        
        # Recent papers get slight bonus
        year = paper.get("year")
        if year and year >= 2020:
            score += 0.1
        elif year and year >= 2015:
            score += 0.05
        
        # Open access bonus
        if paper.get("openAccessPdf"):
            score += 0.1
        
        # Abstract availability
        if paper.get("abstract"):
            score += 0.1
        
        # Venue quality (simplified)
        venue = paper.get("venue", "").lower()
        high_quality_venues = ["nature", "science", "cell", "pnas", "nejm"]
        if any(hq in venue for hq in high_quality_venues):
            score += 0.2
        
        return min(score, 1.0)
    
    def validate_parameters(self, parameters: Dict[str, Any]) -> bool:
        """Validate academic search specific parameters."""
        if not super().validate_parameters(parameters):
            return False
        
        # Validate year filter
        if "year_filter" in parameters:
            year_filter = parameters["year_filter"]
            if year_filter and not isinstance(year_filter, str):
                return False
        
        # Validate citation count
        if "min_citations" in parameters:
            min_citations = parameters["min_citations"]
            if not isinstance(min_citations, int) or min_citations < 0:
                return False
        
        # Validate publication types
        if "publication_types" in parameters:
            pub_types = parameters["publication_types"]
            if not isinstance(pub_types, list):
                return False
            valid_types = ["JournalArticle", "ConferencePaper", "Review", "Book", "BookSection"]
            for pt in pub_types:
                if pt not in valid_types:
                    return False
        
        return True
    
    def _get_parameter_schema(self) -> Dict[str, Any]:
        """Get the parameter schema for academic search."""
        schema = super()._get_parameter_schema()
        
        # Add academic-specific parameters
        schema["properties"].update({
            "year_filter": {
                "type": "string",
                "description": "Year range filter (e.g., '2020-2024', '2020', '2020-')",
                "pattern": r"^\d{4}(-\d{4}?)?$"
            },
            "min_citations": {
                "type": "integer",
                "description": "Minimum citation count",
                "minimum": 0,
                "default": 0
            },
            "publication_types": {
                "type": "array",
                "description": "Filter by publication types",
                "items": {
                    "type": "string",
                    "enum": ["JournalArticle", "ConferencePaper", "Review", "Book", "BookSection"]
                }
            },
            "fields_of_study": {
                "type": "array",
                "description": "Filter by fields of study",
                "items": {
                    "type": "string"
                }
            }
        })
        
        return schema
    
    async def get_paper_details(self, paper_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific paper."""
        if not paper_id:
            return None
        
        headers = {"User-Agent": "SecondBrain-Research-Agent/1.0"}
        if self._api_key:
            headers["x-api-key"] = self._api_key
        
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=self._timeout)) as session:
            try:
                async with session.get(
                    f"{self._base_url}/paper/{paper_id}",
                    params={"fields": ",".join(self._paper_fields + ["references", "citations"])},
                    headers=headers
                ) as response:
                    
                    if response.status == 200:
                        return await response.json()
                    else:
                        logger.warning("Failed to get paper details", 
                            paper_id=paper_id,
                            status=response.status
                        )
                        return None
                        
            except Exception as e:
                logger.error("Error getting paper details", 
                    paper_id=paper_id,
                    error=str(e)
                )
                return None