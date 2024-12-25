from typing import Dict, Any, List
from .base_specialized_agent import BaseSpecializedAgent
import re
import logging

logger = logging.getLogger(__name__)

class AcademicResearchAgent(BaseSpecializedAgent):
    """Specialized agent for academic research and literature review"""
    
    def _get_domain_expertise(self) -> Dict[str, Any]:
        return {
            "type": "academic",
            "capabilities": [
                "Literature Review",
                "Citation Analysis",
                "Research Trend Analysis",
                "Author Expertise Tracking",
                "Conference/Journal Analysis"
            ],
            "fields": [
                "Computer Science",
                "Engineering",
                "Physics",
                "Biology",
                "Chemistry",
                "Mathematics",
                "Social Sciences",
                "Medicine"
            ]
        }
    
    def _get_specialized_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "academic_search",
                "type": "api_call",
                "description": "Search academic papers and research publications",
                "parameters": {
                    "query": "string",
                    "year_range": "string",
                    "max_results": 5,
                    "sort_by": "citations"
                }
            },
            {
                "name": "expert_search",
                "type": "api_call",
                "description": "Find domain experts and their publications",
                "parameters": {
                    "query": "string",
                    "expertise_area": "string",
                    "max_results": 3
                }
            }
        ]
    
    def _get_response_format(self) -> Dict[str, Any]:
        return {
            "sections": [
                "Research Summary",
                "Key Findings",
                "Methodology Overview",
                "Literature Analysis",
                "Expert Insights",
                "Research Gaps",
                "Future Directions"
            ],
            "required_elements": [
                "citations",
                "publication_dates",
                "author_credentials",
                "methodology_assessment",
                "research_implications"
            ]
        }
    
    def _get_specialized_prompt(self, prompt: str) -> str:
        return f"""As an Academic Research Agent, conduct a comprehensive academic analysis with the following focus:

1. Literature Review:
   - Identify and analyze key academic papers
   - Evaluate research methodologies
   - Assess the strength of findings

2. Citation Analysis:
   - Track citation patterns
   - Identify seminal works
   - Evaluate research impact

3. Expert Assessment:
   - Identify leading researchers
   - Analyze their contributions
   - Evaluate methodological approaches

4. Research Trends:
   - Identify emerging research directions
   - Analyze methodological trends
   - Highlight research gaps

5. Critical Analysis:
   - Evaluate research quality
   - Identify potential biases
   - Assess reproducibility

Research Query: {prompt}

Please provide a structured academic analysis following these guidelines:

1. Start with a "Research Summary" section
2. Include a "Key Findings" section with bullet points
3. Provide a "Methodology Overview" of analyzed papers
4. Include a "Literature Analysis" with critical evaluation
5. Add "Expert Insights" based on researcher profiles
6. Identify "Research Gaps" and limitations
7. Suggest "Future Directions" for research

Format citations as [Author, Year] and include a numbered reference list at the end."""
    
    def _validate_response_format(self, result: str) -> bool:
        try:
            # Check for required sections
            required_sections = [
                "Research Summary",
                "Key Findings",
                "Methodology Overview",
                "Literature Analysis",
                "Expert Insights",
                "Research Gaps",
                "Future Directions"
            ]
            
            for section in required_sections:
                if section not in result:
                    logger.warning(f"Missing required section: {section}")
                    return False
            
            # Check for citations [Author, Year]
            citation_pattern = r'\[[A-Za-z\s]+,\s*\d{4}\]'
            citations = re.findall(citation_pattern, result)
            if not citations:
                logger.warning("No citations found in the response")
                return False
            
            # Check for numbered reference list
            if not re.search(r'\d+\.\s*\[[^\]]*\]', result):
                logger.warning("No numbered reference list found")
                return False
            
            # Check for bullet points in Key Findings
            if not re.search(r'Key Findings.*?[-•]\s', result, re.DOTALL):
                logger.warning("No bullet points found in Key Findings section")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating response format: {str(e)}")
            return False