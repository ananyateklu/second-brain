from typing import Dict, Any, List, Optional, Union
import logging
import tiktoken
from ..core.agent_exceptions import TokenError
from ..utils.logging_utils import log_api_call

logger = logging.getLogger(__name__)

class TokenCounter:
    """Token counting and tracking"""
    
    # Token costs per model
    TOKEN_COSTS = {
        "gpt-4": {
            "prompt": 0.03,  # per 1K tokens
            "completion": 0.06  # per 1K tokens
        },
        "gpt-3.5-turbo": {
            "prompt": 0.0015,
            "completion": 0.002
        },
        "text-embedding-ada-002": {
            "prompt": 0.0001,
            "completion": 0.0
        },
        "claude-3-5-sonnet-latest": {
            "prompt": 0.01102,
            "completion": 0.03268
        }
    }
    
    def __init__(self):
        self.encoders = {}
        self.usage = {
            "total_tokens": 0,
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_cost": 0.0,
            "models": {}
        }
        
    @log_api_call
    def count_tokens(
        self,
        text: Union[str, List[str], Dict[str, Any]],
        model: str = "gpt-3.5-turbo"
    ) -> int:
        """Count tokens in text"""
        try:
            # Get encoder for model
            encoder = self._get_encoder(model)
            
            # Handle different input types
            if isinstance(text, str):
                return len(encoder.encode(text))
            elif isinstance(text, list):
                return sum(len(encoder.encode(str(item))) for item in text)
            elif isinstance(text, dict):
                return sum(
                    len(encoder.encode(str(v)))
                    for v in text.values()
                )
            else:
                raise TokenError(f"Unsupported input type: {type(text)}")
                
        except Exception as e:
            error_msg = f"Token counting failed: {str(e)}"
            logger.error(error_msg)
            raise TokenError(error_msg)
            
    def track_usage(
        self,
        prompt_tokens: int,
        completion_tokens: int,
        model: str
    ) -> None:
        """Track token usage and cost"""
        try:
            # Update total counts
            self.usage["prompt_tokens"] += prompt_tokens
            self.usage["completion_tokens"] += completion_tokens
            self.usage["total_tokens"] += prompt_tokens + completion_tokens
            
            # Update model-specific counts
            if model not in self.usage["models"]:
                self.usage["models"][model] = {
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "total_tokens": 0,
                    "cost": 0.0
                }
                
            model_usage = self.usage["models"][model]
            model_usage["prompt_tokens"] += prompt_tokens
            model_usage["completion_tokens"] += completion_tokens
            model_usage["total_tokens"] += prompt_tokens + completion_tokens
            
            # Calculate costs
            if model in self.TOKEN_COSTS:
                costs = self.TOKEN_COSTS[model]
                prompt_cost = (prompt_tokens / 1000) * costs["prompt"]
                completion_cost = (completion_tokens / 1000) * costs["completion"]
                total_cost = prompt_cost + completion_cost
                
                model_usage["cost"] += total_cost
                self.usage["total_cost"] += total_cost
                
        except Exception as e:
            error_msg = f"Usage tracking failed: {str(e)}"
            logger.error(error_msg)
            raise TokenError(error_msg)
            
    def get_usage(
        self,
        model: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get token usage statistics"""
        try:
            if model:
                if model not in self.usage["models"]:
                    return {
                        "prompt_tokens": 0,
                        "completion_tokens": 0,
                        "total_tokens": 0,
                        "cost": 0.0
                    }
                return self.usage["models"][model]
            return self.usage
            
        except Exception as e:
            error_msg = f"Failed to get usage: {str(e)}"
            logger.error(error_msg)
            raise TokenError(error_msg)
            
    def reset_usage(
        self,
        model: Optional[str] = None
    ) -> None:
        """Reset usage statistics"""
        try:
            if model:
                if model in self.usage["models"]:
                    model_usage = self.usage["models"][model]
                    self.usage["total_tokens"] -= model_usage["total_tokens"]
                    self.usage["prompt_tokens"] -= model_usage["prompt_tokens"]
                    self.usage["completion_tokens"] -= model_usage["completion_tokens"]
                    self.usage["total_cost"] -= model_usage["cost"]
                    self.usage["models"][model] = {
                        "prompt_tokens": 0,
                        "completion_tokens": 0,
                        "total_tokens": 0,
                        "cost": 0.0
                    }
            else:
                self.usage = {
                    "total_tokens": 0,
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "total_cost": 0.0,
                    "models": {}
                }
                
        except Exception as e:
            error_msg = f"Failed to reset usage: {str(e)}"
            logger.error(error_msg)
            raise TokenError(error_msg)
            
    def estimate_cost(
        self,
        prompt_tokens: int,
        completion_tokens: int,
        model: str
    ) -> float:
        """Estimate cost for token usage"""
        try:
            if model not in self.TOKEN_COSTS:
                raise TokenError(f"Unknown model: {model}")
                
            costs = self.TOKEN_COSTS[model]
            prompt_cost = (prompt_tokens / 1000) * costs["prompt"]
            completion_cost = (completion_tokens / 1000) * costs["completion"]
            
            return prompt_cost + completion_cost
            
        except Exception as e:
            error_msg = f"Cost estimation failed: {str(e)}"
            logger.error(error_msg)
            raise TokenError(error_msg)
            
    def _get_encoder(self, model: str):
        """Get or create encoder for model"""
        try:
            if model not in self.encoders:
                # Get encoding for model
                if model.startswith("gpt-4"):
                    encoding_name = "cl100k_base"
                elif model.startswith("gpt-3.5"):
                    encoding_name = "cl100k_base"
                elif model == "text-embedding-ada-002":
                    encoding_name = "cl100k_base"
                else:
                    # Default to GPT-3 encoding
                    encoding_name = "p50k_base"
                    
                self.encoders[model] = tiktoken.get_encoding(encoding_name)
                
            return self.encoders[model]
            
        except Exception as e:
            error_msg = f"Failed to get encoder: {str(e)}"
            logger.error(error_msg)
            raise TokenError(error_msg) 