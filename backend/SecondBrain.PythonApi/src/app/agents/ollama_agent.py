from typing import Dict, Any, Optional, List
from .core.base_agent import BaseAgent
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from app.config.settings import settings
import time
import logging
import json
import socket
import os
import platform

logger = logging.getLogger(__name__)

class OllamaAPIError(Exception):
    """Raised when Ollama API returns an error response"""
    pass

class OllamaExecutionError(Exception):
    """Raised when there's an error executing the Ollama model"""
    pass

class OllamaAgent(BaseAgent):
    """Agent for interacting with local Ollama models"""
    
    def __init__(self, model_id: str, temperature: float = 0.7):
        super().__init__(model_id, temperature)  # Pass temperature to parent
        self._temperature = temperature  # Store temperature locally
        self.base_url = self._get_ollama_url()
        self.session = self._create_session()
        
    def _get_ollama_url(self) -> str:
        """Get the appropriate Ollama URL based on environment"""
        base_url = settings.OLLAMA_BASE_URL
        
        # Try localhost first
        try:
            test_url = "http://localhost:11434"
            response = requests.get(f"{test_url}/api/version", timeout=2)
            if response.status_code == 200:
                logger.info("Found Ollama running on localhost")
                return test_url
        except:
            pass
            
        # Try configured URL
        try:
            response = requests.get(f"{base_url}/api/version", timeout=2)
            if response.status_code == 200:
                logger.info(f"Found Ollama running at {base_url}")
                return base_url
        except:
            pass
            
        # Try host.docker.internal for Docker environments
        try:
            docker_url = "https://host.docker.internal:11434"
            response = requests.get(f"{docker_url}/api/version", timeout=2)
            if response.status_code == 200:
                logger.info("Found Ollama running on Docker host")
                return docker_url
        except:
            pass
            
        # If all else fails, return the configured URL
        logger.warning(f"Could not verify Ollama URL, using configured URL: {base_url}")
        return base_url
    
    def _create_session(self):
        """Create a requests session with retry strategy"""
        session = requests.Session()
        
        # Configure retry strategy
        retries = Retry(
            total=3,  # Reduced from 5 to fail faster
            backoff_factor=0.1,
            status_forcelist=[500, 502, 503, 504],
            allowed_methods=["GET", "POST"]  # Allow GET for health checks
        )
        
        # Create adapter with retry strategy
        adapter = HTTPAdapter(max_retries=retries)
        session.mount("https://", adapter)
        
        return session
    
    def _check_ollama_health(self) -> bool:
        """Check if Ollama server is healthy"""
        try:
            response = self.session.get(f"{self.base_url}/api/version", timeout=2)
            return response.status_code == 200
        except:
            return False
    
    def _get_source_ip(self):
        """Get the source IP that can reach the target"""
        try:
            # Try to parse host from URL
            host = self.base_url.split("//")[1].split(":")[0]
            
            # If localhost or docker.internal, return None
            if host in ["localhost", "host.docker.internal", "127.0.0.1"]:
                return None
                
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect((host, 11434))
            local_ip = s.getsockname()[0]
            s.close()
            
            logger.info(f"Using source IP: {local_ip}")
            return local_ip
        except Exception as e:
            logger.warning(f"Failed to determine source IP: {str(e)}")
            return None
            
    async def _execute_model(self, kwargs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the Ollama model with given parameters"""
        try:
            # Check Ollama health first
            if not self._check_ollama_health():
                raise OllamaExecutionError(
                    f"Ollama server at {self.base_url} is not responding. "
                    "Please check if the server is running."
                )
            
            prompt = kwargs.get("prompt", "")
            context = kwargs.get("context", {})
            
            # Get temperature from kwargs or use default
            temp = kwargs.get("temperature", self._temperature)
            
            # Format system message and context
            system_message = (
                "You are a helpful AI assistant that provides accurate and well-structured responses. "
                "Maintain context of the conversation and refer back to previous messages when relevant."
            )
            
            # Format conversation history with clear role labels
            context_text = ""
            if context and "conversation" in context:
                # Split conversation into individual messages
                messages = context["conversation"].split("\n")
                formatted_messages = []
                
                for msg in messages:
                    if msg.strip():
                        # Properly format each message with clear role labels
                        if msg.startswith("User:"):
                            formatted_messages.append(f"Human: {msg[5:].strip()}")
                        elif msg.startswith("Assistant:"):
                            formatted_messages.append(f"Assistant: {msg[10:].strip()}")
                        else:
                            formatted_messages.append(msg)
                
                context_text = "\n".join(formatted_messages)
                logger.info(f"Formatted context: {context_text}")
            
            # Construct the full prompt with clear sections
            full_prompt = (
                f"{system_message}\n\n"
                f"Previous conversation:\n{context_text}\n\n"
                f"Human: {prompt}\n"
                f"Assistant:"
            )
            
            start_time = time.time()
            source_ip = self._get_source_ip()
            if source_ip:
                os.environ["SOURCE_IP"] = source_ip
            
            headers = {
                "Content-Type": "application/json",
                "Accept": "*/*",
                "Connection": "keep-alive"
            }
            
            # Prepare the payload with formatted prompt
            payload = {
                "model": self.model_id,
                "prompt": full_prompt,
                "options": {
                    "temperature": temp,
                    "num_predict": -1,
                    "stop": ["Human:", "Assistant:"]  # Add stop sequences
                }
            }
            
            try:
                logger.info(f"Sending request to {self.base_url}/api/generate")
                logger.info(f"Payload: {json.dumps(payload, indent=2)}")
                
                response = self.session.post(
                    f"{self.base_url}/api/generate",
                    headers=headers,
                    json=payload,
                    stream=True,
                    timeout=30
                )
                response.raise_for_status()
                
                full_response = ""
                prompt_tokens = completion_tokens = 0
                
                for line in response.iter_lines():
                    text, p_tokens, c_tokens, is_done = await self._process_response_line(line)
                    full_response += text
                    prompt_tokens = p_tokens or prompt_tokens
                    completion_tokens = c_tokens or completion_tokens
                    
                    if is_done:
                        break
                
                total_tokens = prompt_tokens + completion_tokens
                execution_time = time.time() - start_time
                
                logger.info("Successfully received response from Ollama")
                logger.info(f"Token usage - Prompt: {prompt_tokens}, Completion: {completion_tokens}, Total: {total_tokens}")
                
                return {
                    "result": full_response,
                    "metadata": {
                        "model": self.model_id,
                        "execution_time": execution_time,
                        "token_usage": {
                            "prompt_tokens": prompt_tokens,
                            "completion_tokens": completion_tokens,
                            "total_tokens": total_tokens
                        },
                        "prompt": prompt,
                        "temperature": self.temperature,
                        "provider": "ollama",
                        "source_ip": source_ip
                    }
                }
                
            except requests.exceptions.RequestException as e:
                self._handle_connection_error(e)
            except Exception as e:
                logger.error(f"Unexpected error: {str(e)}")
                raise OllamaExecutionError(f"Failed to execute Ollama model: {str(e)}")
            finally:
                if "SOURCE_IP" in os.environ:
                    del os.environ["SOURCE_IP"]
                    
        except Exception as e:
            logger.error(f"Error in execute: {str(e)}")
            raise

    async def process_message(
        self,
        message: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Process a user message and generate a response"""
        try:
            # Add message to conversation memory before processing
            self.conversation_memory.add_message(message, "user", metadata)
            
            # Get conversation history
            history = self.conversation_memory.get_history()
            
            # Format conversation history with proper role labels
            formatted_messages = []
            for msg in history:
                role = msg['role']
                content = msg['content']
                
                # Format based on role
                if role == "user":
                    formatted_messages.append(f"Human: {content}")
                elif role == "assistant":
                    formatted_messages.append(f"Assistant: {content}")
            
            conversation = "\n".join(formatted_messages)
            logger.info(f"Conversation history:\n{conversation}")
            
            # Execute with context
            result = await self._execute_model(
                {
                    "prompt": message,
                    "context": {
                        "conversation": conversation,
                        "metadata": metadata or {}
                    }
                }
            )
            
            # Add response to conversation memory after processing
            if isinstance(result, dict) and "result" in result:
                self.conversation_memory.add_message(
                    result["result"],
                    "assistant",
                    result.get("metadata")
                )
                logger.info("Added response to conversation memory")
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            raise

    @property
    def temperature(self) -> float:
        """Get the temperature setting"""
        return self._temperature

    async def _process_response_line(self, line) -> tuple[str, int, int, bool]:
        """Process a single line of streaming response"""
        response_text = ""
        prompt_tokens = completion_tokens = 0
        is_done = False
        
        if not line:
            return response_text, prompt_tokens, completion_tokens, is_done
            
        try:
            json_response = json.loads(line)
            response_text = json_response.get("response", "")
            prompt_tokens = json_response.get("prompt_eval_count", 0)
            completion_tokens = json_response.get("eval_count", 0)
            is_done = json_response.get("done", False)
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {str(e)}")
            
        return response_text, prompt_tokens, completion_tokens, is_done