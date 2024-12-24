from typing import Dict, Any, List, Optional
import logging
import aiohttp
from bs4 import BeautifulSoup
from urllib.parse import quote_plus
from ..core.agent_exceptions import PatentSearchError
from ..utils.query_utils import clean_search_query, extract_keywords
from ..utils.response_utils import create_search_response, create_error_response
from ..utils.logging_utils import log_search_result, log_api_call

logger = logging.getLogger(__name__)

class PatentSearch:
    """Patent search implementation using Google Patents"""
    
    GOOGLE_PATENTS_URL = "https://patents.google.com"
    
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
        start_year: Optional[int] = None,
        end_year: Optional[int] = None,
        patent_office: Optional[str] = None,
        status: Optional[str] = None
    ) -> Dict[str, Any]:
        """Execute patent search with fallback strategies"""
        try:
            # Clean and prepare query
            query = clean_search_query(query)
            logger.info(
                f"Starting patent search with query: '{query}', "
                f"max_results: {max_results}"
            )
            
            await self._ensure_session()
            
            # Try exact query first
            results = await self._execute_patent_search(
                query, max_results, start_year, end_year, patent_office, status
            )
            if results:
                return results
                
            # Try with extracted keywords
            logger.info("Exact query yielded no results, trying with keywords")
            keywords = extract_keywords(query)
            if keywords:
                keyword_query = " ".join(keywords)
                results = await self._execute_patent_search(
                    keyword_query, max_results, start_year, end_year,
                    patent_office, status
                )
                if results:
                    return results
                    
            return create_error_response("No patents found")
            
        except Exception as e:
            error_msg = f"Patent search failed: {str(e)}"
            logger.error(error_msg)
            return create_error_response(error_msg)
            
    async def _execute_patent_search(
        self,
        query: str,
        max_results: int,
        start_year: Optional[int],
        end_year: Optional[int],
        patent_office: Optional[str],
        status: Optional[str]
    ) -> Optional[Dict[str, Any]]:
        """Execute search using Google Patents"""
        try:
            # Build search URL with parameters
            search_params = [quote_plus(query)]
            
            if start_year and end_year:
                search_params.append(f"after={start_year-1}")
                search_params.append(f"before={end_year+1}")
                
            if patent_office:
                search_params.append(f"assignee={patent_office}")
                
            if status:
                search_params.append(f"status={status}")
                
            url = f"{self.GOOGLE_PATENTS_URL}/search?" + "&".join(search_params)
            
            # Execute search request
            async with self.session.get(url) as response:
                if response.status != 200:
                    logger.warning(
                        f"Google Patents returned status {response.status}"
                    )
                    return None
                    
                html = await response.text()
                soup = BeautifulSoup(html, 'html.parser')
                
                # Extract patent results
                patents = []
                for result in soup.select('.patent-result')[:max_results]:
                    if patent := self._extract_patent_data(result):
                        patents.append(patent)
                        
                if patents:
                    log_search_result("google_patents", query, len(patents), 0.0)
                    return create_search_response(
                        success=True,
                        results=patents,
                        query=query,
                        max_results=max_results
                    )
                    
                return None
                
        except Exception as e:
            logger.warning(f"Patent search failed: {str(e)}")
            return None
            
    def _extract_patent_data(self, result: BeautifulSoup) -> Optional[Dict[str, Any]]:
        """Extract patent data from HTML result"""
        try:
            # Extract title and link
            title_elem = result.select_one('.patent-title')
            if not title_elem or not title_elem.get('href'):
                return None
                
            title = title_elem.get_text().strip()
            link = self.GOOGLE_PATENTS_URL + title_elem['href']
            
            # Build patent data
            patent = {
                "title": title,
                "url": link,
                "patent_number": self._extract_text(result, '.patent-number'),
                "assignee": self._extract_text(result, '.patent-assignee'),
                "inventors": self._extract_text(result, '.patent-inventors'),
                "filing_date": self._extract_text(result, '.patent-filing-date'),
                "publication_date": self._extract_text(result, '.patent-publication-date'),
                "abstract": self._extract_text(result, '.patent-abstract'),
                "status": self._extract_text(result, '.patent-status')
            }
            
            # Add classification if available
            if classification := self._extract_text(result, '.patent-classification'):
                patent["classification"] = classification
                
            return patent
            
        except Exception as e:
            logger.warning(f"Failed to extract patent data: {str(e)}")
            return None
            
    def _extract_text(self, soup: BeautifulSoup, selector: str) -> str:
        """Extract text from element with fallback to empty string"""
        if elem := soup.select_one(selector):
            return elem.get_text().strip()
        return "" 