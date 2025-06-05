"""Intelligent search orchestration system for coordinating multiple search tools."""

import asyncio
import re
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional, Set

import structlog

from app.core.models import ToolRequest, ToolResponse
from app.tools.search_tools import AcademicSearchTool, NewsSearchTool, WebSearchTool

logger = structlog.get_logger(__name__)


class SearchIntent(Enum):
    """Different types of search intents."""
    ACADEMIC = "academic"
    NEWS = "news"
    GENERAL = "general"
    TECHNICAL = "technical"
    BUSINESS = "business"
    DEFINITION = "definition"
    COMPARISON = "comparison"
    RECENT_EVENTS = "recent_events"


class TemporalScope(Enum):
    """Temporal scope of the search."""
    RECENT = "recent"  # Last 30 days
    CURRENT_YEAR = "current_year"
    HISTORICAL = "historical"
    ALL_TIME = "all_time"


@dataclass
class QueryAnalysis:
    """Analysis results for a search query."""
    main_topic: str
    keywords: List[str]
    intents: List[SearchIntent]
    temporal_scope: TemporalScope
    complexity_score: float
    requires_factual_data: bool
    requires_recent_info: bool
    suggested_tools: List[str]
    tool_priorities: Dict[str, float]
    reformulated_queries: Dict[str, str]


class SearchOrchestrator:
    """Intelligent orchestrator for coordinating multiple search tools."""
    
    def __init__(self, news_api_key: Optional[str] = None, semantic_scholar_api_key: Optional[str] = None):
        """Initialize the search orchestrator."""
        
        # Initialize search tools
        self.web_search = WebSearchTool()
        self.academic_search = AcademicSearchTool(api_key=semantic_scholar_api_key)
        self.news_search = NewsSearchTool(news_api_key=news_api_key)
        
        # Search tool registry
        self.search_tools = {
            "web_search": self.web_search,
            "academic_search": self.academic_search,
            "news_search": self.news_search
        }
        
        # Intent detection patterns
        self._intent_patterns = {
            SearchIntent.ACADEMIC: [
                r'\b(research|study|paper|journal|academic|scholar|citation|peer.?review)\b',
                r'\b(hypothesis|methodology|experiment|findings|publication)\b',
                r'\b(university|college|professor|phd|doctorate|thesis)\b'
            ],
            SearchIntent.NEWS: [
                r'\b(news|latest|recent|breaking|current|today|yesterday)\b',
                r'\b(headline|reporter|journalist|media|press)\b',
                r'\b(announcement|development|update|report)\b'
            ],
            SearchIntent.TECHNICAL: [
                r'\b(code|programming|software|algorithm|technical|api|framework)\b',
                r'\b(documentation|tutorial|implementation|debug|error)\b',
                r'\b(python|javascript|java|c\+\+|typescript|react|node)\b'
            ],
            SearchIntent.BUSINESS: [
                r'\b(business|company|market|industry|revenue|profit|investment)\b',
                r'\b(strategy|management|leadership|entrepreneur|startup)\b',
                r'\b(financial|economic|budget|cost|pricing|sales)\b'
            ],
            SearchIntent.DEFINITION: [
                r'\b(what is|define|definition|meaning|explain|explanation)\b',
                r'\b(how to|how do|step by step|guide|tutorial)\b'
            ],
            SearchIntent.COMPARISON: [
                r'\b(vs|versus|compare|comparison|difference|better|best)\b',
                r'\b(pros and cons|advantages|disadvantages|alternative)\b'
            ],
            SearchIntent.RECENT_EVENTS: [
                r'\b(2024|2023|recent|latest|new|current|today|this year)\b',
                r'\b(update|development|change|trend|innovation)\b'
            ]
        }
        
        # Temporal keywords
        self._temporal_keywords = {
            TemporalScope.RECENT: [
                "recent", "latest", "new", "current", "today", "yesterday", 
                "this week", "this month", "2024", "breaking"
            ],
            TemporalScope.CURRENT_YEAR: [
                "2024", "this year", "current year", "now", "modern"
            ],
            TemporalScope.HISTORICAL: [
                "history", "historical", "past", "old", "ancient", "traditional",
                "origin", "evolution", "development over time"
            ]
        }
        
        # Quality keywords for academic content
        self._quality_indicators = [
            "peer-reviewed", "published", "journal", "conference", "research",
            "methodology", "systematic", "meta-analysis", "empirical"
        ]
    
    async def orchestrate_search(
        self, 
        query: str, 
        max_results: int = 10,
        agent_type: str = "research",
        user_preferences: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Orchestrate an intelligent multi-tool search."""
        
        # Analyze the query
        analysis = self.analyze_query(query)
        
        logger.info("Search orchestration started", 
            query=query,
            main_topic=analysis.main_topic,
            intents=[intent.value for intent in analysis.intents],
            temporal_scope=analysis.temporal_scope.value,
            suggested_tools=analysis.suggested_tools
        )
        
        # Determine tool execution strategy
        execution_plan = self._create_execution_plan(analysis, max_results, user_preferences)
        
        # Execute searches in parallel or sequential based on strategy
        all_results = await self._execute_search_plan(execution_plan, analysis, agent_type)
        
        # Aggregate and rank results
        final_results = self._aggregate_and_rank_results(all_results, analysis, max_results)
        
        return {
            "success": True,
            "query": query,
            "analysis": {
                "main_topic": analysis.main_topic,
                "intents": [intent.value for intent in analysis.intents],
                "temporal_scope": analysis.temporal_scope.value,
                "complexity_score": analysis.complexity_score
            },
            "results": final_results,
            "metadata": {
                "total_sources": len(all_results),
                "tools_used": list(execution_plan.keys()),
                "execution_strategy": "parallel" if len(execution_plan) > 1 else "single"
            }
        }
    
    def analyze_query(self, query: str) -> QueryAnalysis:
        """Analyze a search query to determine optimal search strategy."""
        
        query_lower = query.lower()
        
        # Extract main topic (remove question words and common phrases)
        main_topic = self._extract_main_topic(query)
        
        # Extract keywords
        keywords = self._extract_meaningful_keywords(query)
        
        # Detect search intents
        intents = self._detect_search_intents(query_lower)
        
        # Determine temporal scope
        temporal_scope = self._determine_temporal_scope(query_lower)
        
        # Calculate complexity score
        complexity_score = self._calculate_complexity_score(query, keywords, intents)
        
        # Determine factual and recency requirements
        requires_factual_data = self._requires_factual_data(query_lower, intents)
        requires_recent_info = self._requires_recent_info(temporal_scope, intents)
        
        # Suggest tools and priorities
        suggested_tools, tool_priorities = self._suggest_tools_and_priorities(intents, temporal_scope)
        
        # Create reformulated queries for different tools
        reformulated_queries = self._create_reformulated_queries(query, main_topic, keywords, intents)
        
        return QueryAnalysis(
            main_topic=main_topic,
            keywords=keywords,
            intents=intents,
            temporal_scope=temporal_scope,
            complexity_score=complexity_score,
            requires_factual_data=requires_factual_data,
            requires_recent_info=requires_recent_info,
            suggested_tools=suggested_tools,
            tool_priorities=tool_priorities,
            reformulated_queries=reformulated_queries
        )
    
    def _extract_main_topic(self, query: str) -> str:
        """Extract the main topic from the query."""
        # Remove question words and common phrases
        cleaned = re.sub(r'\b(what|how|when|where|why|who|which|is|are|was|were|do|does|did|can|could|should|would|will)\b', '', query, flags=re.IGNORECASE)
        cleaned = re.sub(r'\b(the|a|an|in|on|at|to|for|of|with|by)\b', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        
        # Take the first few meaningful words
        words = cleaned.split()[:4]
        return ' '.join(words) if words else query[:50]
    
    def _extract_meaningful_keywords(self, query: str, max_keywords: int = 10) -> List[str]:
        """Extract meaningful keywords from the query."""
        # Remove stop words and extract important terms
        stop_words = {
            "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", 
            "of", "with", "by", "is", "are", "was", "were", "be", "been", "have", 
            "has", "had", "do", "does", "did", "will", "would", "could", "should",
            "what", "when", "where", "why", "how", "who", "which"
        }
        
        # Extract words and filter
        words = re.findall(r'\b\w{3,}\b', query.lower())
        keywords = [word for word in words if word not in stop_words]
        
        # Sort by length (longer words are often more specific)
        keywords.sort(key=len, reverse=True)
        
        return keywords[:max_keywords]
    
    def _detect_search_intents(self, query_lower: str) -> List[SearchIntent]:
        """Detect search intents from the query."""
        detected_intents = []
        
        for intent, patterns in self._intent_patterns.items():
            for pattern in patterns:
                if re.search(pattern, query_lower, re.IGNORECASE):
                    detected_intents.append(intent)
                    break
        
        # Default to general if no specific intent detected
        if not detected_intents:
            detected_intents.append(SearchIntent.GENERAL)
        
        # Remove duplicates while preserving order
        seen = set()
        unique_intents = []
        for intent in detected_intents:
            if intent not in seen:
                seen.add(intent)
                unique_intents.append(intent)
        
        return unique_intents
    
    def _determine_temporal_scope(self, query_lower: str) -> TemporalScope:
        """Determine the temporal scope of the query."""
        for scope, keywords in self._temporal_keywords.items():
            if any(keyword in query_lower for keyword in keywords):
                return scope
        
        return TemporalScope.ALL_TIME
    
    def _calculate_complexity_score(self, query: str, keywords: List[str], intents: List[SearchIntent]) -> float:
        """Calculate query complexity score (0.0 to 1.0)."""
        score = 0.0
        
        # Length factor
        word_count = len(query.split())
        score += min(word_count / 20, 0.3)
        
        # Keyword diversity
        score += min(len(keywords) / 15, 0.3)
        
        # Intent complexity
        intent_scores = {
            SearchIntent.DEFINITION: 0.1,
            SearchIntent.GENERAL: 0.2,
            SearchIntent.NEWS: 0.3,
            SearchIntent.BUSINESS: 0.4,
            SearchIntent.TECHNICAL: 0.5,
            SearchIntent.COMPARISON: 0.6,
            SearchIntent.ACADEMIC: 0.8,
            SearchIntent.RECENT_EVENTS: 0.4
        }
        
        max_intent_score = max([intent_scores.get(intent, 0.2) for intent in intents])
        score += max_intent_score * 0.4
        
        return min(score, 1.0)
    
    def _requires_factual_data(self, query_lower: str, intents: List[SearchIntent]) -> bool:
        """Determine if query requires factual/statistical data."""
        factual_keywords = ["data", "statistics", "numbers", "facts", "evidence", "study", "research"]
        factual_intents = {SearchIntent.ACADEMIC, SearchIntent.BUSINESS}
        
        return (any(keyword in query_lower for keyword in factual_keywords) or
                any(intent in factual_intents for intent in intents))
    
    def _requires_recent_info(self, temporal_scope: TemporalScope, intents: List[SearchIntent]) -> bool:
        """Determine if query requires recent information."""
        recent_scopes = {TemporalScope.RECENT, TemporalScope.CURRENT_YEAR}
        recent_intents = {SearchIntent.NEWS, SearchIntent.RECENT_EVENTS}
        
        return temporal_scope in recent_scopes or any(intent in recent_intents for intent in intents)
    
    def _suggest_tools_and_priorities(self, intents: List[SearchIntent], temporal_scope: TemporalScope) -> tuple[List[str], Dict[str, float]]:
        """Suggest tools and their priorities based on analysis."""
        tool_priorities = {
            "web_search": 0.5,
            "academic_search": 0.3,
            "news_search": 0.2
        }
        
        # Adjust priorities based on intents
        for intent in intents:
            if intent == SearchIntent.ACADEMIC:
                tool_priorities["academic_search"] += 0.4
                tool_priorities["web_search"] += 0.1
            elif intent in {SearchIntent.NEWS, SearchIntent.RECENT_EVENTS}:
                tool_priorities["news_search"] += 0.5
                tool_priorities["web_search"] += 0.2
            elif intent == SearchIntent.TECHNICAL:
                tool_priorities["web_search"] += 0.3
                tool_priorities["academic_search"] += 0.1
            elif intent == SearchIntent.BUSINESS:
                tool_priorities["web_search"] += 0.2
                tool_priorities["news_search"] += 0.3
            else:
                tool_priorities["web_search"] += 0.2
        
        # Adjust for temporal scope
        if temporal_scope in {TemporalScope.RECENT, TemporalScope.CURRENT_YEAR}:
            tool_priorities["news_search"] += 0.3
            tool_priorities["web_search"] += 0.2
        
        # Normalize priorities
        max_priority = max(tool_priorities.values())
        if max_priority > 1.0:
            for tool in tool_priorities:
                tool_priorities[tool] /= max_priority
        
        # Select tools with priority > 0.3
        suggested_tools = [tool for tool, priority in tool_priorities.items() if priority > 0.3]
        
        # Ensure at least one tool is suggested
        if not suggested_tools:
            suggested_tools = ["web_search"]
        
        return suggested_tools, tool_priorities
    
    def _create_reformulated_queries(
        self, 
        original_query: str, 
        main_topic: str, 
        keywords: List[str], 
        intents: List[SearchIntent]
    ) -> Dict[str, str]:
        """Create reformulated queries optimized for different search tools."""
        
        reformulated = {
            "original": original_query
        }
        
        # Academic search: emphasize research terms
        if SearchIntent.ACADEMIC in intents:
            academic_terms = ["research", "study", "analysis"]
            academic_query = f"{main_topic} {' '.join(academic_terms[:1])}"
            reformulated["academic_search"] = academic_query
        else:
            reformulated["academic_search"] = f"research {main_topic}"
        
        # News search: add temporal indicators
        if SearchIntent.NEWS in intents or SearchIntent.RECENT_EVENTS in intents:
            news_query = f"latest {main_topic}"
        else:
            news_query = f"{main_topic} news"
        reformulated["news_search"] = news_query
        
        # Web search: use keywords
        web_keywords = keywords[:4] if len(keywords) >= 4 else keywords + [main_topic]
        reformulated["web_search"] = " ".join(web_keywords)
        
        return reformulated
    
    def _create_execution_plan(
        self, 
        analysis: QueryAnalysis, 
        max_results: int,
        user_preferences: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Dict[str, Any]]:
        """Create execution plan for search tools."""
        
        execution_plan = {}
        results_per_tool = max(max_results // len(analysis.suggested_tools), 3)
        
        for tool_name in analysis.suggested_tools:
            priority = analysis.tool_priorities.get(tool_name, 0.5)
            tool_max_results = int(results_per_tool * (1 + priority))
            
            execution_plan[tool_name] = {
                "query": analysis.reformulated_queries.get(tool_name, analysis.reformulated_queries["original"]),
                "max_results": min(tool_max_results, 10),  # Cap per tool
                "priority": priority,
                "parameters": self._get_tool_parameters(tool_name, analysis, user_preferences)
            }
        
        return execution_plan
    
    def _get_tool_parameters(
        self, 
        tool_name: str, 
        analysis: QueryAnalysis,
        user_preferences: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Get parameters for specific search tool."""
        
        base_params = {
            "language": "en",
            "region": "us"
        }
        
        # Apply user preferences
        if user_preferences:
            base_params.update(user_preferences.get("default_params", {}))
            base_params.update(user_preferences.get(tool_name, {}))
        
        # Tool-specific parameters
        if tool_name == "news_search":
            if analysis.temporal_scope == TemporalScope.RECENT:
                from datetime import datetime, timedelta
                recent_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
                base_params["from_date"] = recent_date
            
            base_params["sort_by"] = "publishedAt" if analysis.requires_recent_info else "relevancy"
        
        elif tool_name == "academic_search":
            if analysis.temporal_scope == TemporalScope.RECENT:
                base_params["year_filter"] = "2020-"
            elif analysis.temporal_scope == TemporalScope.CURRENT_YEAR:
                base_params["year_filter"] = "2024"
            
            if any(keyword in analysis.main_topic.lower() for keyword in self._quality_indicators):
                base_params["min_citations"] = 5
        
        return base_params
    
    async def _execute_search_plan(
        self, 
        execution_plan: Dict[str, Dict[str, Any]], 
        analysis: QueryAnalysis,
        agent_type: str
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Execute the search plan using selected tools."""
        
        all_results = {}
        
        # Execute searches in parallel for efficiency
        search_tasks = []
        for tool_name, plan in execution_plan.items():
            task = self._execute_single_search(tool_name, plan, agent_type)
            search_tasks.append((tool_name, task))
        
        # Wait for all searches to complete
        for tool_name, task in search_tasks:
            try:
                results = await task
                all_results[tool_name] = results
            except Exception as e:
                logger.error("Search tool execution failed", 
                    tool_name=tool_name,
                    error=str(e)
                )
                all_results[tool_name] = []
        
        return all_results
    
    async def _execute_single_search(
        self, 
        tool_name: str, 
        plan: Dict[str, Any], 
        agent_type: str
    ) -> List[Dict[str, Any]]:
        """Execute a single search tool."""
        
        tool = self.search_tools.get(tool_name)
        if not tool:
            logger.warning("Unknown search tool", tool_name=tool_name)
            return []
        
        # Create tool request
        request = ToolRequest(
            query=plan["query"],
            parameters=plan["parameters"],
            agent_type=agent_type
        )
        
        # Execute search
        response = await tool.execute(request)
        
        if response.success and response.data:
            return response.data.get("results", [])
        else:
            logger.warning("Search tool returned no results", 
                tool_name=tool_name,
                error=response.error
            )
            return []
    
    def _aggregate_and_rank_results(
        self, 
        all_results: Dict[str, List[Dict[str, Any]]], 
        analysis: QueryAnalysis,
        max_results: int
    ) -> List[Dict[str, Any]]:
        """Aggregate and rank results from all search tools."""
        
        aggregated_results = []
        seen_urls = set()
        
        # Collect all results with source weighting
        for tool_name, results in all_results.items():
            tool_priority = analysis.tool_priorities.get(tool_name, 0.5)
            
            for result in results:
                url = result.get("url", "")
                
                # Skip duplicates
                if url in seen_urls:
                    continue
                seen_urls.add(url)
                
                # Calculate final score
                base_score = result.get("relevance_score", 0.5)
                tool_weight = tool_priority
                final_score = (base_score * 0.7) + (tool_weight * 0.3)
                
                # Add search metadata
                result["final_score"] = final_score
                result["source_tool"] = tool_name
                result["tool_priority"] = tool_priority
                
                aggregated_results.append(result)
        
        # Sort by final score
        aggregated_results.sort(key=lambda x: x.get("final_score", 0), reverse=True)
        
        # Return top results
        return aggregated_results[:max_results]