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

    def _handle_connection_error(self, e: requests.exceptions.RequestException):
        """Handle connection errors with detailed diagnostics"""
        logger.error(f"Connection error: {str(e)}")
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
            
    async def execute(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Execute a prompt using an Ollama model"""
        start_time = time.time()
        source_ip = self._get_source_ip()
        if source_ip:
            os.environ["SOURCE_IP"] = source_ip
        
        headers = {
            "Content-Type": "application/json",
            "Accept": "*/*",
            "Connection": "keep-alive"
        }
        
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
    
    async def validate_response(self, response: Any) -> bool:
        """Validate the response from the Ollama model"""
        if not response or not isinstance(response, dict):
            return False
        
        required_fields = ["result", "metadata"]
        return all(field in response for field in required_fields)