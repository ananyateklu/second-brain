from typing import Dict, Any, List, Optional, Union
import logging
import re
from datetime import datetime
from ..core.agent_exceptions import CitationError
from ..utils.logging_utils import log_api_call

logger = logging.getLogger(__name__)

class CitationHandler:
    """Citation and reference handling"""
    
    CITATION_STYLES = {
        "apa": {
            "article": "{authors} ({year}). {title}. {journal}, {volume}({issue}), {pages}.",
            "book": "{authors} ({year}). {title}. {publisher}.",
            "webpage": "{authors} ({year}). {title}. Retrieved from {url}",
            "patent": "{inventors} ({year}). {title}. {country} Patent {number}.",
            "default": "{authors} ({year}). {title}."
        },
        "mla": {
            "article": "{authors}. \"{title}.\" {journal}, vol. {volume}, no. {issue}, {year}, pp. {pages}.",
            "book": "{authors}. {title}. {publisher}, {year}.",
            "webpage": "{authors}. \"{title}.\" {website}, {year}, {url}.",
            "patent": "{inventors}. {title}. {country} Patent {number}, {year}.",
            "default": "{authors}. \"{title}.\" {year}."
        },
        "chicago": {
            "article": "{authors}. \"{title}.\" {journal} {volume}, no. {issue} ({year}): {pages}.",
            "book": "{authors}. {title}. {publisher}, {year}.",
            "webpage": "{authors}. \"{title}.\" {website}. Last modified {date}. {url}.",
            "patent": "{inventors}. {title}. {country} Patent {number}, filed {filing_date}, issued {issue_date}.",
            "default": "{authors}. \"{title}.\" {year}."
        }
    }
    
    @log_api_call
    def format_citation(
        self,
        source: Dict[str, Any],
        style: str = "apa",
        source_type: Optional[str] = None
    ) -> str:
        """Format citation according to style"""
        try:
            if style not in self.CITATION_STYLES:
                raise CitationError(f"Unsupported citation style: {style}")
                
            # Determine source type
            if not source_type:
                source_type = self._determine_source_type(source)
                
            # Get citation template
            templates = self.CITATION_STYLES[style]
            template = templates.get(source_type, templates["default"])
            
            # Format authors/inventors
            if "authors" in source:
                source["authors"] = self._format_authors(
                    source["authors"],
                    style
                )
            if "inventors" in source:
                source["inventors"] = self._format_authors(
                    source["inventors"],
                    style
                )
                
            # Format dates
            if "year" not in source and "date" in source:
                source["year"] = self._extract_year(source["date"])
                
            # Format citation
            try:
                return template.format(**source)
            except KeyError as e:
                logger.warning(
                    f"Missing field in citation: {e}, using default template"
                )
                return templates["default"].format(**source)
                
        except Exception as e:
            error_msg = f"Citation formatting failed: {str(e)}"
            logger.error(error_msg)
            raise CitationError(error_msg)
            
    def format_bibliography(
        self,
        sources: List[Dict[str, Any]],
        style: str = "apa",
        sort_by: str = "author"
    ) -> List[str]:
        """Format bibliography entries"""
        try:
            # Format all citations
            entries = []
            for source in sources:
                citation = self.format_citation(source, style)
                entries.append({
                    "citation": citation,
                    "sort_key": self._get_sort_key(source, sort_by)
                })
                
            # Sort entries
            entries.sort(key=lambda x: x["sort_key"])
            
            return [entry["citation"] for entry in entries]
            
        except Exception as e:
            error_msg = f"Bibliography formatting failed: {str(e)}"
            logger.error(error_msg)
            raise CitationError(error_msg)
            
    def extract_citations(
        self,
        text: str,
        pattern: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Extract citations from text"""
        try:
            citations = []
            
            # Use default or custom pattern
            if not pattern:
                # Match common citation formats
                pattern = r'\(([^)]+)\)'  # Parenthetical citations
                
            matches = re.finditer(pattern, text)
            
            for match in matches:
                citation = match.group(1)
                parsed = self._parse_citation(citation)
                if parsed:
                    citations.append(parsed)
                    
            return citations
            
        except Exception as e:
            error_msg = f"Citation extraction failed: {str(e)}"
            logger.error(error_msg)
            raise CitationError(error_msg)
            
    def validate_citations(
        self,
        citations: List[Dict[str, Any]],
        required_fields: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Validate citation data"""
        try:
            if not required_fields:
                required_fields = ["title", "year"]
                
            valid_citations = []
            for citation in citations:
                # Check required fields
                missing_fields = [
                    field for field in required_fields
                    if field not in citation or not citation[field]
                ]
                
                if missing_fields:
                    logger.warning(
                        f"Citation missing required fields: {missing_fields}"
                    )
                    continue
                    
                # Validate year format
                if "year" in citation:
                    try:
                        year = int(str(citation["year"]))
                        if not (1000 <= year <= datetime.now().year):
                            logger.warning(f"Invalid year in citation: {year}")
                            continue
                    except ValueError:
                        logger.warning(
                            f"Invalid year format in citation: {citation['year']}"
                        )
                        continue
                        
                valid_citations.append(citation)
                
            return valid_citations
            
        except Exception as e:
            error_msg = f"Citation validation failed: {str(e)}"
            logger.error(error_msg)
            raise CitationError(error_msg)
            
    def _determine_source_type(self, source: Dict[str, Any]) -> str:
        """Determine source type from metadata"""
        if "journal" in source:
            return "article"
        elif "publisher" in source:
            return "book"
        elif "url" in source:
            return "webpage"
        elif "patent_number" in source or "filing_date" in source:
            return "patent"
        return "default"
        
    def _format_authors(
        self,
        authors: Union[str, List[str]],
        style: str
    ) -> str:
        """Format author names according to style"""
        if isinstance(authors, str):
            authors = [authors]
            
        if not authors:
            return "Unknown"
            
        if len(authors) == 1:
            return authors[0]
            
        if style == "apa":
            if len(authors) == 2:
                return f"{authors[0]} & {authors[1]}"
            return f"{authors[0]} et al."
            
        elif style == "mla":
            if len(authors) == 2:
                return f"{authors[0]}, and {authors[1]}"
            return f"{authors[0]}, et al."
            
        elif style == "chicago":
            if len(authors) == 2:
                return f"{authors[0]} and {authors[1]}"
            return f"{authors[0]} et al."
            
        return ", ".join(authors)
        
    def _extract_year(self, date_str: str) -> Optional[str]:
        """Extract year from date string"""
        try:
            # Try common date formats
            for fmt in ["%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y", "%d/%m/%Y"]:
                try:
                    return datetime.strptime(date_str, fmt).year
                except ValueError:
                    continue
                    
            # Try extracting 4-digit year
            match = re.search(r'\b\d{4}\b', date_str)
            if match:
                return match.group(0)
                
        except Exception as e:
            logger.warning(f"Failed to extract year from date: {str(e)}")
            
        return None
        
    def _parse_citation(self, citation: str) -> Optional[Dict[str, Any]]:
        """Parse citation text into structured data"""
        try:
            # Try to parse author-year format
            match = re.match(r'([^,]+),\s*(\d{4})', citation)
            if match:
                return {
                    "authors": [match.group(1).strip()],
                    "year": match.group(2)
                }
                
            # Try to parse numeric reference
            if citation.isdigit():
                return {"reference_number": int(citation)}
                
            return None
            
        except Exception as e:
            logger.warning(f"Failed to parse citation: {str(e)}")
            return None
            
    def _get_sort_key(
        self,
        source: Dict[str, Any],
        sort_by: str
    ) -> str:
        """Get sort key for bibliography entry"""
        if sort_by == "author":
            authors = source.get("authors", [""])
            return authors[0].lower() if isinstance(authors, list) else authors.lower()
            
        elif sort_by == "year":
            return str(source.get("year", "9999"))
            
        elif sort_by == "title":
            return source.get("title", "").lower()
            
        return "" 