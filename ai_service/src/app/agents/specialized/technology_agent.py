from typing import Dict, Any, List
from .base_specialized_agent import BaseSpecializedAgent
import re
import logging

logger = logging.getLogger(__name__)

class TechnologyIntelligenceAgent(BaseSpecializedAgent):
    """Specialized agent for technology intelligence and patent research"""
    
    # Section constants
    PATENT_ANALYSIS = "Patent Analysis"
    
    def _get_domain_expertise(self) -> Dict[str, Any]:
        return {
            "type": "technology_intelligence",
            "capabilities": [
                self.PATENT_ANALYSIS,
                "Technology Trend Tracking",
                "Innovation Mapping",
                "Competitive Technology Assessment",
                "Technical Due Diligence"
            ],
            "focus_areas": [
                "Emerging Technologies",
                "Patent Landscapes",
                "Technical Standards",
                "R&D Directions",
                "Technology Transfer",
                "Industry Applications"
            ]
        }
    
    def _get_specialized_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "patent_search",
                "type": "api_call",
                "description": "Search patent databases for technical innovations",
                "parameters": {
                    "query": "string",
                    "date_range": "string",
                    "jurisdiction": "string",
                    "max_results": 5,
                    "sort_by": "relevance"
                }
            },
            {
                "name": "tech_news_search",
                "type": "api_call",
                "description": "Search technology news and announcements",
                "parameters": {
                    "query": "string",
                    "timeframe": "string",
                    "max_results": 5,
                    "categories": ["tech", "innovation"]
                }
            }
        ]
    
    def _get_response_format(self) -> Dict[str, Any]:
        return {
            "sections": [
                "Technology Overview",
                "Key Innovations",
                self.PATENT_ANALYSIS,
                "Market Applications",
                "Technical Assessment",
                "Competitive Landscape",
                "Future Developments"
            ],
            "required_elements": [
                "patent_references",
                "technical_specifications",
                "market_relevance",
                "innovation_timeline",
                "competitive_analysis"
            ]
        }
    
    def _get_specialized_prompt(self, prompt: str) -> str:
        return f"""As a Technology Intelligence Agent, analyze the technical landscape with the following focus:

1. {self.PATENT_ANALYSIS}:
   - Identify key patents and innovations
   - Analyze technical claims and scope
   - Evaluate technological significance

2. Technology Assessment:
   - Evaluate technical feasibility
   - Assess implementation challenges
   - Identify technical dependencies

3. Market Impact:
   - Analyze commercial applications
   - Identify target industries
   - Assess market readiness

4. Innovation Landscape:
   - Map technology evolution
   - Track development trends
   - Identify emerging solutions

5. Competitive Analysis:
   - Identify key technology players
   - Analyze technical advantages
   - Compare solution approaches

Technology Query: {prompt}

Please provide a structured technology analysis following these guidelines:

1. Begin with a "Technology Overview" section
2. List "Key Innovations" with technical details
3. Include "Patent Analysis" with reference numbers
4. Describe "Market Applications" and use cases
5. Provide "Technical Assessment" of feasibility
6. Map the "Competitive Landscape"
7. Project "Future Developments"

Format patent references as [Patent No. XXXXXXXX] and include a numbered reference list at the end."""
    
    def _validate_response_format(self, result: str) -> bool:
        try:
            # Check for required sections
            required_sections = [
                "Technology Overview",
                "Key Innovations",
                self.PATENT_ANALYSIS,
                "Market Applications",
                "Technical Assessment",
                "Competitive Landscape",
                "Future Developments"
            ]
            
            for section in required_sections:
                if section not in result:
                    logger.warning(f"Missing required section: {section}")
                    return False
            
            # Check for patent references [Patent No. XXXXXXXX]
            patent_pattern = r'\[Patent No\. [A-Z0-9]+\]'
            patents = re.findall(patent_pattern, result)
            if not patents:
                logger.warning("No patent references found in the response")
                return False
            
            # Check for numbered reference list
            if not re.search(r'\d+\.\s*\[Patent No\.[^\]]*\]', result):
                logger.warning("No numbered reference list found")
                return False
            
            # Check for technical specifications
            if not re.search(r'Technical Assessment[^:|-]*[:|-]', result, re.DOTALL):
                logger.warning("No technical specifications found")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating response format: {str(e)}")
            return False 