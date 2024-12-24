import re
from typing import List, Set
from ..core.agent_types import STOP_WORDS, NewsCategory

def clean_search_query(query: str, max_length: int = 100) -> str:
    """Clean and prepare search query"""
    # Remove special characters and extra whitespace
    query = re.sub(r'[^\w\s-]', ' ', query)
    query = ' '.join(query.split())
    
    # Limit query length
    if len(query) > max_length:
        # Keep first max_length chars but break at last complete word
        query = query[:max_length].rsplit(' ', 1)[0]
    
    return query

def is_stop_word(word: str, additional_stop_words: Set[str] = None) -> bool:
    """Check if a word is a stop word"""
    stop_words = STOP_WORDS.copy()
    if additional_stop_words:
        stop_words.update(additional_stop_words)
    return word.lower() in stop_words

def determine_news_category(query: str) -> NewsCategory:
    """Determine the news category based on the query"""
    query_lower = query.lower()
    
    # Technology keywords
    if any(word in query_lower for word in [
        "technology", "tech", "software", "hardware", "ai", "artificial intelligence",
        "robotics", "computer", "digital", "internet", "cyber", "quantum", "battery"
    ]):
        return NewsCategory.TECHNOLOGY
        
    # Science keywords    
    if any(word in query_lower for word in [
        "science", "research", "scientific", "biology", "physics", "chemistry",
        "astronomy", "space", "medical", "medicine", "climate", "environment",
        "genetics", "crispr", "laboratory", "experiment"
    ]):
        return NewsCategory.SCIENCE
        
    # Business keywords
    if any(word in query_lower for word in [
        "business", "finance", "economy", "market", "stock", "trade",
        "investment", "startup", "company", "industry", "corporate",
        "economic", "commercial", "enterprise"
    ]):
        return NewsCategory.BUSINESS
        
    return NewsCategory.GENERAL

def simplify_query(query: str, max_words: int = 3) -> str:
    """Simplify a query by taking the first few words"""
    # Remove special characters and extra whitespace
    simplified = re.sub(r'[^\w\s]', ' ', query).strip()
    return ' '.join(simplified.split()[:max_words])

def generate_search_variations(query: str) -> List[str]:
    """Generate variations of a search query"""
    variations = [query]
    
    # Add time-based variations
    time_modifiers = ["latest", "recent", "current"]
    variations.extend(f"{modifier} {query}" for modifier in time_modifiers)
    
    # Add domain-specific variations
    domain_prefixes = ["research", "news about", "developments in"]
    variations.extend(f"{prefix} {query}" for prefix in domain_prefixes)
    
    return variations

def extract_keywords(text: str, max_keywords: int = 5) -> List[str]:
    """Extract main keywords from text"""
    # Split into words and convert to lowercase
    words = text.lower().split()
    
    # Remove stop words and short words
    keywords = [word for word in words 
               if not is_stop_word(word) and len(word) > 2]
    
    # Sort by length (longer words often more significant) and take top N
    return sorted(set(keywords), key=len, reverse=True)[:max_keywords] 