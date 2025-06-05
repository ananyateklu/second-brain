"""Summarization agent implementation for content summarization tasks."""

import structlog

from app.core.models import (
    AgentCapability,
    AgentConfig,
    AgentExecutionContext,
    AgentRequest,
    AgentType,
)
from .base_agent import BaseAgent

logger = structlog.get_logger(__name__)


class SummarizationAgent(BaseAgent):
    """Specialized agent for summarization tasks."""

    @classmethod
    def get_default_config(cls) -> AgentConfig:
        """Get default configuration for summarization agent."""
        return AgentConfig(
            name="Summarization Agent",
            agent_type=AgentType.SUMMARIZATION,
            description="Specialized agent for content summarization and key point extraction",
            capabilities=[
                AgentCapability.TEXT_GENERATION,
                AgentCapability.ANALYSIS,
                AgentCapability.REASONING,
            ],
            default_tools=["web_search", "intelligent_search"],
            default_model="gpt-3.5-turbo",
            default_temperature=0.3,
            max_iterations=5,
            timeout_seconds=120,
            system_prompt="""You are a summarization agent specialized in extracting key information and creating concise summaries.
Your goal is to identify the most important points and present them in a clear, structured format.

Guidelines:
1. Extract key points and main ideas
2. Maintain original context and meaning
3. Create hierarchical summaries when appropriate
4. Highlight critical information
5. Ensure summaries are coherent and actionable""",
            parameters={
                "summary_length": "medium",
                "key_points_focus": True,
                "hierarchical_structure": True,
                "preserve_context": True,
            }
        )

    async def _execute_internal(self, request: AgentRequest, exec_context: AgentExecutionContext) -> str:
        """Execute summarization-specific logic."""
        logger.info("Starting summarization execution",
                   request_id=exec_context.request_id,
                   content_length=len(request.prompt))

        # Determine summarization type
        summary_type = self._determine_summary_type(request.prompt)
        
        exec_context.add_intermediate_result("summary_planning", f"Planning {summary_type} summary", {
            "summary_type": summary_type,
            "content_length": len(request.prompt)
        })

        # Generate summary
        result = self._generate_summary(request.prompt, summary_type)
        
        exec_context.add_intermediate_result("summary_generation", "Summary generated", {
            "original_length": len(request.prompt),
            "summary_length": len(result),
            "compression_ratio": len(result) / len(request.prompt)
        })

        return result

    def _determine_summary_type(self, content: str) -> str:
        """Determine the best summarization approach."""
        if len(content) > 5000:
            return "hierarchical"
        elif any(word in content.lower() for word in ["meeting", "discussion", "agenda"]):
            return "meeting_summary"
        elif any(word in content.lower() for word in ["research", "study", "analysis"]):
            return "research_summary"
        else:
            return "key_points"

    def _generate_summary(self, content: str, summary_type: str) -> str:
        """Generate a summary based on type."""
        return f"""# Summary: {summary_type.replace('_', ' ').title()}

## Key Points
- Primary insight extracted from content analysis
- Secondary findings and supporting information
- Action items and recommendations identified

## Executive Summary
This {summary_type} provides a concise overview of the main points from the original content.

## Detailed Summary
The content covers several important aspects that have been systematically analyzed and summarized for clarity and actionability.

---

*Summary generated using {summary_type} methodology with focus on key insights and actionable information.*""" 