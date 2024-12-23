from typing import Dict, Any, Optional, List, Tuple, Union
from .base_agent import BaseAgent
from .base_factory import BaseAgentFactory
from app.config.settings import settings
import time
import logging
import re
from enum import Enum
from dataclasses import dataclass
from collections import defaultdict
import json

logger = logging.getLogger(__name__)

class ResearchIntent(Enum):
    ACADEMIC = "academic"
    TECHNOLOGY = "technology"
    NEWS = "news"
    EXPERT = "expert"
    PATENT = "patent"
    GENERAL = "general"

@dataclass
class PromptAnalysis:
    main_topic: str
    subtopics: List[str]
    intents: List[ResearchIntent]
    temporal_scope: str  # "recent", "historical", "all"
    required_depth: str  # "overview", "detailed", "comprehensive"
    constraints: List[str]
    search_queries: List[str]
    tool_priorities: List[str]

class PromptAnalyzer:
    """Analyzes user prompts to determine optimal research strategy"""
    
    # Intent detection patterns
    INTENT_PATTERNS = {
        ResearchIntent.ACADEMIC: [
            r"research\s+papers?",
            r"academic",
            r"studies",
            r"publications?",
            r"journal",
            r"conference",
            r"literature",
            r"methodology",
            r"theoretical",
            r"empirical"
        ],
        ResearchIntent.TECHNOLOGY: [
            r"technology",
            r"technical",
            r"implementation",
            r"software",
            r"hardware",
            r"algorithm",
            r"system",
            r"platform",
            r"framework",
            r"architecture"
        ],
        ResearchIntent.NEWS: [
            r"recent",
            r"latest",
            r"news",
            r"current",
            r"update",
            r"announcement",
            r"development",
            r"trend"
        ],
        ResearchIntent.EXPERT: [
            r"expert",
            r"specialist",
            r"researcher",
            r"authority",
            r"professional",
            r"leader",
            r"pioneer"
        ],
        ResearchIntent.PATENT: [
            r"patent",
            r"invention",
            r"innovation",
            r"intellectual\s+property",
            r"IP",
            r"filing",
            r"USPTO"
        ]
    }
    
    # Temporal scope patterns
    TEMPORAL_PATTERNS = {
        "recent": [
            r"recent",
            r"latest",
            r"current",
            r"new",
            r"ongoing",
            r"emerging"
        ],
        "historical": [
            r"historical",
            r"traditional",
            r"classical",
            r"evolution",
            r"development",
            r"background"
        ]
    }
    
    # Depth indicators
    DEPTH_PATTERNS = {
        "overview": [
            r"overview",
            r"summary",
            r"brief",
            r"introduction",
            r"basics"
        ],
        "detailed": [
            r"detailed",
            r"specific",
            r"in-depth",
            r"comprehensive",
            r"thorough"
        ]
    }
    
    @classmethod
    def analyze(cls, prompt: str) -> PromptAnalysis:
        """Analyze the prompt and return structured analysis"""
        
        # Clean and normalize prompt
        clean_prompt = cls._clean_prompt(prompt)
        
        # Extract main topic and subtopics
        main_topic, subtopics = cls._extract_topics(clean_prompt)
        
        # Detect research intents
        intents = cls._detect_intents(clean_prompt)
        
        # Determine temporal scope
        temporal_scope = cls._determine_temporal_scope(clean_prompt)
        
        # Determine required depth
        required_depth = cls._determine_depth(clean_prompt)
        
        # Extract constraints
        constraints = cls._extract_constraints(clean_prompt)
        
        # Generate optimized search queries
        search_queries = cls._generate_search_queries(
            main_topic, subtopics, intents, temporal_scope
        )
        
        # Determine tool priorities
        tool_priorities = cls._determine_tool_priorities(intents, temporal_scope, required_depth)
        
        return PromptAnalysis(
            main_topic=main_topic,
            subtopics=subtopics,
            intents=intents,
            temporal_scope=temporal_scope,
            required_depth=required_depth,
            constraints=constraints,
            search_queries=search_queries,
            tool_priorities=tool_priorities
        )
    
    @classmethod
    def _clean_prompt(cls, prompt: str) -> str:
        """Clean and normalize the prompt text"""
        # Convert to lowercase
        prompt = prompt.lower()
        # Remove extra whitespace
        prompt = " ".join(prompt.split())
        # Remove special characters except those needed
        prompt = re.sub(r'[^\w\s\-\.]', ' ', prompt)
        return prompt
    
    @classmethod
    def _extract_topics(cls, prompt: str) -> Tuple[str, List[str]]:
        """Extract main topic and subtopics from prompt"""
        # Split into sentences
        sentences = prompt.split('.')
        
        # First sentence usually contains the main topic
        main_topic_sentence = sentences[0].lower()
        
        # Common prefixes to remove
        prefixes = [
            "research",
            "help me find",
            "can you tell me about",
            "i need information on",
            "please find",
            "search for",
            "looking for",
            "find me",
            "tell me about",
            "what are",
            "how do",
            "why do"
        ]
        
        # Remove prefixes
        for prefix in prefixes:
            if main_topic_sentence.startswith(prefix):
                main_topic_sentence = main_topic_sentence[len(prefix):].strip()
        
        # Remove common question words and stop words
        stop_words = {"what", "how", "why", "when", "where", "who", "is", "are", "the", "a", "an", "in", "on", "at", "to", "for"}
        words = [w for w in main_topic_sentence.split() if w.lower() not in stop_words]
        
        # Extract main topic (using key phrases)
        if "including" in main_topic_sentence:
            main_topic = main_topic_sentence.split("including")[0].strip()
        elif "about" in main_topic_sentence:
            main_topic = main_topic_sentence.split("about")[1].strip()
        else:
            main_topic = " ".join(words)  # Use all remaining words
        
        # Look for subtopics after "including", "such as", etc.
        subtopics = []
        for sentence in sentences:
            sentence = sentence.lower()
            for marker in ["including", "such as", "especially", "particularly", "like", "for example"]:
                if marker in sentence:
                    subtopic_text = sentence.split(marker)[1].strip()
                    # Split by common delimiters and clean
                    found_subtopics = [s.strip() for s in re.split(r'[,;]|\band\b', subtopic_text)]
                    subtopics.extend([s for s in found_subtopics if s])
        
        return main_topic, subtopics
    
    @classmethod
    def _detect_intents(cls, prompt: str) -> List[ResearchIntent]:
        """Detect research intents from the prompt"""
        intents = []
        intent_scores = defaultdict(int)
        
        # Score each intent based on pattern matches
        for intent, patterns in cls.INTENT_PATTERNS.items():
            for pattern in patterns:
                matches = re.findall(pattern, prompt)
                intent_scores[intent] += len(matches)
        
        # Add intents that have matches
        for intent, score in intent_scores.items():
            if score > 0:
                intents.append(intent)
        
        # If no specific intents detected, add GENERAL
        if not intents:
            intents.append(ResearchIntent.GENERAL)
        
        return intents
    
    @classmethod
    def _determine_temporal_scope(cls, prompt: str) -> str:
        """Determine the temporal scope of the research"""
        for scope, patterns in cls.TEMPORAL_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, prompt):
                    return scope
        return "all"  # Default to all if no specific scope detected
    
    @classmethod
    def _determine_depth(cls, prompt: str) -> str:
        """Determine the required depth of research"""
        for depth, patterns in cls.DEPTH_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, prompt):
                    return depth
        return "detailed"  # Default to detailed if not specified
    
    @classmethod
    def _extract_constraints(cls, prompt: str) -> List[str]:
        """Extract any research constraints from the prompt"""
        constraints = []
        
        # Time constraints
        time_patterns = [
            r"in the last (\d+) years?",
            r"since (\d{4})",
            r"between (\d{4}) and (\d{4})"
        ]
        
        # Source constraints
        source_patterns = [
            r"only from ([^\.]+)",
            r"focusing on ([^\.]+)",
            r"specifically in ([^\.]+)"
        ]
        
        # Extract time constraints
        for pattern in time_patterns:
            matches = re.findall(pattern, prompt)
            if matches:
                constraints.extend([f"time:{match}" for match in matches])
        
        # Extract source constraints
        for pattern in source_patterns:
            matches = re.findall(pattern, prompt)
            if matches:
                constraints.extend([f"source:{match}" for match in matches])
        
        return constraints
    
    @classmethod
    def _generate_search_queries(
        cls,
        main_topic: str,
        subtopics: List[str],
        intents: List[ResearchIntent],
        temporal_scope: str
    ) -> List[str]:
        """Generate optimized search queries based on analysis"""
        queries = []
        
        # Base query from main topic
        base_query = main_topic
        
        # Add temporal scope modifiers
        if temporal_scope == "recent":
            time_modifiers = ["latest", "recent", "current"]
            for modifier in time_modifiers:
                queries.append(f"{modifier} {base_query}")
        
        # Add intent-specific queries
        for intent in intents:
            if intent == ResearchIntent.ACADEMIC:
                queries.append(f"{base_query} research papers")
                queries.append(f"{base_query} academic studies")
            elif intent == ResearchIntent.TECHNOLOGY:
                queries.append(f"{base_query} technology")
                queries.append(f"{base_query} technical implementation")
            elif intent == ResearchIntent.NEWS:
                queries.append(f"{base_query} news")
                queries.append(f"{base_query} latest developments")
            elif intent == ResearchIntent.EXPERT:
                queries.append(f"{base_query} experts")
                queries.append(f"{base_query} leading researchers")
            elif intent == ResearchIntent.PATENT:
                queries.append(f"{base_query} patents")
                queries.append(f"{base_query} innovations")
        
        # Add subtopic queries
        for subtopic in subtopics:
            queries.append(f"{base_query} {subtopic}")
        
        return queries
    
    @classmethod
    def _determine_tool_priorities(
        cls,
        intents: List[ResearchIntent],
        temporal_scope: str,
        required_depth: str
    ) -> List[str]:
        """Determine the priority order of research tools"""
        tools = []
        
        # Add tools based on intents
        for intent in intents:
            if intent == ResearchIntent.ACADEMIC:
                tools.extend(["academic_search", "expert_search"])
            elif intent == ResearchIntent.TECHNOLOGY:
                tools.extend(["web_search", "patent_search"])
            elif intent == ResearchIntent.NEWS:
                tools.extend(["news_search", "web_search"])
            elif intent == ResearchIntent.EXPERT:
                tools.extend(["expert_search", "academic_search"])
            elif intent == ResearchIntent.PATENT:
                tools.extend(["patent_search", "web_search"])
        
        # Adjust based on temporal scope
        if temporal_scope == "recent":
            # Prioritize news and web search for recent information
            tools = ["news_search", "web_search"] + [t for t in tools if t not in ["news_search", "web_search"]]
        elif temporal_scope == "historical":
            # Prioritize academic and expert search for historical information
            tools = ["academic_search", "expert_search"] + [t for t in tools if t not in ["academic_search", "expert_search"]]
        
        # Adjust based on required depth
        if required_depth == "comprehensive":
            # Use all available tools
            all_tools = {"web_search", "academic_search", "expert_search", "patent_search", "news_search"}
            tools = list(dict.fromkeys(tools + list(all_tools - set(tools))))
        
        return list(dict.fromkeys(tools))  # Remove duplicates while preserving order

class ResearchAgent(BaseAgent):
    """Agent for conducting research and analysis using various AI models"""
    
    # Base research tools (always available)
    BASE_RESEARCH_TOOLS = [
        {
            "name": "web_search",
            "type": "api_call",
            "description": "Search the web for recent information and developments using DuckDuckGo",
            "parameters": {
                "query": "string",
                "max_results": 5,
                "time_range": "string",  # e.g., "day", "week", "month", "year"
                "region": "string",      # e.g., "us", "uk", "global"
                "safe_search": "boolean" # Enable/disable safe search
            },
            "required_permissions": ["web_access"]
        },
        {
            "name": "academic_search",
            "type": "api_call",
            "description": "Search academic papers and research publications using Google Scholar and Semantic Scholar",
            "parameters": {
                "query": "string",
                "year_range": "string",
                "max_results": 3,
                "sort_by": "string",     # e.g., "relevance", "date", "citations"
                "publication_type": "string", # e.g., "journal", "conference", "thesis"
                "fields": "array"        # Specific fields to search in
            },
            "required_permissions": ["academic_access"]
        },
        {
            "name": "expert_search",
            "type": "api_call",
            "description": "Find domain experts and their publications using Google Scholar profiles",
            "parameters": {
                "query": "string",
                "expertise_area": "string",
                "max_results": 3,
                "include_metrics": "boolean"  # Include h-index, citations, etc.
            },
            "required_permissions": ["academic_access"]
        },
        {
            "name": "patent_search",
            "type": "api_call",
            "description": "Search patent databases for relevant innovations using Google Patents",
            "parameters": {
                "query": "string",
                "max_results": 3,
                "patent_type": "string",  # e.g., "utility", "design", "plant"
                "jurisdiction": "string", # e.g., "US", "EP", "WO"
                "status": "string"       # e.g., "granted", "pending", "all"
            },
            "required_permissions": ["patent_access"]
        }
    ]
    
    # Optional news search tool (requires API key)
    NEWS_SEARCH_TOOL = {
        "name": "news_search",
        "type": "api_call",
        "description": "Search recent news articles and press releases using NewsAPI",
        "parameters": {
            "query": "string",
            "date_range": "string",
            "max_results": 3,
            "categories": "array",    # e.g., ["technology", "business", "science"]
            "sources": "array",       # Specific news sources to include
            "language": "string",     # e.g., "en", "es", "fr"
            "sort_by": "string"       # e.g., "relevancy", "popularity", "publishedAt"
        },
        "required_permissions": ["news_api_access"]
    }
    
    # Result status constants
    NO_RESULTS_FOUND = "No results found"
    EMPTY_RESULTS = ["[]", NO_RESULTS_FOUND, "{}", "null", "None"]
    
    # Regex patterns
    BOLD_PATTERN = r'\*(.*?)\*+'
    BOLD_REPLACEMENT = r'**\1**'

    def __init__(self, model_id: str, temperature: float = 0.7):
        super().__init__(model_id, temperature)
        self.agent = BaseAgentFactory.create_base_agent(model_id, temperature)
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
            (provider for provider, agent_class in BaseAgentFactory._agent_registry.items() 
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
            
            # Simple query processing - just clean up newlines and extra spaces
            cleaned_query = " ".join(query.split())
            if len(cleaned_query) > 150:  # Basic length limit
                cleaned_query = cleaned_query[:150].rsplit(' ', 1)[0]
            
            tool_copy["parameters"]["query"] = cleaned_query
            prepared_tools.append(tool_copy)
        return prepared_tools

    def _convert_result_to_dict(self, result: Union[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Convert string result to dictionary format"""
        if isinstance(result, str):
            result_str = result.strip()
            is_empty = result_str in self.EMPTY_RESULTS
            return {
                "success": bool(result_str) and not is_empty,
                "result": result_str,
                "error": None if result_str and not is_empty else self.NO_RESULTS_FOUND
            }
        return result

    async def _try_variant(self, tool: Dict[str, Any], variant: str) -> Dict[str, Any]:
        """Try a single query variant"""
        tool_copy = tool.copy()
        tool_copy["parameters"] = tool_copy.get("parameters", {})
        tool_copy["parameters"]["query"] = variant
        
        retry_result = await self._execute_tool(tool_copy)
        return self._convert_result_to_dict(retry_result)

    async def _execute_tool_with_retry(
        self,
        tool: Dict[str, Any],
        original_query: str,
        max_retries: int = 3
    ) -> Dict[str, Any]:
        """Execute a tool with query reformulation retries"""
        
        # Try original query first
        result = await self._execute_tool(tool)
        result = self._convert_result_to_dict(result)
        
        # Check if we got any results
        result_data = json.loads(result["result"]) if isinstance(result["result"], str) else result["result"]
        results = result_data.get("results", [])
        
        if len(results) > 0:
            return result
        
        # Try reformulations if no results found
        logger.info(f"No results with original query, trying reformulations for {tool['name']}")
        
        # Use QueryReformulator for web_search, academic_search, and news_search
        if tool['name'] in ["web_search", "academic_search", "news_search"]:
            variants = QueryReformulator.reformulate_for_tool(original_query, tool['name'])
            
            for i, variant in enumerate(variants[:max_retries], 1):
                logger.info(f"Trying variant {i}/{max_retries}: {variant}")
                retry_result = await self._try_variant(tool, variant)
                
                # Check if retry got results
                retry_data = json.loads(retry_result["result"]) if isinstance(retry_result["result"], str) else retry_result["result"]
                retry_results = retry_data.get("results", [])
                
                if len(retry_results) > 0:
                    logger.info(f"Found {len(retry_results)} results with variant: {variant}")
                    return retry_result
                else:
                    logger.info(f"No results found with variant: {variant}")
        
        return result  # Return original result if all retries failed

    async def _initialize_tools(self, analysis: PromptAnalysis, provided_tools: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
        """Initialize and prepare tools based on analysis"""
        if not hasattr(self, 'available_tools'):
            self.available_tools = self.BASE_RESEARCH_TOOLS
            logger.info("Initialized base research tools")

        if analysis.tool_priorities:
            return self._prepare_prioritized_tools(analysis, provided_tools)
        return self._prepare_default_tools(analysis)

    def _prepare_prioritized_tools(self, analysis: PromptAnalysis, provided_tools: Optional[List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
        """Prepare tools based on priority analysis"""
        all_tools = []
        for tool_name in analysis.tool_priorities:
            if tool := next((t for t in self.available_tools if t["name"] == tool_name), None):
                tool_copy = tool.copy()
                tool_copy["parameters"] = tool_copy.get("parameters", {})
                search_query = f"{analysis.main_topic}"
                if analysis.subtopics:
                    search_query += f" {analysis.subtopics[0]}"
                tool_copy["parameters"]["query"] = search_query
                all_tools.append(tool_copy)
                logger.info(f"Added tool {tool_name} with query: {search_query}")
        
        if provided_tools:
            all_tools.extend(provided_tools)
        
        logger.info(f"Using {len(all_tools)} tools with priorities: {analysis.tool_priorities}")
        return all_tools

    def _prepare_default_tools(self, analysis: PromptAnalysis) -> List[Dict[str, Any]]:
        """Prepare default tools when no priorities are specified"""
        tools = [t.copy() for t in self.available_tools[:2]]
        for tool in tools:
            tool["parameters"] = tool.get("parameters", {})
            tool["parameters"]["query"] = analysis.main_topic
        logger.info("Using default tools with base query")
        return tools

    async def _execute_tools(self, tools: List[Dict[str, Any]]) -> Tuple[List[Any], List[Dict[str, Any]], List[str], List[str]]:
        """Execute tools and collect results"""
        tool_results = []
        tool_usage_summary = []
        successful_tools = []
        failed_tools = []

        if not tools:
            logger.warning("No tools available for execution")
            return tool_results, tool_usage_summary, successful_tools, failed_tools

        logger.info("Executing with tools...")
        for tool in tools:
            try:
                preview = str({k: v for k, v in tool.items() if k != "description"})
                logger.info(f"Using tool: {preview}")
                
                result = await self._execute_tool_with_retry(tool, tool["parameters"]["query"])
                await self._process_tool_result(
                    result, tool, 
                    tool_results, tool_usage_summary,
                    successful_tools, failed_tools
                )
            except Exception as e:
                self._handle_tool_error(e, tool, tool_usage_summary, failed_tools)

        return tool_results, tool_usage_summary, successful_tools, failed_tools

    async def _process_tool_result(
        self, result: Dict[str, Any], tool: Dict[str, Any],
        tool_results: List[Any], tool_usage_summary: List[Dict[str, Any]],
        successful_tools: List[str], failed_tools: List[str]
    ) -> None:
        """Process the result from a tool execution"""
        try:
            result_data = await self._parse_tool_result(result, tool)
            
            # Handle different result structures based on tool type
            if tool["name"] in ["web_search", "academic_search", "news_search", "expert_search"]:
                results = result_data.get("results", [])
            else:
                # For other tools, check result content
                result_content = result_data.get("result", "")
                results = [] if any(
                    no_result in str(result_content).lower() 
                    for no_result in self.EMPTY_RESULTS
                ) else [result_content]
            
            if not results:
                self._handle_empty_results(tool, result_data, tool_usage_summary, failed_tools)
                return
                
            self._handle_successful_results(
                tool, result_data, results,
                tool_results, tool_usage_summary, successful_tools
            )
            
        except Exception as e:
            self._handle_tool_error(e, tool, tool_usage_summary, failed_tools)

    async def _parse_tool_result(self, result: Dict[str, Any], tool: Dict[str, Any]) -> Dict[str, Any]:
        """Parse and extract result data from tool execution"""
        logger.info(f"Processing raw result from {tool['name']}: {result}")
        
        # Parse string result to dict if needed
        if isinstance(result, str):
            try:
                result = json.loads(result)
                logger.info(f"Successfully parsed JSON result for {tool['name']}")
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON for {tool['name']}: {e}")
                return {"success": False, "error": str(e)}
        
        # Extract result data
        if isinstance(result, dict) and "result" in result:
            try:
                result_data = json.loads(result["result"]) if isinstance(result["result"], str) else result["result"]
                logger.info(f"Extracted result data for {tool['name']}: {result_data}")
                return result_data
            except (json.JSONDecodeError, TypeError) as e:
                logger.error(f"Failed to parse result data for {tool['name']}: {e}")
                return result
        
        return result

    def _handle_empty_results(
        self, tool: Dict[str, Any], result_data: Dict[str, Any],
        tool_usage_summary: List[Dict[str, Any]], failed_tools: List[str]
    ) -> None:
        """Handle case when no results are found"""
        error_msg = result_data.get("error", self.NO_RESULTS_FOUND)
        failed_tools.append(tool["name"])
        tool_usage_summary.append({
            "tool": tool["name"],
            "status": "failed",
            "error": error_msg
        })
        logger.warning(f"Tool {tool['name']} failed: {error_msg}")

    def _get_result_type(self, tool_name: str) -> str:
        """Get the appropriate result type description based on tool name"""
        if tool_name in ["web_search", "academic_search"]:
            return "results"
        if tool_name == "news_search":
            return "news articles"
        if tool_name == "expert_search":
            return "experts"
        return "meaningful results"

    def _handle_successful_results(
        self, tool: Dict[str, Any], result_data: Dict[str, Any],
        results: List[Any], tool_results: List[Any],
        tool_usage_summary: List[Dict[str, Any]], successful_tools: List[str]
    ) -> None:
        """Handle successful tool execution results"""
        successful_tools.append(tool["name"])
        
        # For standard tools, store the entire result object
        if tool["name"] in ["web_search", "academic_search", "news_search", "expert_search"]:
            tool_results.append(result_data)
        else:
            # For other tools, store just the result content
            tool_results.append(results[0])
            
        tool_usage_summary.append({
            "tool": tool["name"],
            "status": "success",
            "execution_time": result_data.get("execution_time", 0),
            "total_found": len(results)
        })
        
        result_type = self._get_result_type(tool["name"])
        logger.info(f"Tool {tool['name']} executed successfully with {len(results)} {result_type}")

    def _handle_tool_error(
        self, error: Exception, tool: Dict[str, Any],
        tool_usage_summary: List[Dict[str, Any]], failed_tools: List[str]
    ) -> None:
        """Handle errors during tool execution"""
        tool_name = tool.get("name", "unknown")
        logger.warning(f"Error executing tool {tool_name}: {str(error)}")
        failed_tools.append(tool_name)
        tool_usage_summary.append({
            "tool": tool_name,
            "status": "error",
            "error": str(error)
        })

    async def execute(self, prompt: str, tools: Optional[List[Dict[str, Any]]] = None, **kwargs) -> Dict[str, Any]:
        """Execute research task with tool support"""
        start_time = time.time()
        logger.info(f"Starting research execution with prompt: {prompt[:100]}...")
        
        try:
            analysis = PromptAnalyzer.analyze(prompt)
            logger.info(f"Prompt analysis: {analysis}")
            
            tools = await self._initialize_tools(analysis, tools)
            tool_results, tool_usage_summary, successful_tools, failed_tools = await self._execute_tools(tools)
            
            research_prompt = self._create_enhanced_prompt(prompt, analysis)
            result = await self.agent.execute(research_prompt, **kwargs)
            
            # Format and return results
            return await self._format_final_result(
                result, tool_results, tool_usage_summary,
                successful_tools, failed_tools, start_time
            )
            
        except Exception as e:
            logger.error(f"Error during execution: {str(e)}", exc_info=True)
            return {
                "result": f"An error occurred during research: {str(e)}",
                "error": str(e),
                "execution_time": time.time() - start_time
            }

    async def _format_final_result(
        self, result: Any, tool_results: List[Any],
        tool_usage_summary: List[Dict[str, Any]],
        successful_tools: List[str], failed_tools: List[str],
        start_time: float
    ) -> Dict[str, Any]:
        """Format the final result with all necessary information"""
        if isinstance(result, str):
            result = {"result": result, "metadata": {}}
        elif not isinstance(result, dict):
            result = {"result": str(result), "metadata": {}}

        if tool_results:
            tool_summary = self._create_tool_summary(
                tool_results, successful_tools,
                failed_tools, tool_usage_summary,
                start_time
            )
            result["tool_results"] = tool_results
            result["result"] = result["result"] + tool_summary

            if len(result["result"].split()) < 30:
                result["result"] = (
                    "Based on the research query, here is what I found:\n\n" +
                    result["result"]
                )

        execution_time = time.time() - start_time
        logger.info(f"Execution completed in {execution_time:.2f}s")

        result["execution_stats"] = {
            "execution_time": execution_time,
            "tool_usage": tool_usage_summary,
            "successful_tools": len(successful_tools),
            "failed_tools": len(failed_tools)
        }

        return result

    def _format_academic_search_results(self, papers: List[Dict[str, Any]]) -> str:
        """Format academic search results"""
        summary = f"\nFound {len(papers)} relevant papers:\n\n"
        for i, paper in enumerate(papers):
            title = re.sub(self.BOLD_PATTERN, self.BOLD_REPLACEMENT, paper['title'])
            summary += f"***{title}** ({paper['year']})\n" if not paper['url'] else f"***[{title}]{' '}**({paper['url']})({paper['year']})\n"
            summary += f"Authors: {', '.join(paper['authors'])}\n"
            
            pub_info = []
            if paper['venue']: pub_info.append(f"Published in: {paper['venue']}")
            if paper['citations'] is not None: pub_info.append(f"Citations: {paper['citations']}")
            if pub_info: summary += f"{' | '.join(pub_info)}\n"
            if i < len(papers) - 1: summary += "\n"
        return summary

    def _format_expert_search_results(self, experts: List[Dict[str, Any]]) -> str:
        """Format expert search results"""
        summary = f"\nIdentified {len(experts)} leading experts:\n\n"
        for expert in experts:
            name = re.sub(self.BOLD_PATTERN, self.BOLD_REPLACEMENT, expert['name'])
            summary += f"{name}\n"
            summary += f"Total Citations: {expert['total_citations']}\n"
            summary += f"Published Papers: {expert['paper_count']}\n"
            if expert.get('expertise_areas'):
                summary += f"Areas of Expertise: {', '.join(expert['expertise_areas'])}\n"
            
            if expert.get('recent_papers'):
                summary += "Recent Notable Papers:\n"
                for paper in expert['recent_papers']:
                    paper_title = re.sub(self.BOLD_PATTERN, self.BOLD_REPLACEMENT, paper['title'])
                    summary += f"- {paper_title} ({paper['year']}) - {paper['citations']} citations\n"
        return summary

    def _format_default_results(self, result_data: Dict[str, Any], tool_result: Any) -> str:
        """Format default search results"""
        if isinstance(result_data, dict) and "results" in result_data:
            formatted_results = json.dumps(result_data["results"], indent=2)
            return f"Results found:\n```json\n{formatted_results}\n```\n"
        return f"Results found:\n{str(tool_result)}\n"

    @staticmethod
    def _format_date(date_str: str) -> str:
        """Format ISO date string to a more readable format"""
        try:
            # Parse the ISO format date
            from datetime import datetime
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            # Format to a more readable string
            return dt.strftime("%B %d, %Y at %I:%M %p")
        except Exception:
            return date_str  # Return original if parsing fails

    def _format_web_search_results(self, results: List[Dict[str, Any]]) -> str:
        """Format web search results in a similar style to academic search"""
        summary = f"\nFound {len(results)} relevant web results:\n\n"
        for i, result in enumerate(results):
            title = re.sub(self.BOLD_PATTERN, self.BOLD_REPLACEMENT, result['title'])
            summary += f"**{title}**\n"
            if result.get('link'):
                summary += f"Source: {result['link']}\n"
            if result.get('snippet'):
                summary += f"{result['snippet']}\n"
            if result.get('published'):
                summary += f"Published: {self._format_date(result['published'])}\n"
            if i < len(results) - 1:
                summary += "\n"
        return summary

    def _format_news_search_results(self, results: List[Dict[str, Any]]) -> str:
        """Format news search results in a similar style to web search"""
        summary = f"\nFound {len(results)} relevant news articles:\n\n"
        for i, result in enumerate(results):
            title = re.sub(self.BOLD_PATTERN, self.BOLD_REPLACEMENT, result['title'])
            summary += f"**{title}**\n"
            if result.get('url'):
                summary += f"Source: {result['url']}\n"
            if result.get('description'):
                summary += f"{result['description']}\n"
            if result.get('published_at'):
                summary += f"Published: {self._format_date(result['published_at'])}\n"
            if result.get('source'):
                summary += f"Source: {result['source']}\n"
            if i < len(results) - 1:
                summary += "\n"
        return summary

    def _format_successful_searches(self, successful_tools: List[str], tool_results: List[Any]) -> str:
        """Format successful search results"""
        summary = "\n### Successful Searches:\n"
        for tool_name, tool_result in zip(successful_tools, tool_results):
            summary += f"\n#### {tool_name.replace('_', ' ').title()}\n"
            try:
                result_data = json.loads(tool_result) if isinstance(tool_result, str) else tool_result
                if tool_name == "academic_search":
                    summary += self._format_academic_search_results(result_data.get("results", []))
                elif tool_name == "web_search":
                    summary += self._format_web_search_results(result_data.get("results", []))
                elif tool_name == "news_search":
                    summary += self._format_news_search_results(result_data.get("results", []))
                elif tool_name == "expert_search":
                    summary += self._format_expert_search_results(result_data.get("results", []))
                else:
                    summary += self._format_default_results(result_data, tool_result)
            except json.JSONDecodeError:
                summary += f"Results found:\n{str(tool_result)}\n"
        return summary

    def _format_failed_searches(self, tool_usage_summary: List[Dict[str, Any]]) -> str:
        """Format failed search results"""
        summary = "\n### Failed Searches\n"
        for summary_item in tool_usage_summary:
            if summary_item["status"] in ["failed", "error"]:
                tool_name = summary_item["tool"].replace('_', ' ').title()
                error_msg = summary_item.get("error", "Unknown error")
                summary += f"- {tool_name}: {error_msg}\n"
        return summary

    def _create_tool_summary(
        self, tool_results: List[Any], successful_tools: List[str],
        failed_tools: List[str], tool_usage_summary: List[Dict[str, Any]],
        start_time: float
    ) -> str:
        """Create a summary of tool results and usage"""
        tool_summary = "\n\n## Research Sources and Tools Used\n"
        
        if not successful_tools and not failed_tools:
            return tool_summary + "\nNo research tools were used for this query. The response is based on general knowledge.\n"

        if successful_tools:
            tool_summary += self._format_successful_searches(successful_tools, tool_results)
        
        if failed_tools:
            tool_summary += self._format_failed_searches(tool_usage_summary)
        
        # Add execution statistics
        tool_summary += "\n### Execution Statistics\n"
        tool_summary += f"Total tools attempted: {len(successful_tools) + len(failed_tools)}\n"
        tool_summary += f"Successful searches: {len(successful_tools)}\n"
        tool_summary += f"Failed searches: {len(failed_tools)}\n"
        tool_summary += f"Total execution time: {time.time() - start_time:.2f}s\n"
        
        return tool_summary

    def _create_enhanced_prompt(self, original_prompt: str, analysis: PromptAnalysis) -> str:
        """Create an enhanced research prompt based on analysis"""
        
        # Build prompt sections based on analysis
        sections = []
        
        # Add intent-specific instructions
        for intent in analysis.intents:
            if intent == ResearchIntent.ACADEMIC:
                sections.append("""
                Academic Research Focus:
                - Analyze academic papers and research findings
                - Evaluate methodologies and research quality
                - Identify key theories and frameworks
                - Assess the strength of evidence
                - When research tools return results, cite specific papers and findings
                """)
            elif intent == ResearchIntent.TECHNOLOGY:
                sections.append("""
                Technology Analysis Focus:
                - Examine technical implementations and solutions
                - Evaluate practical applications
                - Compare different approaches
                - Consider scalability and performance
                - When research tools return results, cite specific technologies and implementations
                """)
            elif intent == ResearchIntent.NEWS:
                sections.append("""
                Current Developments Focus:
                - Analyze recent news and announcements
                - Track industry trends and changes
                - Identify emerging patterns
                - Consider market impact
                - When research tools return results, cite specific news articles and developments
                """)
            elif intent == ResearchIntent.EXPERT:
                sections.append("""
                Expert Insight Focus:
                - Identify and cite leading authorities
                - Analyze expert opinions and perspectives
                - Compare different viewpoints
                - Evaluate credibility and expertise
                - When research tools return results, cite specific experts and their contributions
                """)
            elif intent == ResearchIntent.PATENT:
                sections.append("""
                Patent Analysis Focus:
                - Examine technical innovations
                - Analyze patent claims and scope
                - Identify key inventors and assignees
                - Consider commercial implications
                - When research tools return results, cite specific patents and innovations
                """)
        
        # Combine sections into final prompt
        enhanced_prompt = f"""You are an advanced research assistant with access to various specialized tools for gathering information. Your task is to research the following topic:

Topic: {original_prompt}

Research Focus:
{chr(10).join(sections)}

Analysis Parameters:
- Main Topic: {analysis.main_topic}
- Subtopics: {', '.join(analysis.subtopics) if analysis.subtopics else 'None specified'}
- Temporal Scope: {analysis.temporal_scope}
- Required Depth: {analysis.required_depth}
- Constraints: {', '.join(analysis.constraints) if analysis.constraints else 'None specified'}

Please provide a {analysis.required_depth} analysis that:
1. Synthesizes information from multiple sources
2. Compares and contrasts different viewpoints
3. Identifies patterns and trends
4. Highlights consensus and controversies
5. Evaluates the quality and reliability of sources
6. Provides specific examples and data points
7. Draws meaningful conclusions

IMPORTANT SOURCE ATTRIBUTION:
- When research tools return results, you MUST:
  * Start your response by clearly stating you are using information from specific research tools
  * Cite the specific sources (papers, experts, news articles, etc.) throughout your analysis
  * Include direct quotes or findings from the sources when relevant
  * Explain how each source contributes to the analysis
  * Evaluate the credibility and relevance of each source
  * Synthesize findings across multiple sources when available

- If no research tools return results:
  * Start your response by clearly stating you're using general knowledge
  * Include a "Source of Information" section at the beginning that explains:
    - This is based on general knowledge and training data
    - The information comes from established principles in the field
    - No real-time research or current studies are being cited
    - The response synthesizes commonly accepted knowledge in the domain
  * When discussing specific claims or numbers, note that these are general guidelines rather than specific research findings

Important formatting instructions:
- Use markdown syntax for section titles (e.g., "## Key Findings")
- Format important terms or concepts in bold
- Use bullet points for lists and findings
- Include clear section headers
- If tools were used successfully, their results will be added automatically at the end

Note: If research tools return results, focus on analyzing and synthesizing those specific findings rather than relying on general knowledge."""
        
        return enhanced_prompt

class QueryReformulator:
    """Reformulates search queries to improve search results"""
    
    # Common templates for query reformulation
    TEMPLATES = [
        "{topic}",
        "latest {topic}",
        "recent {topic} news",
        "new research on {topic}",
        "{topic} latest developments",
        "{topic} recent updates",
        "{topic} trends",
        "current {topic} research"
    ]
    
    # Result status constants
    NO_RESULTS_FOUND = "No results found"
    EMPTY_RESULTS = ["[]", NO_RESULTS_FOUND, "{}", "null", "None"]
    
    # Word replacements for common terms
    WORD_REPLACEMENTS = {
        "best": ["top", "recommended", "effective", "optimal"],
        "food": ["nutrition", "diet", "foods", "meals", "nutrients"],
        "gaining": ["building", "developing", "increasing", "growing"],
        "muscle": ["muscle mass", "muscular", "muscles", "strength"],
        "research": ["study", "investigate", "analyze", "examine"],
        "find": ["discover", "identify", "locate", "determine"]
    }
    
    @classmethod
    def generate_variants(cls, query: str) -> List[str]:
        """Generate different variants of the search query"""
        variants = set()  # Use set to avoid duplicates
        
        # Extract core topic
        core_topic = cls._extract_core_topic(query)
        logger.info(f"Extracted core topic: {core_topic}")
        
        # Add core topic variants
        variants.add(core_topic)
        
        # Apply word replacements to core topic
        words = core_topic.split()
        for i, word in enumerate(words):
            if word.lower() in cls.WORD_REPLACEMENTS:
                for replacement in cls.WORD_REPLACEMENTS[word.lower()]:
                    new_words = words.copy()
                    new_words[i] = replacement
                    variants.add(" ".join(new_words))
        
        # Apply templates to core topic
        for template in cls.TEMPLATES:
            variant = template.format(topic=core_topic)
            variants.add(variant)
        
        # Remove empty or too short variants
        variants = {v for v in variants if len(v.split()) >= 2}
        
        # Convert to list and sort by length (shorter queries first)
        return sorted(list(variants), key=len)
    
    @staticmethod
    def _clean_query(query: str) -> str:
        """Clean and normalize the query"""
        # Remove punctuation and extra spaces
        query = re.sub(r'[^\w\s]', ' ', query)
        query = ' '.join(query.split())
        return query
    
    @staticmethod
    def _extract_core_topic(query: str) -> str:
        """Extract the core topic from the query"""
        # Remove common prefixes and question words
        prefixes = [
            "what is", "what are", "how to", "how do", "can you",
            "tell me about", "i need", "please", "find", "help",
            "help me", "search", "web", "search for", "looking for",
            "find me", "tell me", "show me", "give me", "let's use"
        ]
        
        # Clean the query
        query = QueryReformulator._clean_query(query.lower())
        
        # Remove prefixes
        for prefix in prefixes:
            if query.startswith(prefix):
                query = query[len(prefix):].strip()
        
        # Remove common words that don't add meaning
        stop_words = {
            "the", "a", "an", "in", "on", "at", "to", "for", "of", "with",
            "by", "about", "like", "through", "over", "before", "between",
            "after", "since", "without", "under", "within", "along", "following",
            "me", "i", "we", "us", "you", "search", "web", "help", "find",
            "too", "also", "so", "and", "or", "but"
        }
        
        words = [w for w in query.split() if w.lower() not in stop_words]
        
        # Join remaining words
        core_topic = " ".join(words)
        
        return core_topic.strip()

    @classmethod
    def reformulate_for_tool(cls, query: str, tool_name: str, max_variants: int = 3) -> List[str]:
        """Generate tool-specific query variants"""
        core_topic = cls._extract_core_topic(query)
        logger.info(f"Reformulating '{query}' for {tool_name}. Core topic: '{core_topic}'")
        
        variants = []
        
        # Tool-specific variants
        if tool_name == "news_search":
            variants = [
                core_topic,  # Try the core topic first
                f"latest {core_topic}",
                f"{core_topic} news",
                f"recent developments in {core_topic}",
                f"{core_topic} research updates"
            ]
            
        elif tool_name == "academic_search":
            variants = [
                core_topic,  # Try the core topic first
                f"{core_topic} research",
                f"{core_topic} studies",
                f"recent {core_topic} papers"
            ]
            
        elif tool_name == "web_search":
            variants = [
                core_topic,  # Try the core topic first
                f"{core_topic} guide",
                f"{core_topic} tips"
            ]
        
        # Log the variants being tried
        logger.info(f"Generated variants for {tool_name}: {variants[:max_variants]}")
        
        return variants[:max_variants]

    async def _execute_tool(self, tool: Dict[str, Any]) -> str:
        """Execute a single tool and return the result"""
        try:
            tool_name = tool.get("name", "unknown")
            logger.info(f"Starting execution of tool: {tool_name}")
            
            # Get the tool function
            tool_func = getattr(self.base_agent, f"_execute_{tool_name}")
            if not tool_func:
                raise ValueError(f"Tool {tool_name} not found")
            
            # Execute the tool
            result = await tool_func(tool.get("parameters", {}))
            
            # Log the raw result for debugging
            logger.info(f"Raw result from {tool_name}: {result}")
            
            # Parse and validate the result
            try:
                parsed_result = json.loads(result)
                logger.info(f"Successfully parsed result from {tool_name}")
                logger.debug(f"Parsed result structure: {json.dumps(parsed_result, indent=2)}")
                
                # For web search, we only care about having results
                if tool_name == "web_search":
                    results = parsed_result.get("results", [])
                    if results:
                        logger.info(f"Web search returned {len(results)} results")
                        return result  # Return the original result as it's already properly formatted
                    else:
                        logger.warning("Web search returned no results")
                        return json.dumps({
                            "success": False,
                            "error": cls.NO_RESULTS_FOUND,
                            "results": [],
                            "research_type": "web"
                        })
                
                # For other tools, check success flag
                elif parsed_result.get("success", False):
                    results = parsed_result.get("results", [])
                    logger.info(f"Tool {tool_name} returned {len(results)} results")
                    return result
                
                # Return error response if no success/results
                error_msg = parsed_result.get("error", cls.NO_RESULTS_FOUND)
                logger.warning(f"Tool {tool_name} failed: {error_msg}")
                return json.dumps({
                    "success": False,
                    "error": error_msg,
                    "results": [],
                    "research_type": tool_name
                })
                    
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse result from {tool_name}: {str(e)}")
                return json.dumps({
                    "success": False,
                    "error": f"Invalid JSON response: {str(e)}",
                    "results": [],
                    "research_type": tool_name
                })
                
        except Exception as e:
            logger.error(f"Error executing tool {tool_name}: {str(e)}", exc_info=True)
            return json.dumps({
                "success": False,
                "error": str(e),
                "results": [],
                "research_type": tool_name
            })

    async def execute_with_tools(self, tools: List[Dict[str, Any]]) -> str:
        """Execute research using the provided tools"""
        try:
            logger.info("Starting tools execution...")
            all_results = []
            tool_outputs = []  # Store raw tool outputs
            successful_tools = []
            failed_tools = []
            
            for tool in tools:
                logger.info(f"Starting execution of tool: {tool['name']}")
                try:
                    result = await self._execute_tool(tool)
                    logger.info(f"Got raw result from {tool['name']}")
                    logger.debug(f"Raw result: {result}")
                    
                    # Parse result if it's a string
                    if isinstance(result, str):
                        result_data = json.loads(result)
                    else:
                        result_data = result
                    
                    logger.info(f"Successfully parsed result from {tool['name']}")
                    logger.debug(f"Parsed data structure: {json.dumps(result_data, indent=2)}")
                    
                    # Check for results
                    if result_data.get("results"):
                        successful_tools.append(tool["name"])
                        tool_outputs.append({
                            "tool_name": tool["name"],
                            "output": result_data
                        })
                        all_results.append({
                            "research_type": result_data.get("research_type", tool["name"]),
                            "results": result_data["results"],
                            "sources": result_data.get("sources", []),
                            "tools_used": [tool["name"]],
                            "total_found": len(result_data["results"])
                        })
                        logger.info(f"Added {len(result_data['results'])} results from {tool['name']}")
                    else:
                        error_msg = result_data.get("error", self.NO_RESULTS_FOUND)
                        failed_tools.append(tool["name"])
                        tool_outputs.append({
                            "tool_name": tool["name"],
                            "status": "failed",
                            "error": error_msg
                        })
                        logger.info(f"No results found for {tool['name']}")
                        
                except Exception as e:
                    logger.error(f"Error executing tool {tool['name']}: {str(e)}", exc_info=True)
                    failed_tools.append(tool["name"])
                    tool_outputs.append({
                        "tool_name": tool["name"],
                        "status": "error",
                        "error": str(e)
                    })
            
            # Format the final response with all results
            response = {
                "success": len(all_results) > 0,  # Success if we have any results
                "research_results": all_results,
                "total_tools_used": len(tools),
                "successful_tools": successful_tools,
                "failed_tools": failed_tools,
                "execution_time": time.time() - self.start_time,
                "tool_outputs": tool_outputs  # Include raw tool outputs
            }
            
            logger.info(f"Completed execution with {len(all_results)} successful results")
            logger.debug(f"Final response structure: {json.dumps(response, indent=2)}")
            return json.dumps(response)
            
        except Exception as e:
            logger.error(f"Error in execute_with_tools: {str(e)}", exc_info=True)
            return json.dumps({
                "success": False,
                "error": str(e),
                "research_results": [],
                "total_tools_used": 0,
                "successful_tools": [],
                "failed_tools": [],
                "execution_time": time.time() - self.start_time,
                "tool_outputs": []
            })