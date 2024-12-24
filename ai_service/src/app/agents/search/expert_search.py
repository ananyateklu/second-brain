from typing import Dict, Any, List, Optional
import logging
import aiohttp
from ..core.agent_exceptions import ExpertSearchError
from ..utils.query_utils import clean_search_query, extract_keywords
from ..utils.response_utils import create_search_response, create_error_response
from ..utils.logging_utils import log_search_result, log_api_call

logger = logging.getLogger(__name__)

class ExpertSearch:
    """Expert search implementation using academic and professional sources"""
    
    SEMANTIC_SCHOLAR_API = "https://api.semanticscholar.org/graph/v1"
    GOOGLE_SCHOLAR_URL = "https://scholar.google.com/citations"
    
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
        min_citations: int = 1000,
        min_papers: int = 10,
        start_year: Optional[int] = None,
        fields: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Execute expert search with fallback strategies"""
        try:
            # Clean and prepare query
            query = clean_search_query(query)
            logger.info(
                f"Starting expert search with query: '{query}', "
                f"max_results: {max_results}, min_citations: {min_citations}"
            )
            
            await self._ensure_session()
            
            # Try exact query first
            results = await self._execute_expert_search(
                query, max_results, min_citations, min_papers, start_year, fields
            )
            if results:
                return results
                
            # Try with extracted keywords
            logger.info("Exact query yielded no results, trying with keywords")
            keywords = extract_keywords(query)
            if keywords:
                keyword_query = " ".join(keywords)
                results = await self._execute_expert_search(
                    keyword_query, max_results, min_citations, min_papers,
                    start_year, fields
                )
                if results:
                    return results
                    
            return create_error_response("No experts found")
            
        except Exception as e:
            error_msg = f"Expert search failed: {str(e)}"
            logger.error(error_msg)
            return create_error_response(error_msg)
            
    async def _execute_expert_search(
        self,
        query: str,
        max_results: int,
        min_citations: int,
        min_papers: int,
        start_year: Optional[int],
        fields: Optional[List[str]]
    ) -> Optional[Dict[str, Any]]:
        """Execute search using academic APIs"""
        try:
            # Search for highly cited papers in the field
            params = {
                "query": query,
                "limit": max_results * 2,  # Get more papers to find experts
                "fields": ",".join(fields or [
                    "title",
                    "authors",
                    "year",
                    "citationCount",
                    "venue",
                    "url"
                ])
            }
            
            if start_year:
                params["year"] = f"{start_year}-"
                
            # Get papers from Semantic Scholar
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
                
                # Extract authors from highly cited papers
                experts = self._extract_experts_from_papers(
                    papers, min_citations, min_papers
                )
                
                if experts:
                    log_search_result("expert_search", query, len(experts), 0.0)
                    return create_search_response(
                        success=True,
                        results=experts[:max_results],
                        query=query,
                        max_results=max_results
                    )
                    
                return None
                
        except Exception as e:
            logger.warning(f"Expert search failed: {str(e)}")
            return None
            
    def _extract_experts_from_papers(
        self,
        papers: List[Dict[str, Any]],
        min_citations: int,
        min_papers: int
    ) -> List[Dict[str, Any]]:
        """Extract and rank experts from paper data"""
        try:
            # Track author statistics
            author_stats = {}
            
            # Process each paper
            for paper in papers:
                if paper.get("citationCount", 0) >= min_citations:
                    for author in paper.get("authors", []):
                        author_id = author.get("authorId")
                        if not author_id:
                            continue
                            
                        if author_id not in author_stats:
                            author_stats[author_id] = {
                                "name": author.get("name", "Unknown"),
                                "papers": [],
                                "total_citations": 0,
                                "venues": set(),
                                "years": set()
                            }
                            
                        stats = author_stats[author_id]
                        stats["papers"].append(paper)
                        stats["total_citations"] += paper.get("citationCount", 0)
                        if venue := paper.get("venue"):
                            stats["venues"].add(venue)
                        if year := paper.get("year"):
                            stats["years"].add(year)
                            
            # Filter and format expert data
            experts = []
            for author_id, stats in author_stats.items():
                if len(stats["papers"]) >= min_papers:
                    expert = self._format_expert_data(author_id, stats)
                    experts.append(expert)
                    
            # Sort by total citations
            experts.sort(key=lambda x: x["total_citations"], reverse=True)
            return experts
            
        except Exception as e:
            logger.warning(f"Failed to extract experts: {str(e)}")
            return []
            
    def _format_expert_data(
        self,
        author_id: str,
        stats: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Format expert data for response"""
        years = sorted(stats["years"])
        expert = {
            "name": stats["name"],
            "author_id": author_id,
            "total_citations": stats["total_citations"],
            "paper_count": len(stats["papers"]),
            "h_index": self._calculate_h_index(stats["papers"]),
            "top_venues": list(stats["venues"])[:5],
            "active_years": f"{years[0]}-{years[-1]}" if years else "Unknown",
            "scholar_url": f"{self.GOOGLE_SCHOLAR_URL}?user={author_id}",
            "semantic_scholar_url": f"{self.SEMANTIC_SCHOLAR_API}/author/{author_id}"
        }
        
        # Add top papers
        top_papers = sorted(
            stats["papers"],
            key=lambda p: p.get("citationCount", 0),
            reverse=True
        )[:3]
        
        expert["top_papers"] = [
            {
                "title": paper.get("title", "Unknown"),
                "citations": paper.get("citationCount", 0),
                "year": paper.get("year", "Unknown"),
                "url": paper.get("url", "")
            }
            for paper in top_papers
        ]
        
        return expert
        
    def _calculate_h_index(self, papers: List[Dict[str, Any]]) -> int:
        """Calculate h-index from paper citations"""
        citations = sorted(
            [p.get("citationCount", 0) for p in papers],
            reverse=True
        )
        
        h_index = 0
        for i, citations_count in enumerate(citations, 1):
            if citations_count >= i:
                h_index = i
            else:
                break
                
        return h_index 