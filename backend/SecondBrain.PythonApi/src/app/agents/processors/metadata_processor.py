from typing import Dict, Any, List, Optional, Union
import logging
from datetime import datetime
import json
import hashlib
from pathlib import Path
import magic
from ..core.agent_exceptions import ProcessingError
from ..utils.logging_utils import log_api_call

logger = logging.getLogger(__name__)

class MetadataProcessor:
    """Metadata extraction and processing"""
    
    def __init__(self):
        self.mime = magic.Magic(mime=True)
        
    @log_api_call
    def extract_file_metadata(
        self,
        file_path: Union[str, Path],
        calculate_hash: bool = True,
        include_preview: bool = True,
        max_preview_size: int = 1024
    ) -> Dict[str, Any]:
        """Extract metadata from file"""
        try:
            path = Path(file_path)
            if not path.exists():
                raise ProcessingError(f"File not found: {file_path}")
                
            metadata = {
                "name": path.name,
                "extension": path.suffix.lower(),
                "size": path.stat().st_size,
                "created": datetime.fromtimestamp(
                    path.stat().st_ctime
                ).isoformat(),
                "modified": datetime.fromtimestamp(
                    path.stat().st_mtime
                ).isoformat(),
                "mime_type": self.mime.from_file(str(path))
            }
            
            # Calculate file hash if requested
            if calculate_hash:
                metadata["hashes"] = self._calculate_file_hashes(path)
                
            # Add file preview if requested
            if include_preview:
                metadata["preview"] = self._generate_preview(
                    path, max_preview_size
                )
                
            return metadata
            
        except Exception as e:
            error_msg = f"Failed to extract file metadata: {str(e)}"
            logger.error(error_msg)
            raise ProcessingError(error_msg)
            
    def process_metadata(
        self,
        metadata: Dict[str, Any],
        rules: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Process and validate metadata"""
        try:
            processed = {}
            
            # Apply default rules
            default_rules = {
                "lowercase_keys": True,
                "strip_strings": True,
                "remove_empty": True,
                "max_depth": 5
            }
            
            # Update with custom rules
            if rules:
                default_rules.update(rules)
                
            # Process metadata recursively
            processed = self._process_value(
                metadata,
                rules=default_rules,
                current_depth=0
            )
            
            return processed
            
        except Exception as e:
            error_msg = f"Metadata processing failed: {str(e)}"
            logger.error(error_msg)
            raise ProcessingError(error_msg)
            
    def merge_metadata(
        self,
        metadata_list: List[Dict[str, Any]],
        merge_strategy: str = "update"
    ) -> Dict[str, Any]:
        """Merge multiple metadata dictionaries"""
        try:
            if not metadata_list:
                return {}
                
            if len(metadata_list) == 1:
                return metadata_list[0].copy()
                
            result = {}
            
            for metadata in metadata_list:
                if merge_strategy == "update":
                    result.update(metadata)
                elif merge_strategy == "deep":
                    result = self._deep_merge(result, metadata)
                else:
                    raise ProcessingError(f"Unknown merge strategy: {merge_strategy}")
                    
            return result
            
        except Exception as e:
            error_msg = f"Metadata merge failed: {str(e)}"
            logger.error(error_msg)
            raise ProcessingError(error_msg)
            
    def validate_metadata(
        self,
        metadata: Dict[str, Any],
        schema: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate metadata against schema"""
        try:
            validated = {}
            errors = []
            
            for field, rules in schema.items():
                value = metadata.get(field)
                
                # Check required fields
                if rules.get("required", False) and value is None:
                    errors.append(f"Missing required field: {field}")
                    continue
                    
                # Skip if field is not present and not required
                if value is None:
                    continue
                    
                # Validate type
                expected_type = rules.get("type")
                if expected_type and not isinstance(value, expected_type):
                    errors.append(
                        f"Invalid type for {field}: "
                        f"expected {expected_type}, got {type(value)}"
                    )
                    continue
                    
                # Validate pattern
                if pattern := rules.get("pattern"):
                    if not isinstance(value, str) or not re.match(pattern, value):
                        errors.append(f"Invalid pattern for {field}")
                        continue
                        
                # Validate enum
                if enum_values := rules.get("enum"):
                    if value not in enum_values:
                        errors.append(
                            f"Invalid value for {field}: "
                            f"must be one of {enum_values}"
                        )
                        continue
                        
                # Add validated field
                validated[field] = value
                
            if errors:
                raise ProcessingError(
                    "Metadata validation failed: " + "; ".join(errors)
                )
                
            return validated
            
        except Exception as e:
            error_msg = f"Metadata validation failed: {str(e)}"
            logger.error(error_msg)
            raise ProcessingError(error_msg)
            
    def _calculate_file_hashes(self, path: Path) -> Dict[str, str]:
        """Calculate file hashes"""
        hashes = {}
        algorithms = {
            "md5": hashlib.md5(),
            "sha256": hashlib.sha256()
        }
        
        with open(path, "rb") as f:
            chunk = f.read(8192)
            while chunk:
                for hash_obj in algorithms.values():
                    hash_obj.update(chunk)
                chunk = f.read(8192)
                
        return {
            name: hash_obj.hexdigest()
            for name, hash_obj in algorithms.items()
        }
        
    def _generate_preview(
        self,
        path: Path,
        max_size: int
    ) -> Optional[str]:
        """Generate file preview"""
        try:
            mime_type = self.mime.from_file(str(path))
            
            # Handle text files
            if mime_type.startswith("text/"):
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read(max_size)
                    return content + "..." if len(content) == max_size else content
                    
            # Handle binary files
            return None
            
        except Exception as e:
            logger.warning(f"Failed to generate preview: {str(e)}")
            return None
            
    def _process_value(
        self,
        value: Any,
        rules: Dict[str, Any],
        current_depth: int
    ) -> Any:
        """Process value recursively"""
        # Check max depth
        if current_depth >= rules["max_depth"]:
            return value
            
        if isinstance(value, dict):
            processed = {}
            for k, v in value.items():
                # Process key
                if rules["lowercase_keys"]:
                    k = k.lower()
                    
                # Process value
                processed_value = self._process_value(
                    v, rules, current_depth + 1
                )
                
                if processed_value is not None:
                    processed[k] = processed_value
                    
            return processed if processed or not rules["remove_empty"] else None
            
        elif isinstance(value, list):
            processed = [
                self._process_value(v, rules, current_depth + 1)
                for v in value
            ]
            processed = [v for v in processed if v is not None]
            return processed if processed or not rules["remove_empty"] else None
            
        elif isinstance(value, str):
            processed = value.strip() if rules["strip_strings"] else value
            return processed if processed or not rules["remove_empty"] else None
            
        return value
        
    def _deep_merge(
        self,
        dict1: Dict[str, Any],
        dict2: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Deep merge two dictionaries"""
        result = dict1.copy()
        
        for key, value in dict2.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            elif key in result and isinstance(result[key], list) and isinstance(value, list):
                result[key] = result[key] + value
            else:
                result[key] = value
                
        return result 