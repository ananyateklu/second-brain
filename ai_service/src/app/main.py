from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from app.models.agent_models import AgentRequest, AgentResponse
from app.agents.research_agent import ResearchAgent
from app.config.settings import settings

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

@app.post("/agent/execute", response_model=AgentResponse)
async def execute_agent(request: AgentRequest):
    """Execute an AI agent with the given parameters"""
    try:
        # Create research agent (it will internally select the appropriate model)
        agent = ResearchAgent(
            model_id=request.model_id,
            temperature=request.temperature or 0.7
        )
        
        result = await agent.execute(
            prompt=request.prompt,
            max_tokens=request.max_tokens
        )
        
        return AgentResponse(
            result=result["result"],
            metadata=result["metadata"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "service": "SecondBrain AI Service",
        "version": "1.0.0",
        "docs_url": "/docs",
        "health_check": "/health"
    }