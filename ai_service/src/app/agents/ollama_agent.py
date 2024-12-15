from typing import Dict, Any
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from .base_agent import BaseAgent
from app.config.settings import settings
import time
import logging
import json
import socket
import os

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
        super().__init__(model_id, temperature)
        self.base_url = settings.OLLAMA_BASE_URL
        self.session = self._create_session()
        
    def _create_session(self):
        """Create a requests session with retry strategy"""
        session = requests.Session()
        
        # Configure retry strategy
        retries = Retry(
            total=5,
            backoff_factor=0.1,
            status_forcelist=[500, 502, 503, 504],
            allowed_methods=["POST"]
        )
        
        # Create adapter with retry strategy
        adapter = HTTPAdapter(max_retries=retries)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        
        return session
    
    def _get_source_ip(self):
        """Get the source IP that can reach the target"""
        try:
            # Create a socket to test connection
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            
            # Try to connect (this won't actually establish a connection for UDP)
            s.connect((self.base_url.split("//")[1].split(":")[0], 11434))
            
            # Get the local IP address that would be used
            local_ip = s.getsockname()[0]
            s.close()
            
            logger.info(f"Using source IP: {local_ip}")
            return local_ip
        except Exception as e:
            logger.warning(f"Failed to determine source IP: {str(e)}")
            return None
            
    async def execute(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Execute a prompt using an Ollama model"""
        start_time = time.time()
        
        # Get source IP
        source_ip = self._get_source_ip()
        if source_ip:
            os.environ["SOURCE_IP"] = source_ip
        
        # Simple headers
        headers = {
            "Content-Type": "application/json",
            "Accept": "*/*",
            "Connection": "keep-alive"
        }
        
        # Payload with token counting enabled
        payload = {
            "model": self.model_id,
            "prompt": prompt,
            "options": {
                "num_predict": -1  # Enable token counting
            }
        }
        
        try:
            logger.info(f"Sending request to {self.base_url}/api/generate")
            logger.info(f"Payload: {json.dumps(payload, indent=2)}")
            
            # Use session for better connection handling
            response = self.session.post(
                f"{self.base_url}/api/generate",
                headers=headers,
                json=payload,
                stream=True,
                timeout=30
            )
            response.raise_for_status()
            
            # Process streaming response
            full_response = ""
            prompt_tokens = 0
            completion_tokens = 0
            total_tokens = 0
            
            for line in response.iter_lines():
                if line:
                    try:
                        json_response = json.loads(line)
                        full_response += json_response.get("response", "")
                        
                        # Extract token information
                        if "prompt_eval_count" in json_response:
                            prompt_tokens = json_response["prompt_eval_count"]
                        if "eval_count" in json_response:
                            completion_tokens = json_response["eval_count"]
                        
                        if json_response.get("done", False):
                            total_tokens = prompt_tokens + completion_tokens
                            break
                    except json.JSONDecodeError as e:
                        logger.error(f"Failed to parse JSON response: {str(e)}")
                        continue
            
            logger.info("Successfully received response from Ollama")
            logger.info(f"Token usage - Prompt: {prompt_tokens}, Completion: {completion_tokens}, Total: {total_tokens}")
            
            # Calculate execution time
            execution_time = time.time() - start_time
            
            # Format the response with token usage
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
            logger.error(f"Connection error: {str(e)}")
            # Try to get more network diagnostic information
            try:
                import subprocess
                result = subprocess.run(['netstat', '-rn'], capture_output=True, text=True)
                logger.error(f"Network routes:\n{result.stdout}")
            except Exception as ne:
                logger.error(f"Failed to get network info: {str(ne)}")
                
            raise OllamaExecutionError(
                f"Failed to connect to Ollama server at {self.base_url}. "
                f"Please check:\n"
                f"1. The Ollama server is running\n"
                f"2. The URL {self.base_url} is correct\n"
                f"3. Your firewall settings allow the connection\n"
                f"4. The network can reach the server\n"
                f"Error: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            raise OllamaExecutionError(f"Failed to execute Ollama model: {str(e)}")
        finally:
            # Clean up environment variable
            if "SOURCE_IP" in os.environ:
                del os.environ["SOURCE_IP"]
    
    async def validate_response(self, response: Any) -> bool:
        """Validate the response from the Ollama model"""
        if not response or not isinstance(response, dict):
            return False
        
        required_fields = ["result", "metadata"]
        return all(field in response for field in required_fields)