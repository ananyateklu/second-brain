# SecondBrain Research Agent

A clean, modular, and highly extensible research agent that provides advanced AI-powered research capabilities for the SecondBrain application.

## Features

- 🔍 **Multi-strategy Research**: Academic, technical, market, and general research strategies
- 🛠️ **Composable Tools**: Independent, reusable tools for search, analysis, and synthesis
- 🚀 **High Performance**: Async execution with intelligent caching and parallel processing
- 🔒 **Production Ready**: Comprehensive error handling, rate limiting, and monitoring
- 🧪 **Fully Tested**: 85%+ test coverage with unit, integration, and E2E tests
- 📊 **Observable**: Structured logging, metrics, and distributed tracing

## Quick Start

### Prerequisites

- Python 3.11+
- Redis (for caching)
- PostgreSQL (optional, for persistent storage)

### Installation

1. **Clone the repository** (if not already done):
   ```bash
   cd backend/SecondBrain.ResearchAgent
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -e .
   ```

4. **Install development dependencies** (optional):
   ```bash
   pip install -e ".[dev]"
   ```

### Configuration

1. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

2. **Configure your API keys** in `.env`:
   ```env
   OPENAI_API_KEY=your_openai_key_here
   ANTHROPIC_API_KEY=your_anthropic_key_here
   REDIS_URL=redis://localhost:6379
   ```

### Running the Service

1. **Start the development server**:
   ```bash
   python -m uvicorn app.main:app --reload --port 8001
   ```

2. **Access the API documentation**:
   - OpenAPI/Swagger: http://localhost:8001/docs
   - ReDoc: http://localhost:8001/redoc

3. **Health check**:
   ```bash
   curl http://localhost:8001/health
   ```

## API Endpoints

The research agent maintains compatibility with the existing SecondBrain Python API:

- `GET /health` - Health check
- `GET /agent/types` - Get available agent types
- `POST /agent/execute` - Execute research agent
- `GET /` - API information

### Example Usage

```python
import httpx

# Execute a research query
response = httpx.post("http://localhost:8001/agent/execute", json={
    "prompt": "Latest developments in transformer architecture",
    "model_id": "gpt-4",
    "agent_type": "academic",
    "tools": ["academic_search", "web_search"]
})

result = response.json()
print(result["result"])
```

## Architecture

The research agent follows a clean, modular architecture:

```
app/
├── core/                   # Core abstractions and interfaces
├── agents/                 # Agent implementations
├── tools/                  # Composable research tools
├── services/               # Business logic services
├── infrastructure/         # External integrations
├── config/                 # Configuration management
├── middleware/             # Cross-cutting concerns
└── api/                   # FastAPI routes and controllers
```

## Development

### Code Quality

```bash
# Format code
black app/ tests/
isort app/ tests/

# Lint code
flake8 app/ tests/
mypy app/

# Security scan
bandit -r app/
```

### Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_research_agent.py
```

### Adding New Tools

1. **Implement the tool interface**:
   ```python
   from app.core.interfaces import ITool, ToolCategory

   class MyCustomTool(ITool):
       @property
       def name(self) -> str:
           return "my_custom_tool"
       
       @property
       def category(self) -> ToolCategory:
           return ToolCategory.SEARCH
       
       async def execute(self, request: ToolRequest) -> ToolResponse:
           # Your implementation here
           pass
   ```

2. **Register the tool**:
   ```python
   # In app/config/container.py
   container.tool_registry().register_tool(MyCustomTool())
   ```

## Integration with C# Backend

The research agent integrates seamlessly with the existing C# backend:

```csharp
// C# Backend Service
services.AddHttpClient<IResearchService, ResearchService>(client =>
{
    client.BaseAddress = new Uri("http://localhost:8001");
});

// Usage
var result = await _researchService.ExecuteResearchQuery(new ResearchRequest
{
    Prompt = "Your research question",
    ModelId = "gpt-4",
    AgentType = "academic"
});
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 