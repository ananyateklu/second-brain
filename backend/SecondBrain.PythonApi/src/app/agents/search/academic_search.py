from typing import Dict, Any, List, Optional
import logging
import aiohttp
from ..core.agent_exceptions import AcademicSearchError
from ..utils.query_utils import clean_search_query, extract_keywords
from ..utils.response_utils import create_search_response, create_error_response
from ..utils.logging_utils import log_search_result, log_api_call

logger = logging.getLogger(__name__)

class AcademicSearch:
    """Academic search implementation using Semantic Scholar API"""
    
    SEMANTIC_SCHOLAR_API = "https://api.semanticscholar.org/graph/v1"
    
    def __init__(self):
        self.session = None
        
    async def _ensure_session(self):
        """Ensure aiohttp session exists"""
        if not self.session:
            self.session = aiohttp.ClientSession()
            
    async def close(self):
        """Close the aiohttp session"""
        if self.session:
            await self.session.close()
            self.session = None
            
    @log_api_call
    async def search(
        self,
        query: str,
        max_results: int = 5,
        min_citations: int = 0,
        start_year: Optional[int] = None,
        end_year: Optional[int] = None,
        fields: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Execute academic search with fallback strategies"""
        try:
            # Clean and prepare query
            query = clean_search_query(query)
            logger.info(
                f"Starting academic search with query: '{query}', "
                f"max_results: {max_results}, min_citations: {min_citations}"
            )
            
            await self._ensure_session()
            
            # Try exact query first
            results = await self._execute_paper_search(
                query, max_results, min_citations, start_year, end_year, fields
            )
            if results:
                return results
                
            # Try with extracted keywords
            logger.info("Exact query yielded no results, trying with keywords")
            keywords = extract_keywords(query)
            if keywords:
                keyword_query = " ".join(keywords)
                results = await self._execute_paper_search(
                    keyword_query, max_results, min_citations, start_year, end_year, fields
                )
                if results:
                    return results
                    
            return create_error_response("No academic papers found")
            
        except Exception as e:
            error_msg = f"Academic search failed: {str(e)}"
            logger.error(error_msg)
            return create_error_response(error_msg)
            
    async def _execute_paper_search(
        self,
        query: str,
        max_results: int,
        min_citations: int,
        start_year: Optional[int],
        end_year: Optional[int],
        fields: Optional[List[str]]
    ) -> Optional[Dict[str, Any]]:
        """Execute search using Semantic Scholar API"""
        try:
            # Build search parameters
            params = {
                "query": query,
                "limit": max_results,
                "fields": ",".join(fields or [
                    "title",
                    "abstract",
                    "url",
                    "year",
                    "citationCount",
                    "authors",
                    "venue",
                    "publicationTypes",
                    "openAccessPdf"
                ])
            }
            
            if start_year:
                params["year"] = f"{start_year}-{end_year or ''}"
                
            # Execute API call
            async with self.session.get(
                f"{self.SEMANTIC_SCHOLAR_API}/paper/search",
                params=params
            ) as response:
                if response.status != 200:
                    logger.warning(
                        f"Semantic Scholar API returned status {response.status}"
                    )
                    return None
                    
                data = await response.json()
                papers = data.get("data", [])
                
                # Filter by citations if needed
                if min_citations > 0:
                    papers = [
                        p for p in papers
                        if p.get("citationCount", 0) >= min_citations
                    ]
                    
                if papers:
                    processed_results = self._process_papers(papers)
                    log_search_result(
                        "semantic_scholar", query, len(processed_results), 0.0
                    )
                    return create_search_response(
                        success=True,
                        results=processed_results,
                        query=query,
                        max_results=max_results
                    )
                    
                return None
                
        except Exception as e:
            logger.warning(f"Paper search failed: {str(e)}")
            return None
            
    def _process_papers(
        self,
        papers: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Process paper results into a standard format"""
        processed_results = []
        for paper in papers:
            if processed := self._process_single_paper(paper):
                processed_results.append(processed)
        return processed_results
        
    def _process_single_paper(
        self,
        paper: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Process a single paper result"""
        try:
            # Extract required fields
            title = paper.get("title", "").strip()
            url = paper.get("url", "")
            
            # Skip papers with missing essential fields
            if not all([title, url]):
                return None
                
            processed = {
                "title": title,
                "url": url,
                "abstract": paper.get("abstract", "No abstract available").strip(),
                "year": paper.get("year"),
                "citation_count": paper.get("citationCount", 0),
                "venue": paper.get("venue", "Unknown venue"),
                "type": paper.get("publicationTypes", ["paper"])[0]
            }
            
            # Add authors if available
            if authors := paper.get("authors", []):
                processed["authors"] = [
                    author.get("name", "Unknown Author")
                    for author in authors
                ]
                
            # Add PDF link if available
            if pdf := paper.get("openAccessPdf"):
                processed["pdf_url"] = pdf.get("url")
                
            return processed
            
        except Exception as e:
            logger.warning(f"Failed to process paper: {str(e)}")
            return None 