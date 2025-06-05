"""Test script for LLM services."""

import asyncio
import os
from app.services.llm import LLMFactory
from app.core.models import LLMRequest

async def test_llm_services():
    """Test different LLM services."""
    
    # Test prompt
    test_prompt = "What are the key principles of effective research methodology?"
    
    print("🔬 Testing LLM Services")
    print("=" * 50)
    
    # Test OpenAI
    if os.getenv("OPENAI_API_KEY"):
        print("\n🤖 Testing OpenAI Service...")
        try:
            openai_service = LLMFactory.create_service("openai")
            request = LLMRequest(
                prompt=test_prompt,
                model="gpt-3.5-turbo",
                system_prompt="You are a research expert. Provide concise, structured answers.",
                temperature=0.7,
                max_tokens=500,
                agent_type="research"
            )
            
            response = await openai_service.generate_response(request)
            print(f"✅ OpenAI Response (Model: {response.model}):")
            print(f"📊 Tokens: {response.token_usage.total_tokens if response.token_usage else 'N/A'}")
            print(f"📝 Content: {response.content[:200]}...")
            
        except Exception as e:
            print(f"❌ OpenAI Error: {e}")
    else:
        print("⚠️ OpenAI API key not found")
    
    # Test Anthropic
    if os.getenv("ANTHROPIC_API_KEY"):
        print("\n🏛️ Testing Anthropic Service...")
        try:
            anthropic_service = LLMFactory.create_service("anthropic")
            request = LLMRequest(
                prompt=test_prompt,
                model="claude-3-5-haiku-20241022",
                system_prompt="You are a research expert. Provide concise, structured answers.",
                temperature=0.7,
                max_tokens=500,
                agent_type="research"
            )
            
            response = await anthropic_service.generate_response(request)
            print(f"✅ Anthropic Response (Model: {response.model}):")
            print(f"📊 Tokens: {response.token_usage.total_tokens if response.token_usage else 'N/A'}")
            print(f"📝 Content: {response.content[:200]}...")
            
        except Exception as e:
            print(f"❌ Anthropic Error: {e}")
    else:
        print("⚠️ Anthropic API key not found")
    
    # Test Gemini
    if os.getenv("GEMINI_API_KEY"):
        print("\n💎 Testing Gemini Service...")
        try:
            gemini_service = LLMFactory.create_service("gemini")
            request = LLMRequest(
                prompt=test_prompt,
                model="gemini-1.5-flash",
                system_prompt="You are a research expert. Provide concise, structured answers.",
                temperature=0.7,
                max_tokens=500,
                agent_type="research"
            )
            
            response = await gemini_service.generate_response(request)
            print(f"✅ Gemini Response (Model: {response.model}):")
            print(f"📊 Tokens: {response.token_usage.total_tokens if response.token_usage else 'N/A'}")
            print(f"📝 Content: {response.content[:200]}...")
            
        except Exception as e:
            print(f"❌ Gemini Error: {e}")
    else:
        print("⚠️ Gemini API key not found")
    
    # Test Grok
    if os.getenv("GROK_API_KEY"):
        print("\n🚀 Testing Grok Service...")
        try:
            grok_service = LLMFactory.create_service("grok")
            request = LLMRequest(
                prompt=test_prompt,
                model="grok-beta",
                system_prompt="You are a research expert. Provide concise, structured answers.",
                temperature=0.7,
                max_tokens=500,
                agent_type="research"
            )
            
            response = await grok_service.generate_response(request)
            print(f"✅ Grok Response (Model: {response.model}):")
            print(f"📊 Tokens: {response.token_usage.total_tokens if response.token_usage else 'N/A'}")
            print(f"📝 Content: {response.content[:200]}...")
            
        except Exception as e:
            print(f"❌ Grok Error: {e}")
    else:
        print("⚠️ Grok API key not found")
    
    # Test Ollama
    print("\n🦙 Testing Ollama Service...")
    try:
        ollama_service = LLMFactory.create_service("ollama")
        
        # First check health
        health = await ollama_service.check_health()
        print(f"🏥 Ollama Health: {health.get('status')}")
        
        if health.get("status") == "healthy":
            available_models = await ollama_service.get_available_models()
            print(f"📋 Available models: {available_models[:3]}...")  # Show first 3
            
            if available_models:
                test_model = available_models[0]  # Use first available model
                request = LLMRequest(
                    prompt="What is machine learning? (brief answer)",
                    model=test_model,
                    system_prompt="You are a helpful assistant. Be concise.",
                    temperature=0.7,
                    max_tokens=200,
                    agent_type="research"
                )
                
                response = await ollama_service.generate_response(request)
                print(f"✅ Ollama Response (Model: {response.model}):")
                print(f"📊 Tokens: {response.token_usage.total_tokens if response.token_usage else 'N/A'}")
                print(f"📝 Content: {response.content[:200]}...")
            else:
                print("⚠️ No models available in Ollama")
        else:
            print(f"❌ Ollama not healthy: {health.get('error')}")
            
    except Exception as e:
        print(f"❌ Ollama Error: {e}")
    
    # Test Multi-Provider Service
    print("\n🌐 Testing Multi-Provider Service...")
    try:
        providers = []
        if os.getenv("OPENAI_API_KEY"):
            providers.append("openai")
        if os.getenv("ANTHROPIC_API_KEY"):
            providers.append("anthropic")
        if os.getenv("GEMINI_API_KEY"):
            providers.append("gemini")
        if os.getenv("GROK_API_KEY"):
            providers.append("grok")
        
        # Always try Ollama
        try:
            ollama_service = LLMFactory.create_service("ollama")
            health = await ollama_service.check_health()
            if health.get("status") == "healthy":
                providers.append("ollama")
        except:
            pass
        
        if providers:
            multi_service = LLMFactory.create_multi_provider_service(providers)
            print(f"✅ Multi-provider service created with: {providers}")
            print(f"📋 Available models: {len(multi_service.get_available_models())} models")
            
            # Test with a GPT model
            if "openai" in providers:
                request = LLMRequest(
                    prompt="Briefly explain machine learning.",
                    model="gpt-3.5-turbo",
                    agent_type="research"
                )
                response = await multi_service.generate_response(request)
                print(f"✅ Multi-provider response: {response.content[:100]}...")
        else:
            print("⚠️ No API keys available for multi-provider service")
            
    except Exception as e:
        print(f"❌ Multi-provider Error: {e}")
    
    print("\n" + "=" * 50)
    print("🏁 LLM Service Testing Complete")

if __name__ == "__main__":
    asyncio.run(test_llm_services())