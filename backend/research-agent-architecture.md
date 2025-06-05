# Research Agent Architecture & Implementation Plan

## Executive Summary

This document outlines the design and implementation strategy for a new, clean research agent that addresses the limitations of the current implementation while providing a foundation for easily expandable agent systems. The new architecture emphasizes modularity, clean separation of concerns, robust error handling, and seamless integration with the existing C# backend.

## Current Implementation Issues

Based on analysis of the existing `SecondBrain.PythonApi`, several areas need improvement:

1. **Monolithic Base Agent**: 1122 lines in `base_agent.py` with mixed responsibilities
2. **Tight Coupling**: Research logic tightly coupled with general agent functionality
3. **Complex Error Handling**: Inconsistent error handling across different tools
4. **Limited Extensibility**: Adding new agent types requires modifying existing code
5. **Tool Management**: Tools are embedded within agents rather than being composable
6. **Configuration Sprawl**: Settings scattered across multiple files

## New Architecture Overview

### Core Principles

1. **Single Responsibility**: Each component has one clear purpose
2. **Dependency Injection**: All dependencies are explicitly injected
3. **Interface Segregation**: Small, focused interfaces for easy testing
4. **Open/Closed Principle**: Open for extension, closed for modification
5. **Composition over Inheritance**: Favor composition for flexibility

### High-Level Architecture

```
ResearchAgentAPI/
├── core/                    # Core abstractions and interfaces
├── agents/                  # Agent implementations
├── tools/                   # Composable research tools
├── services/               # Business logic services
├── infrastructure/         # External integrations
├── config/                 # Configuration management
├── middleware/             # Cross-cutting concerns
└── api/                   # FastAPI routes and controllers
```

## Detailed Component Design

### 1. Core Abstractions (`core/`)

#### Agent Interface
```python
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from dataclasses import dataclass

@dataclass
class AgentRequest:
    prompt: str
    context: Optional[Dict[str, Any]] = None
    tools: Optional[List[str]] = None
    max_iterations: int = 10
    timeout: int = 300

@dataclass
class AgentResponse:
    result: str
    metadata: Dict[str, Any]
    tool_usage: List[Dict[str, Any]]
    execution_time: float
    success: bool

class IAgent(ABC):
    @abstractmethod
    async def execute(self, request: AgentRequest) -> AgentResponse:
        pass
```

#### Tool Interface
```python
from abc import ABC, abstractmethod
from typing import Dict, Any
from enum import Enum

class ToolCategory(Enum):
    SEARCH = "search"
    ANALYSIS = "analysis"
    EXTRACTION = "extraction"
    SYNTHESIS = "synthesis"

@dataclass
class ToolRequest:
    query: str
    parameters: Dict[str, Any]
    context: Optional[Dict[str, Any]] = None

@dataclass
class ToolResponse:
    data: Any
    metadata: Dict[str, Any]
    success: bool
    execution_time: float
    error: Optional[str] = None

class ITool(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass
    
    @property
    @abstractmethod
    def category(self) -> ToolCategory:
        pass
    
    @property
    @abstractmethod
    def description(self) -> str:
        pass
    
    @abstractmethod
    async def execute(self, request: ToolRequest) -> ToolResponse:
        pass
    
    @abstractmethod
    def validate_parameters(self, parameters: Dict[str, Any]) -> bool:
        pass
```

### 2. Research Agent Implementation (`agents/`)

#### Research Agent
```python
class ResearchAgent(IAgent):
    def __init__(
        self,
        llm_service: ILLMService,
        tool_manager: IToolManager,
        context_manager: IContextManager,
        config: ResearchAgentConfig
    ):
        self.llm_service = llm_service
        self.tool_manager = tool_manager
        self.context_manager = context_manager
        self.config = config
    
    async def execute(self, request: AgentRequest) -> AgentResponse:
        # Implementation follows clean strategy pattern
        strategy = await self._determine_strategy(request)
        return await strategy.execute(request)
```

#### Strategy Pattern for Research Types
```python
class IResearchStrategy(ABC):
    @abstractmethod
    async def execute(self, request: AgentRequest) -> AgentResponse:
        pass

class AcademicResearchStrategy(IResearchStrategy):
    # Focuses on academic papers, citations, peer review
    pass

class MarketResearchStrategy(IResearchStrategy):
    # Focuses on market trends, competitor analysis
    pass

class TechnicalResearchStrategy(IResearchStrategy):
    # Focuses on technical documentation, code, implementations
    pass

class GeneralResearchStrategy(IResearchStrategy):
    # General purpose research with multiple sources
    pass
```

### 3. Composable Tools (`tools/`)

#### Search Tools
```python
class AcademicSearchTool(ITool):
    def __init__(self, semantic_scholar_client: ISemanticScholarClient):
        self.client = semantic_scholar_client
    
    @property
    def name(self) -> str:
        return "academic_search"
    
    @property
    def category(self) -> ToolCategory:
        return ToolCategory.SEARCH
    
    async def execute(self, request: ToolRequest) -> ToolResponse:
        # Clean, focused implementation
        pass

class WebSearchTool(ITool):
    def __init__(self, search_client: ISearchClient):
        self.client = search_client
    
    # Similar structure
    pass

class NewsSearchTool(ITool):
    def __init__(self, news_client: INewsClient):
        self.client = news_client
    
    # Similar structure
    pass
```

#### Analysis Tools
```python
class ContentAnalysisTool(ITool):
    def __init__(self, nlp_service: INLPService):
        self.nlp_service = nlp_service
    
    async def execute(self, request: ToolRequest) -> ToolResponse:
        # Sentiment analysis, entity extraction, summarization
        pass

class CitationAnalysisTool(ITool):
    def __init__(self, citation_service: ICitationService):
        self.citation_service = citation_service
    
    async def execute(self, request: ToolRequest) -> ToolResponse:
        # Citation network analysis, impact assessment
        pass
```

### 4. Services Layer (`services/`)

#### LLM Service
```python
class ILLMService(ABC):
    @abstractmethod
    async def generate_response(
        self, 
        prompt: str, 
        context: Optional[str] = None,
        model: str = "default"
    ) -> LLMResponse:
        pass

class LLMService(ILLMService):
    def __init__(self, providers: Dict[str, ILLMProvider]):
        self.providers = providers
    
    async def generate_response(self, prompt: str, **kwargs) -> LLMResponse:
        # Route to appropriate provider based on model
        pass
```

#### Context Management Service
```python
class IContextManager(ABC):
    @abstractmethod
    async def store_context(self, session_id: str, context: Dict[str, Any]) -> None:
        pass
    
    @abstractmethod
    async def retrieve_context(self, session_id: str) -> Optional[Dict[str, Any]]:
        pass

class ContextManager(IContextManager):
    def __init__(self, storage: IContextStorage):
        self.storage = storage
    
    # Implementation with memory management, chunking, relevance scoring
```

#### Tool Management Service
```python
class IToolManager(ABC):
    @abstractmethod
    async def execute_tool(self, tool_name: str, request: ToolRequest) -> ToolResponse:
        pass
    
    @abstractmethod
    def list_available_tools(self) -> List[str]:
        pass

class ToolManager(IToolManager):
    def __init__(self, tools: Dict[str, ITool]):
        self.tools = tools
    
    async def execute_tool(self, tool_name: str, request: ToolRequest) -> ToolResponse:
        if tool_name not in self.tools:
            raise ToolNotFoundError(f"Tool '{tool_name}' not found")
        
        tool = self.tools[tool_name]
        if not tool.validate_parameters(request.parameters):
            raise InvalidParametersError(f"Invalid parameters for tool '{tool_name}'")
        
        return await tool.execute(request)
```

### 5. Infrastructure Layer (`infrastructure/`)

#### External Service Clients
```python
class ISemanticScholarClient(ABC):
    @abstractmethod
    async def search_papers(self, query: str, **kwargs) -> List[Dict[str, Any]]:
        pass

class SemanticScholarClient(ISemanticScholarClient):
    def __init__(self, api_key: str, rate_limiter: IRateLimiter):
        self.api_key = api_key
        self.rate_limiter = rate_limiter
    
    # Clean implementation with proper error handling and retries
```

#### Rate Limiting and Caching
```python
class IRateLimiter(ABC):
    @abstractmethod
    async def acquire(self, resource: str) -> None:
        pass

class ICache(ABC):
    @abstractmethod
    async def get(self, key: str) -> Optional[Any]:
        pass
    
    @abstractmethod
    async def set(self, key: str, value: Any, ttl: int = 3600) -> None:
        pass
```

### 6. Configuration Management (`config/`)

```python
from pydantic import BaseSettings
from typing import Dict, List

class DatabaseConfig(BaseSettings):
    host: str
    port: int
    username: str
    password: str
    database: str

class LLMProviderConfig(BaseSettings):
    name: str
    api_key: str
    base_url: str
    model: str
    max_tokens: int = 4000
    temperature: float = 0.7

class ResearchAgentConfig(BaseSettings):
    max_iterations: int = 10
    timeout: int = 300
    default_tools: List[str] = ["web_search", "academic_search"]
    cache_ttl: int = 3600
    
    llm_providers: Dict[str, LLMProviderConfig]
    database: DatabaseConfig
    
    class Config:
        env_file = ".env"
        env_nested_delimiter = "__"
```

### 7. Middleware (`middleware/`)

#### Error Handling Middleware
```python
class ErrorHandlingMiddleware:
    async def __call__(self, request, call_next):
        try:
            response = await call_next(request)
            return response
        except Exception as e:
            logger.error('Error occurred', {'error': str(e), 'request_id': request.state.request_id})
            return JSONResponse(
                status_code=500,
                content={"error": "Internal server error", "request_id": request.state.request_id}
            )
```

#### Logging Middleware
```python
class LoggingMiddleware:
    async def __call__(self, request, call_next):
        start_time = time.time()
        
        logger.info('Request started', {
            'method': request.method,
            'path': request.url.path,
            'request_id': request.state.request_id
        })
        
        response = await call_next(request)
        
        logger.info('Request completed', {
            'status_code': response.status_code,
            'duration': time.time() - start_time,
            'request_id': request.state.request_id
        })
        
        return response
```

### 8. API Layer (`api/`)

#### FastAPI Routes
```python
from fastapi import APIRouter, Depends, HTTPException
from dependency_injector.wiring import Provide, inject

router = APIRouter(prefix="/research", tags=["research"])

@router.post("/query", response_model=AgentResponse)
@inject
async def research_query(
    request: AgentRequest,
    agent: IAgent = Depends(Provide["research_agent"])
) -> AgentResponse:
    try:
        return await agent.execute(request)
    except Exception as e:
        logger.error('Research query failed', {'error': str(e)})
        raise HTTPException(status_code=500, detail="Research query failed")

@router.get("/tools", response_model=List[str])
@inject
async def list_tools(
    tool_manager: IToolManager = Depends(Provide["tool_manager"])
) -> List[str]:
    return tool_manager.list_available_tools()
```

## Implementation Strategy

### Phase 1: Core Infrastructure (Week 1-2)
1. Set up project structure and dependency injection
2. Implement core interfaces and abstractions
3. Create configuration management system
4. Set up logging and error handling middleware

### Phase 2: Basic Tools (Week 3-4)
1. Implement basic search tools (web, academic, news)
2. Create tool manager and basic tool registry
3. Implement rate limiting and caching infrastructure
4. Add basic LLM service integration

### Phase 3: Research Agent (Week 5-6)
1. Implement core research agent with strategy pattern
2. Create academic and general research strategies
3. Integrate context management and memory
4. Add comprehensive error handling and recovery

### Phase 4: Advanced Features (Week 7-8)
1. Implement advanced analysis tools
2. Add multi-modal search capabilities
3. Create agent orchestration for complex queries
4. Optimize performance and add monitoring

### Phase 5: Integration & Testing (Week 9-10)
1. Integrate with existing C# backend
2. Comprehensive testing and validation
3. Performance optimization
4. Documentation and deployment guides

## Extension Points for Future Agents

### Agent Factory Pattern
```python
class AgentFactory:
    def __init__(self, container: Container):
        self.container = container
    
    def create_agent(self, agent_type: str, config: Dict[str, Any]) -> IAgent:
        if agent_type == "research":
            return self.container.research_agent()
        elif agent_type == "summarization":
            return self.container.summarization_agent()
        elif agent_type == "analysis":
            return self.container.analysis_agent()
        else:
            raise UnsupportedAgentTypeError(f"Agent type '{agent_type}' not supported")
```

### Plugin System for Tools
```python
class ToolRegistry:
    def __init__(self):
        self.tools: Dict[str, Type[ITool]] = {}
    
    def register_tool(self, tool_class: Type[ITool]) -> None:
        instance = tool_class()
        self.tools[instance.name] = tool_class
    
    def create_tool(self, name: str, **kwargs) -> ITool:
        if name not in self.tools:
            raise ToolNotFoundError(f"Tool '{name}' not registered")
        return self.tools[name](**kwargs)
```

## Benefits of New Architecture

1. **Modularity**: Each component has a single responsibility
2. **Testability**: All dependencies are injected and mockable
3. **Extensibility**: New agents and tools can be added without modifying existing code
4. **Maintainability**: Clear separation of concerns and well-defined interfaces
5. **Performance**: Optimized caching, rate limiting, and resource management
6. **Reliability**: Comprehensive error handling and recovery mechanisms
7. **Observability**: Built-in logging, metrics, and monitoring
8. **Scalability**: Designed to handle increased load and complexity

## Integration with C# Backend

### API Gateway Pattern
The C# backend will continue to serve as the API gateway, with the new research agent service being one of many specialized microservices:

```csharp
// C# Backend - Research Service Client
public interface IResearchService
{
    Task<ResearchResponse> ExecuteResearchQuery(ResearchRequest request);
    Task<List<string>> GetAvailableTools();
}

public class ResearchService : IResearchService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ResearchService> _logger;
    
    public ResearchService(HttpClient httpClient, ILogger<ResearchService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }
    
    public async Task<ResearchResponse> ExecuteResearchQuery(ResearchRequest request)
    {
        var response = await _httpClient.PostAsJsonAsync("/research/query", request);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ResearchResponse>();
    }
}
```

### Event-Driven Architecture
Use events for loose coupling between services:

```python
class ResearchCompletedEvent:
    def __init__(self, session_id: str, result: AgentResponse):
        self.session_id = session_id
        self.result = result
        self.timestamp = datetime.utcnow()

class EventPublisher:
    async def publish(self, event: Any) -> None:
        # Publish to message queue or event stream
        pass
```

## Security Considerations

1. **API Key Management**: Secure storage and rotation of external API keys
2. **Rate Limiting**: Prevent abuse and manage costs
3. **Input Validation**: Sanitize all inputs to prevent injection attacks
4. **Authentication**: Integrate with existing C# backend auth system
5. **Audit Logging**: Track all research queries and tool usage

## Monitoring and Observability

1. **Structured Logging**: Use structured logs with correlation IDs
2. **Metrics**: Track performance, success rates, and tool usage
3. **Health Checks**: Monitor service health and dependencies
4. **Distributed Tracing**: Track requests across service boundaries

## Conclusion

This architecture provides a solid foundation for building a clean, maintainable, and extensible research agent system. The modular design allows for easy addition of new agent types and tools while maintaining high code quality and performance. The clear separation of concerns and dependency injection make the system highly testable and maintainable.

The staged implementation approach ensures that we can deliver value incrementally while building towards the full vision. The extension points and plugin system provide a clear path for future expansion without requiring major architectural changes. 