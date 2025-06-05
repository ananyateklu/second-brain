"""Comprehensive test script for the search infrastructure."""

import asyncio
import os
import time
from typing import Dict, Any

from app.config.settings import get_settings
from app.core.models import ToolRequest
from app.services.tool_manager import ToolManager

async def test_search_infrastructure():
    """Test the complete search infrastructure."""
    
    print("🔍 Testing Search Infrastructure")
    print("=" * 60)
    
    # Initialize tool manager
    print("\n📋 Initializing Tool Manager...")
    tool_manager = ToolManager()
    
    # Test tool availability
    print("\n🛠️ Available Tools:")
    available_tools = tool_manager.list_available_tools()
    for tool in available_tools:
        tool_info = tool_manager.get_tool_info(tool)
        status = tool_info.get("implementation_status", "unknown") if tool_info else "unknown"
        print(f"  ✓ {tool} ({status})")
    
    # Test tool health
    print("\n🏥 Tool Health Check:")
    try:
        health = await tool_manager.get_tool_health()
        print(f"  Overall Status: {health.get('status', 'unknown')}")
        
        # External APIs
        external_apis = health.get("external_apis", {})
        for api_name, api_info in external_apis.items():
            status = "✅" if api_info.get("has_api_key") else "⚠️"
            print(f"  {status} {api_name}: {api_info.get('status', 'unknown')}")
        
        # Search orchestrator
        orchestrator_status = health.get("search_orchestrator", {}).get("status", "unknown")
        print(f"  🎯 Search Orchestrator: {orchestrator_status}")
        
    except Exception as e:
        print(f"  ❌ Health check failed: {e}")
    
    # Test queries for different search types
    test_queries = [
        {
            "name": "General Web Search",
            "query": "latest developments in artificial intelligence 2024",
            "tool": "web_search",
            "description": "Tests basic web search functionality"
        },
        {
            "name": "Academic Research",
            "query": "machine learning research papers",
            "tool": "academic_search", 
            "description": "Tests academic paper search"
        },
        {
            "name": "News Search",
            "query": "technology news today",
            "tool": "news_search",
            "description": "Tests current news search"
        },
        {
            "name": "Intelligent Search",
            "query": "recent breakthroughs in quantum computing research",
            "tool": "intelligent_search",
            "description": "Tests intelligent search orchestration"
        }
    ]
    
    print(f"\n🧪 Running {len(test_queries)} Search Tests:")
    print("-" * 60)
    
    for i, test_case in enumerate(test_queries, 1):
        print(f"\n{i}. {test_case['name']}")
        print(f"   Query: {test_case['query']}")
        print(f"   Tool: {test_case['tool']}")
        print(f"   Description: {test_case['description']}")
        
        try:
            # Create tool request
            request = ToolRequest(
                query=test_case["query"],
                parameters={"max_results": 3},
                agent_type="research"
            )
            
            # Execute search
            start_time = time.time()
            response = await tool_manager.execute_tool(test_case["tool"], request)
            execution_time = time.time() - start_time
            
            if response.success:
                results_count = 0
                if response.data:
                    if "results" in response.data:
                        results_count = len(response.data["results"])
                    elif isinstance(response.data, list):
                        results_count = len(response.data)
                
                print(f"   ✅ Success: {results_count} results in {execution_time:.2f}s")
                
                # Show sample results
                if response.data and "results" in response.data:
                    for j, result in enumerate(response.data["results"][:2], 1):
                        title = result.get("title", "No title")[:60]
                        source = result.get("source", "Unknown")
                        print(f"      {j}. {title}... (Source: {source})")
                
                # Show metadata for intelligent search
                if test_case["tool"] == "intelligent_search" and response.data:
                    analysis = response.data.get("analysis", {})
                    intents = analysis.get("intents", [])
                    tools_used = response.data.get("metadata", {}).get("tools_used", [])
                    print(f"      🎯 Detected intents: {', '.join(intents)}")
                    print(f"      🛠️ Tools used: {', '.join(tools_used)}")
                
            else:
                print(f"   ❌ Failed: {response.error}")
                
        except Exception as e:
            print(f"   💥 Exception: {e}")
    
    # Test parallel execution
    print(f"\n⚡ Testing Parallel Tool Execution:")
    try:
        parallel_tools = ["web_search", "news_search"]
        request = ToolRequest(
            query="artificial intelligence trends",
            parameters={"max_results": 2},
            agent_type="research"
        )
        
        start_time = time.time()
        parallel_responses = await tool_manager.execute_tools_parallel(parallel_tools, request)
        parallel_time = time.time() - start_time
        
        print(f"   ✅ Parallel execution completed in {parallel_time:.2f}s")
        for i, (tool, response) in enumerate(zip(parallel_tools, parallel_responses)):
            status = "✅" if response.success else "❌"
            results = len(response.data.get("results", [])) if response.data else 0
            print(f"      {status} {tool}: {results} results")
            
    except Exception as e:
        print(f"   ❌ Parallel execution failed: {e}")
    
    # Test search orchestrator query analysis
    print(f"\n🧠 Testing Query Analysis:")
    try:
        from app.tools import SearchOrchestrator
        orchestrator = SearchOrchestrator()
        
        analysis_queries = [
            "latest AI research papers on neural networks",
            "breaking news about climate change",
            "what is machine learning?",
            "compare Python vs JavaScript for web development"
        ]
        
        for query in analysis_queries:
            analysis = orchestrator.analyze_query(query)
            print(f"   Query: {query[:40]}...")
            print(f"      🎯 Intents: {[intent.value for intent in analysis.intents]}")
            print(f"      ⏰ Temporal: {analysis.temporal_scope.value}")
            print(f"      🛠️ Suggested tools: {analysis.suggested_tools}")
            print(f"      📊 Complexity: {analysis.complexity_score:.2f}")
            
    except Exception as e:
        print(f"   ❌ Query analysis failed: {e}")
    
    # Performance summary
    print(f"\n📊 Performance Summary:")
    print("   - Web Search: Fast, general purpose")
    print("   - Academic Search: Specialized, high-quality results") 
    print("   - News Search: Recent, time-sensitive content")
    print("   - Intelligent Search: Orchestrated, best overall results")
    print("   - Parallel Execution: Faster when multiple tools needed")
    
    # Configuration recommendations
    print(f"\n⚙️ Configuration Recommendations:")
    settings = get_settings()
    
    recommendations = []
    if not settings.news_api_key:
        recommendations.append("🔑 Add NEWS_API_KEY for enhanced news search")
    if not settings.semantic_scholar_api_key:
        recommendations.append("🔑 Add SEMANTIC_SCHOLAR_API_KEY for better academic search")
    if settings.search_timeout_seconds < 30:
        recommendations.append("⏱️ Consider increasing SEARCH_TIMEOUT_SECONDS to 30+")
    
    if recommendations:
        for rec in recommendations:
            print(f"   {rec}")
    else:
        print("   ✅ All configurations optimal!")
    
    print(f"\n🏁 Search Infrastructure Testing Complete!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_search_infrastructure())