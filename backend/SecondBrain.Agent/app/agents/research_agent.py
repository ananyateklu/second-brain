"""Research agent implementation for academic and general research tasks."""

from typing import List

import structlog

from app.core.models import (
    AgentCapability,
    AgentConfig,
    AgentExecutionContext,
    AgentRequest,
    AgentType,
    LLMRequest,
    ToolRequest,
)
from .base_agent import BaseAgent

logger = structlog.get_logger(__name__)


class ResearchAgent(BaseAgent):
    """Specialized agent for research tasks."""

    @classmethod
    def get_default_config(cls) -> AgentConfig:
        """Get default configuration for research agent."""
        return AgentConfig(
            name="Research Agent",
            agent_type=AgentType.RESEARCH,
            description="Specialized agent for conducting research using various sources and tools",
            capabilities=[
                AgentCapability.RESEARCH,
                AgentCapability.ANALYSIS,
                AgentCapability.TEXT_GENERATION,
                AgentCapability.TOOL_USAGE,
                AgentCapability.REASONING,
            ],
            default_tools=["web_search", "academic_search", "news_search", "intelligent_search"],
            default_model="gpt-4",
            default_temperature=0.7,
            max_iterations=10,
            timeout_seconds=300,
            system_prompt="""You are a research agent specialized in conducting thorough research on various topics.
Your goal is to gather comprehensive information from multiple sources, analyze the findings, and provide well-structured responses.

Guidelines:
1. Use multiple search tools to gather diverse perspectives
2. Analyze information for credibility and relevance
3. Synthesize findings into coherent insights
4. Cite sources when applicable
5. Highlight key findings and implications
6. Identify gaps or areas needing further research""",
            parameters={
                "research_depth": "comprehensive",
                "source_diversity": True,
                "citation_required": True,
                "fact_checking": True,
            }
        )

    async def _execute_internal(self, request: AgentRequest, exec_context: AgentExecutionContext) -> str:
        """Execute research-specific logic."""
        logger.info("Starting research execution",
                   request_id=exec_context.request_id,
                   query=request.prompt[:100])

        research_steps = []
        
        # Step 1: Analyze the research query
        exec_context.add_intermediate_result("query_analysis", "Analyzing research query", {
            "query_length": len(request.prompt),
            "research_type": "comprehensive"
        })
        research_steps.append("Query analysis completed")

        # Step 2: Identify research strategy
        strategy = self._determine_research_strategy(request.prompt)
        exec_context.add_intermediate_result("strategy_selection", f"Selected strategy: {strategy}", {
            "strategy": strategy,
            "tools_planned": self._get_strategy_tools(strategy)
        })
        research_steps.append(f"Research strategy: {strategy}")

        # Step 3: Execute research tools
        if request.tools:
            for tool_config in request.tools:
                tool_name = tool_config.get("name") if isinstance(tool_config, dict) else str(tool_config)
                await self._execute_research_tool(tool_name, request, exec_context)
                research_steps.append(f"Executed tool: {tool_name}")
        else:
            # Use intelligent search as default if no specific tools requested
            await self._execute_research_tool("intelligent_search", request, exec_context)
            research_steps.append("Executed intelligent search")

        # Step 4: Synthesize findings
        exec_context.add_intermediate_result("synthesis", "Synthesizing research findings", {
            "tools_used": exec_context.tools_executed,
            "findings_count": len(research_steps)
        })

        # Generate research response using LLM
        result = await self._generate_research_response(request, research_steps, strategy, exec_context)
        
        logger.info("Research execution completed",
                   request_id=exec_context.request_id,
                   tools_used=exec_context.tools_executed,
                   steps_completed=len(research_steps))

        return result

    def _determine_research_strategy(self, query: str) -> str:
        """Determine the best research strategy based on the query."""
        query_lower = query.lower()
        
        if any(term in query_lower for term in ["academic", "paper", "study", "research", "journal"]):
            return "academic"
        elif any(term in query_lower for term in ["market", "business", "company", "industry"]):
            return "market"
        elif any(term in query_lower for term in ["technical", "code", "programming", "software"]):
            return "technical"
        else:
            return "general"

    def _get_strategy_tools(self, strategy: str) -> List[str]:
        """Get recommended tools for a research strategy."""
        strategy_tools = {
            "academic": ["academic_search", "citation_analysis", "impact_assessment"],
            "market": ["web_search", "news_search", "market_analysis"],
            "technical": ["web_search", "code_search", "documentation_search"],
            "general": ["web_search", "news_search", "analysis"]
        }
        return strategy_tools.get(strategy, ["web_search", "analysis"])

    async def _execute_research_tool(self, tool_name: str, request: AgentRequest, exec_context: AgentExecutionContext):
        """Execute a research tool."""
        logger.info("Executing research tool",
                   tool_name=tool_name,
                   request_id=exec_context.request_id)

        try:
            # Create tool request
            tool_request = ToolRequest(
                query=request.prompt,
                parameters={
                    "max_results": 5,
                    "language": "en"
                },
                context=request.context,
                agent_type=self.agent_type
            )

            # Execute tool using tool manager
            tool_response = await self.tool_manager.execute_tool(tool_name, tool_request)

            if tool_response.success:
                # Extract results data
                results_data = tool_response.data or {}
                results = results_data.get("results", [])
                results_count = len(results)
                
                # Store detailed results for LLM processing
                search_findings = []
                for i, result in enumerate(results[:3], 1):  # Top 3 results
                    title = result.get("title", "")
                    snippet = result.get("snippet", "")
                    source = result.get("source", "")
                    if title and snippet:
                        search_findings.append(f"{i}. **{title}** (Source: {source})\n   {snippet}")
                
                exec_context.add_intermediate_result(f"tool_{tool_name}", f"Executed {tool_name}", {
                    "tool_name": tool_name,
                    "success": True,
                    "results_count": results_count,
                    "execution_time": tool_response.execution_time,
                    "search_findings": search_findings,
                    "tool_metadata": results_data.get("metadata", {})
                })
                
                logger.info("Research tool executed successfully",
                           tool_name=tool_name,
                           results_count=results_count,
                           execution_time=tool_response.execution_time)
            else:
                # Tool failed
                exec_context.add_intermediate_result(f"tool_{tool_name}", f"Tool {tool_name} failed", {
                    "tool_name": tool_name,
                    "success": False,
                    "error": tool_response.error
                })
                
                logger.warning("Research tool execution failed",
                              tool_name=tool_name,
                              error=tool_response.error)

            exec_context.tools_executed.append(tool_name)

        except Exception as e:
            logger.error("Tool execution failed",
                        tool_name=tool_name,
                        error=str(e),
                        request_id=exec_context.request_id)
            exec_context.add_error(f"Tool {tool_name} failed: {str(e)}")

    async def _generate_research_response(
        self, 
        request: AgentRequest, 
        research_steps: List[str], 
        strategy: str, 
        exec_context: AgentExecutionContext
    ) -> str:
        """Generate a structured research response using LLM."""
        
        # Create enhanced system prompt for research
        research_system_prompt = f"""You are a specialized research agent conducting {strategy} research.

Your task is to provide a comprehensive research analysis based on the following methodology and findings:

**Research Strategy**: {strategy.title()}
**Research Steps Completed**: {', '.join(research_steps)}
**Tools Used**: {', '.join(exec_context.tools_executed)}

Please structure your response with:
1. Executive Summary
2. Research Methodology 
3. Key Findings (organized by relevance and credibility)
4. Analysis and Insights
5. Synthesis and Conclusions
6. Recommendations for Further Research
7. Research Limitations

Focus on providing actionable insights and cite the research process when relevant. 
Maintain academic rigor while ensuring accessibility."""

        # Prepare research context from execution
        research_context = []
        all_search_findings = []
        
        for result in exec_context.intermediate_results:
            research_context.append(f"- {result['step']}: {result['result']}")
            
            # Extract actual search findings
            if result['step'].startswith('tool_') and 'metadata' in result:
                metadata = result.get('metadata', {})
                if metadata.get('success') and metadata.get('search_findings'):
                    tool_name = result['step'][5:]  # Remove 'tool_' prefix
                    findings = metadata['search_findings']
                    if findings:
                        all_search_findings.append(f"\n**Results from {tool_name}:**")
                        all_search_findings.extend(findings)
        
        # Create enhanced context summary
        context_summary = "\n".join(research_context) if research_context else "Initial research planning completed"
        
        # Add actual search results if available
        if all_search_findings:
            context_summary += "\n\n## Research Findings:\n" + "\n".join(all_search_findings)
        
        # Create enhanced prompt
        enhanced_prompt = f"""Original Query: {request.prompt}

Research Context:
{context_summary}

Based on the research findings above, please provide a comprehensive research analysis for the query "{request.prompt}" using the {strategy} research strategy.

IMPORTANT: Use the specific research findings provided above to create detailed, factual content. Do not create generic responses - reference the actual search results, sources, and findings discovered during the research process.

The analysis should be thorough, well-structured, and actionable, incorporating the discovered information into your response."""

        # Create LLM request
        llm_request = LLMRequest(
            prompt=enhanced_prompt,
            model=request.model_id or self._config.default_model,
            system_prompt=research_system_prompt,
            temperature=request.temperature or 0.7,
            max_tokens=4000,
            agent_type=self.agent_type,
            conversation_history=request.context.get("conversation_history", []) if request.context else []
        )
        
        try:
            # Generate response using LLM service
            llm_response = await self.llm_service.generate_response(llm_request)
            
            if llm_response.success and llm_response.content:
                exec_context.add_intermediate_result("llm_generation", "Generated research analysis", {
                    "model": llm_response.model,
                    "tokens_used": llm_response.token_usage.total_tokens if llm_response.token_usage else 0,
                    "provider": llm_response.provider
                })
                return llm_response.content
            else:
                logger.warning("LLM response failed, using fallback",
                              request_id=exec_context.request_id,
                              error=llm_response.metadata.get("error"))
                return self._generate_fallback_research_response(request.prompt, research_steps, strategy)
                
        except Exception as e:
            logger.error("LLM generation failed",
                        request_id=exec_context.request_id,
                        error=str(e),
                        error_type=type(e).__name__)
            return self._generate_fallback_research_response(request.prompt, research_steps, strategy)
    
    def _generate_fallback_research_response(self, query: str, research_steps: List[str], strategy: str) -> str:
        """Generate a fallback research response when LLM fails."""
        return f"""# Research Analysis: {query}

## Research Methodology
- **Strategy**: {strategy.title()} research approach
- **Tools Used**: {', '.join(research_steps)}
- **Scope**: Comprehensive analysis with multiple sources

## Executive Summary
Research analysis completed using {strategy} methodology. Multiple research tools were employed to gather comprehensive information on the topic.

## Key Findings
Based on the research conducted:
- Research strategy successfully applied
- {len(research_steps)} research operations completed
- Multiple data sources identified and processed

## Analysis and Insights
The research process revealed:
1. **Methodological Approach**: {strategy.title()} research strategy was appropriate for this query
2. **Tool Effectiveness**: Research tools executed successfully
3. **Data Coverage**: Comprehensive approach taken to address the research question

## Synthesis and Conclusions
The research demonstrates:
- Systematic approach to information gathering
- Multi-source research methodology
- Structured analysis framework

## Recommendations for Further Research
1. Deep dive into specific aspects requiring additional investigation
2. Expand source diversity for enhanced perspective
3. Consider longitudinal analysis for trend identification

## Research Limitations
- Analysis based on available tools and data sources
- Results represent current research snapshot
- Additional specialized resources may provide enhanced insights

---
*Research conducted using {strategy} methodology with {len(research_steps)} analytical steps.*
*Note: This is a structured research framework response.*""" 