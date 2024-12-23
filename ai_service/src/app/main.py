from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.models.agent_models import AgentRequest, AgentResponse
from app.agents.agent_factory import AgentFactory
from app.config.settings import settings
import logging
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="SecondBrain AI Service")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5127"],  # Your C# backend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "ai-service"}

@app.get("/agent/types")
async def get_agent_types():
    """Get available agent types"""
    return {
        "specialized_agents": AgentFactory.get_registered_specialized_agents(),
        "base_providers": AgentFactory.get_registered_providers()
    }

@app.post("/agent/execute", response_model=AgentResponse)
async def execute_agent(request: AgentRequest):
    """Execute an AI agent with the given parameters"""
    start_time = time.time()
    request_id = f"req_{int(start_time)}"
    
    try:
        logger.info(f"[{request_id}] Starting {request.agent_type} agent execution with model: {request.model_id}")
        
        # Create agent with specified type
        agent = AgentFactory.create_agent(
            model_id=request.model_id,
            temperature=request.temperature or 0.7,
            agent_type=request.agent_type
        )
        
        # Execute with tools if provided
        if request.tools:
            logger.info(f"[{request_id}] Executing with {len(request.tools)} tools")
            result = await agent.execute(
                prompt=request.prompt,
                tools=request.tools,
                max_tokens=request.max_tokens
            )
        else:
            result = await agent.execute(
                prompt=request.prompt,
                max_tokens=request.max_tokens
            )
        
        # Validate response
        if not await agent.validate_response(result):
            raise HTTPException(
                status_code=500,
                detail="Agent response validation failed"
            )
        
        # Calculate execution time
        execution_time = time.time() - start_time
        logger.info(f"[{request_id}] Execution completed in {execution_time:.2f}s")
        
        # Add execution metrics to metadata
        if isinstance(result, dict) and "metadata" in result:
            result["metadata"]["request_id"] = request_id
            result["metadata"]["total_execution_time"] = execution_time
            result["metadata"]["agent_type"] = request.agent_type
        
        return AgentResponse(
            result=result["result"],
            metadata=result["metadata"]
        )
        
    except Exception as e:
        logger.error(f"[{request_id}] Error executing agent: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "service": "SecondBrain AI Service",
        "version": "1.0.0",
        "docs_url": "/docs",
        "health_check": "/health",
        "agent_types": "/agent/types"
    }