from typing import Dict, Any, Optional, List
from .base_agent import BaseAgent
from .agent_factory import AgentFactory
from app.config.settings import settings
import time
import logging

logger = logging.getLogger(__name__)

class ResearchAgent(BaseAgent):
    """Agent for conducting research and analysis using various AI models"""
    
    # Base research tools (always available)
    BASE_RESEARCH_TOOLS = [
        {
            "name": "web_search",
            "type": "api_call",
            "description": "Search the web for recent information and developments",
            "parameters": {
                "query": "string",
                "max_results": 5,
                "time_range": "string",  # e.g., "day", "week", "month", "year"
                "region": "string",      # e.g., "us", "uk", "global"
                "safe_search": "boolean" # Enable/disable safe search
            }
        },
        {
            "name": "academic_search",
            "type": "api_call",
            "description": "Search academic papers and research publications",
            "parameters": {
                "query": "string",
                "year_range": "string",
                "max_results": 3,
                "sort_by": "string",     # e.g., "relevance", "date", "citations"
                "publication_type": "string", # e.g., "journal", "conference", "thesis"
                "fields": "array"        # Specific fields to search in
            }
        },
        {
            "name": "expert_search",
            "type": "api_call",
            "description": "Find domain experts and their publications",
            "parameters": {
                "query": "string",
                "expertise_area": "string",
                "max_results": 3,
                "include_metrics": "boolean"  # Include h-index, citations, etc.
            }
        },
        {
            "name": "patent_search",
            "type": "api_call",
            "description": "Search patent databases for relevant innovations",
            "parameters": {
                "query": "string",
                "max_results": 3,
                "patent_type": "string",  # e.g., "utility", "design", "plant"
                "jurisdiction": "string", # e.g., "US", "EP", "WO"
                "status": "string"       # e.g., "granted", "pending", "all"
            }
        }
    ]
    
    # Optional news search tool (requires API key)
    NEWS_SEARCH_TOOL = {
        "name": "news_search",
        "type": "api_call",
        "description": "Search recent news articles and press releases",
        "parameters": {
            "query": "string",
            "date_range": "string",
            "max_results": 3,
            "categories": "array",    # e.g., ["technology", "business", "science"]
            "sources": "array",       # Specific news sources to include
            "language": "string",     # e.g., "en", "es", "fr"
            "sort_by": "string"       # e.g., "relevancy", "popularity", "publishedAt"
        }
    }
    
    def __init__(self, model_id: str, temperature: float = 0.7):
        super().__init__(model_id, temperature)
        self.agent = AgentFactory.create_agent(model_id, temperature)
        logger.info(f"Initialized ResearchAgent with model {model_id} and temperature {temperature}")
        
        # Initialize available tools
        self.available_tools = list(self.BASE_RESEARCH_TOOLS)
        if settings.NEWS_API_KEY:
            self.available_tools.append(self.NEWS_SEARCH_TOOL)
            logger.info("News search tool is available")
        else:
            logger.info("News search tool is disabled - NewsAPI key not configured")
    
    def _get_base_agent_type(self) -> str:
        """Helper method to determine the base agent type"""
        agent_type = next(
            (provider for provider, agent_class in AgentFactory._agent_registry.items() 
             if isinstance(self.agent, agent_class)),
            "unknown"
        )
        logger.debug(f"Determined base agent type: {agent_type}")
        return agent_type
    
    def _should_use_research_tools(self, prompt: str) -> bool:
        """Determine if the prompt requires research tools"""
        research_keywords = [
            "research", "latest", "recent", "developments", "advances",
            "study", "investigate", "analyze", "explore", "discover",
            "findings", "publications", "papers", "news", "current",
            "expert", "innovation", "patent", "technology", "breakthrough",
            "state-of-the-art", "cutting-edge", "emerging", "trend",
            "development", "progress", "advancement", "discovery"
        ]
        prompt_lower = prompt.lower()
        return any(keyword in prompt_lower for keyword in research_keywords)
        
    def _prepare_tools_with_query(self, tools: List[Dict[str, Any]], query: str) -> List[Dict[str, Any]]:
        """Prepare tools by adding the query to their parameters"""
        prepared_tools = []
        for tool in tools:
            tool_copy = tool.copy()
            if "parameters" not in tool_copy:
                tool_copy["parameters"] = {}
            tool_copy["parameters"]["query"] = query
            prepared_tools.append(tool_copy)
        return prepared_tools

    async def execute(self, prompt: str, tools: Optional[List[Dict[str, Any]]] = None, **kwargs) -> Dict[str, Any]:
        """Execute research task with optional tool support"""
        start_time = time.time()
        logger.info(f"Starting research execution with prompt: {prompt[:100]}...")
        
        # Determine if we should use research tools
        should_use_tools = self._should_use_research_tools(prompt)
        
        # Combine provided tools with available research tools if needed
        if should_use_tools:
            all_tools = list(self.available_tools)
            if tools:
                all_tools.extend(tools)
            # Prepare tools with the search query
            all_tools = self._prepare_tools_with_query(all_tools, prompt)
            tools = all_tools
            logger.info(f"Using {len(tools)} tools: {[t['name'] for t in tools]}")
        elif tools:
            logger.info(f"Using {len(tools)} provided tools: {[t['name'] for t in tools]}")
        
        # Create a research-focused prompt with enhanced instructions
        research_prompt = f"""You are an advanced research assistant with access to various specialized tools for gathering information. Your task is to:

        1. Analyze the given topic thoroughly using available tools
        2. Synthesize information from multiple sources:
           - Compare and contrast different viewpoints
           - Identify patterns and trends
           - Highlight consensus and controversies
        3. Evaluate the quality and reliability of sources
        4. Provide comprehensive insights supported by:
           - Recent research findings
           - Expert opinions
           - Statistical data when available
           - Real-world examples and case studies
        5. Draw meaningful conclusions and implications
        6. Identify gaps in current knowledge or areas needing further research
        7. Suggest practical applications or recommendations based on findings

        Important formatting instructions:
        - Use markdown syntax to make section titles bold (e.g., "**Key Findings:**")
        - Format important terms or concepts in bold where appropriate
        - Use bullet points for lists and findings
        - Include clear section headers to organize the information

        Note: Some tools might fail or return limited results. Please work with whatever information is available and acknowledge any limitations in the data.
        
        Topic: {prompt}
        
        Please provide a well-structured, detailed response that demonstrates deep analysis and critical thinking. Include citations or references where appropriate."""
        
        logger.debug(f"Generated research prompt: {research_prompt[:100]}...")
        
        # Use the underlying agent to generate the response with tool support
        try:
            if tools:
                logger.info("Executing with tools...")
                result = await self.agent.execute_with_tools(research_prompt, tools, **kwargs)
            else:
                logger.info("Executing without tools...")
                result = await self.agent.execute(research_prompt, **kwargs)
            
            logger.info("Successfully generated response")
        except Exception as e:
            logger.error(f"Error during execution: {str(e)}", exc_info=True)
            # Return a graceful error response
            return {
                "result": f"I encountered some issues while researching your query. Here's what I know based on the available information:\n\n{str(e)}",
                "metadata": {
                    "error": str(e),
                    "execution_time": time.time() - start_time,
                    "tools_attempted": [t["name"] for t in (tools or [])]
                }
            }
        
        # Add research-specific metadata
        execution_time = time.time() - start_time
        if isinstance(result, dict):
            result["metadata"] = {
                "model": self.model_id,
                "prompt": prompt,
                "temperature": self.temperature,
                "provider": self._get_base_agent_type(),
                "execution_time": execution_time,
                "agent_type": "research",
                "base_agent": self._get_base_agent_type(),
                "research_parameters": {
                    "topic": prompt,
                    "tools_used": [t["name"] for t in (tools or [])]
                },
                "tools_used": tools,
                "token_usage": result.get("metadata", {}).get("token_usage"),
                "tool_success_rate": self._calculate_tool_success_rate()
            }
            
            logger.info(f"Execution completed in {execution_time:.2f}s")
            if "token_usage" in result.get("metadata", {}):
                logger.info(f"Token usage: {result['metadata']['token_usage']}")
        
        return result
    
    async def validate_response(self, response: Any) -> bool:
        """Validate the research response"""
        logger.info("Validating research response...")
        
        # First use base validation
        if not await super().validate_response(response):
            logger.warning("Base validation failed")
            return False
            
        # Additional research-specific validation
        if isinstance(response, dict):
            result = response.get("result", "")
            
            # Check for minimum content length
            word_count = len(result.split())
            logger.debug(f"Response word count: {word_count}")
            if word_count < 50:  # Minimum 50 words
                logger.warning("Response too short (< 50 words)")
                return False
                
            # Check for structured content (contains numbered points)
            has_numbered_points = any(str(i) + "." in result for i in range(1, 10))
            logger.debug(f"Has numbered points: {has_numbered_points}")
            if not has_numbered_points:
                logger.warning("Response lacks structured numbered points")
                return False
                
            # Verify metadata contains research-specific fields
            metadata = response.get("metadata", {})
            if "research_parameters" not in metadata:
                logger.warning("Missing research parameters in metadata")
                return False
            
            logger.info("Response validation successful")
        
        return True
    
    def _calculate_tool_success_rate(self) -> Dict[str, Any]:
        """Calculate success rate of tool executions"""
        success_count = 0
        total_count = 0
        tool_stats = {}
        
        for record in self.execution_history:
            if "tools_used" in record:
                for tool in record["tools_used"]:
                    tool_name = tool
                    if tool_name not in tool_stats:
                        tool_stats[tool_name] = {"success": 0, "total": 0}
                    
                    tool_stats[tool_name]["total"] += 1
                    if record.get("status") == "success":
                        tool_stats[tool_name]["success"] += 1
                        success_count += 1
                    total_count += 1
        
        return {
            "overall_success_rate": success_count / total_count if total_count > 0 else 0,
            "total_executions": total_count,
            "tool_specific_stats": tool_stats
        }