from typing import Dict, Any, List, Optional, Set
import logging
from collections import defaultdict
from datetime import datetime
from ..core.agent_exceptions import AggregationError
from ..utils.logging_utils import log_api_call

logger = logging.getLogger(__name__)

class SourceAggregator:
    """Source aggregation and synthesis"""
    
    @log_api_call
    def aggregate_sources(
        self,
        sources: List[Dict[str, Any]],
        group_by: Optional[str] = None,
        filter_criteria: Optional[Dict[str, Any]] = None,
        sort_by: Optional[str] = None,
        max_sources: Optional[int] = None
    ) -> Dict[str, Any]:
        """Aggregate sources with grouping and filtering"""
        try:
            # Apply filters if specified
            if filter_criteria:
                sources = self._filter_sources(sources, filter_criteria)
                
            # Group sources if specified
            if group_by:
                grouped = self._group_sources(sources, group_by)
            else:
                grouped = {"all": sources}
                
            # Sort within groups if specified
            if sort_by:
                for group in grouped.values():
                    self._sort_sources(group, sort_by)
                    
            # Limit sources if specified
            if max_sources:
                for group_name, group_sources in grouped.items():
                    grouped[group_name] = group_sources[:max_sources]
                    
            # Generate summary
            summary = self._generate_summary(grouped)
            
            return {
                "sources": grouped,
                "summary": summary,
                "total_sources": len(sources),
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            error_msg = f"Source aggregation failed: {str(e)}"
            logger.error(error_msg)
            raise AggregationError(error_msg)
            
    def synthesize_sources(
        self,
        sources: List[Dict[str, Any]],
        fields: Optional[List[str]] = None,
        synthesis_type: str = "merge"
    ) -> Dict[str, Any]:
        """Synthesize information from multiple sources"""
        try:
            if not sources:
                return {}
                
            if not fields:
                # Use all common fields
                fields = self._get_common_fields(sources)
                
            if synthesis_type == "merge":
                return self._merge_source_fields(sources, fields)
            elif synthesis_type == "aggregate":
                return self._aggregate_source_fields(sources, fields)
            else:
                raise AggregationError(f"Unknown synthesis type: {synthesis_type}")
                
        except Exception as e:
            error_msg = f"Source synthesis failed: {str(e)}"
            logger.error(error_msg)
            raise AggregationError(error_msg)
            
    def find_contradictions(
        self,
        sources: List[Dict[str, Any]],
        fields: Optional[List[str]] = None,
        threshold: float = 0.8
    ) -> List[Dict[str, Any]]:
        """Find contradictions between sources"""
        try:
            contradictions = []
            
            if not fields:
                fields = self._get_common_fields(sources)
                
            # Compare each pair of sources
            for i, source1 in enumerate(sources):
                for source2 in sources[i + 1:]:
                    conflicts = self._compare_sources(
                        source1, source2, fields, threshold
                    )
                    if conflicts:
                        contradictions.append({
                            "source1": source1,
                            "source2": source2,
                            "conflicts": conflicts
                        })
                        
            return contradictions
            
        except Exception as e:
            error_msg = f"Contradiction detection failed: {str(e)}"
            logger.error(error_msg)
            raise AggregationError(error_msg)
            
    def _filter_sources(
        self,
        sources: List[Dict[str, Any]],
        criteria: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Filter sources based on criteria"""
        filtered = []
        
        for source in sources:
            matches = True
            for field, value in criteria.items():
                if field not in source:
                    matches = False
                    break
                    
                if isinstance(value, (list, set)):
                    if source[field] not in value:
                        matches = False
                        break
                elif isinstance(value, dict):
                    if "min" in value and source[field] < value["min"]:
                        matches = False
                        break
                    if "max" in value and source[field] > value["max"]:
                        matches = False
                        break
                elif source[field] != value:
                    matches = False
                    break
                    
            if matches:
                filtered.append(source)
                
        return filtered
        
    def _group_sources(
        self,
        sources: List[Dict[str, Any]],
        group_by: str
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Group sources by field"""
        grouped = defaultdict(list)
        
        for source in sources:
            key = source.get(group_by, "unknown")
            if isinstance(key, (list, set)):
                key = tuple(sorted(key))
            grouped[str(key)].append(source)
            
        return dict(grouped)
        
    def _sort_sources(
        self,
        sources: List[Dict[str, Any]],
        sort_by: str
    ) -> None:
        """Sort sources by field"""
        reverse = False
        if sort_by.startswith("-"):
            sort_by = sort_by[1:]
            reverse = True
            
        sources.sort(
            key=lambda x: x.get(sort_by, ""),
            reverse=reverse
        )
        
    def _generate_summary(
        self,
        grouped_sources: Dict[str, List[Dict[str, Any]]]
    ) -> Dict[str, Any]:
        """Generate summary of grouped sources"""
        summary = {
            "total_groups": len(grouped_sources),
            "groups": {},
            "source_counts": {},
            "field_coverage": self._analyze_field_coverage(grouped_sources)
        }
        
        for group_name, sources in grouped_sources.items():
            group_summary = {
                "count": len(sources),
                "date_range": self._get_date_range(sources),
                "unique_values": self._get_unique_values(sources)
            }
            summary["groups"][group_name] = group_summary
            summary["source_counts"][group_name] = len(sources)
            
        return summary
        
    def _get_common_fields(
        self,
        sources: List[Dict[str, Any]]
    ) -> List[str]:
        """Get fields common to all sources"""
        if not sources:
            return []
            
        common_fields = set(sources[0].keys())
        for source in sources[1:]:
            common_fields.intersection_update(source.keys())
            
        return sorted(common_fields)
        
    def _merge_source_fields(
        self,
        sources: List[Dict[str, Any]],
        fields: List[str]
    ) -> Dict[str, Any]:
        """Merge fields from multiple sources"""
        merged = {}
        
        for field in fields:
            values = [
                source[field] for source in sources
                if field in source and source[field] is not None
            ]
            
            if not values:
                continue
                
            if all(isinstance(v, (int, float)) for v in values):
                merged[field] = sum(values) / len(values)  # Average
            elif all(isinstance(v, (list, set)) for v in values):
                merged[field] = list(set().union(*values))  # Union
            else:
                # Use most common value
                from collections import Counter
                counter = Counter(values)
                merged[field] = counter.most_common(1)[0][0]
                
        return merged
        
    def _aggregate_source_fields(
        self,
        sources: List[Dict[str, Any]],
        fields: List[str]
    ) -> Dict[str, Any]:
        """Aggregate field values from sources"""
        aggregated = {}
        
        for field in fields:
            values = [
                source[field] for source in sources
                if field in source and source[field] is not None
            ]
            
            if not values:
                continue
                
            if all(isinstance(v, (int, float)) for v in values):
                aggregated[field] = {
                    "min": min(values),
                    "max": max(values),
                    "avg": sum(values) / len(values),
                    "count": len(values)
                }
            else:
                from collections import Counter
                counter = Counter(values)
                aggregated[field] = {
                    "values": dict(counter),
                    "most_common": counter.most_common(3),
                    "unique_count": len(set(values))
                }
                
        return aggregated
        
    def _compare_sources(
        self,
        source1: Dict[str, Any],
        source2: Dict[str, Any],
        fields: List[str],
        threshold: float
    ) -> List[Dict[str, Any]]:
        """Compare two sources for contradictions"""
        conflicts = []
        
        for field in fields:
            if field not in source1 or field not in source2:
                continue
                
            value1 = source1[field]
            value2 = source2[field]
            
            if isinstance(value1, (int, float)) and isinstance(value2, (int, float)):
                # Compare numeric values
                if abs(value1 - value2) > threshold * max(abs(value1), abs(value2)):
                    conflicts.append({
                        "field": field,
                        "value1": value1,
                        "value2": value2,
                        "difference": abs(value1 - value2)
                    })
            elif value1 != value2:
                # Compare non-numeric values
                conflicts.append({
                    "field": field,
                    "value1": value1,
                    "value2": value2
                })
                
        return conflicts
        
    def _analyze_field_coverage(
        self,
        grouped_sources: Dict[str, List[Dict[str, Any]]]
    ) -> Dict[str, Dict[str, int]]:
        """Analyze field coverage across sources"""
        coverage = defaultdict(lambda: defaultdict(int))
        
        for group_name, sources in grouped_sources.items():
            for source in sources:
                for field in source.keys():
                    if source[field] is not None:
                        coverage[group_name][field] += 1
                        
        return dict(coverage)
        
    def _get_date_range(
        self,
        sources: List[Dict[str, Any]]
    ) -> Optional[Dict[str, str]]:
        """Get date range from sources"""
        dates = []
        for source in sources:
            date = source.get("date") or source.get("year")
            if date:
                try:
                    if isinstance(date, str):
                        date = datetime.fromisoformat(date.replace("Z", "+00:00"))
                    dates.append(date)
                except ValueError:
                    continue
                    
        if dates:
            return {
                "earliest": min(dates).isoformat(),
                "latest": max(dates).isoformat()
            }
            
        return None
        
    def _get_unique_values(
        self,
        sources: List[Dict[str, Any]]
    ) -> Dict[str, Set[Any]]:
        """Get unique values for each field"""
        unique_values = defaultdict(set)
        
        for source in sources:
            for field, value in source.items():
                if isinstance(value, (str, int, float)):
                    unique_values[field].add(value)
                elif isinstance(value, (list, set)):
                    unique_values[field].update(value)
                    
        return {
            field: list(values)
            for field, values in unique_values.items()
        } 