from typing import Dict, Any, List, Optional, Set
import logging
import re
from collections import Counter
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from ..core.agent_exceptions import ProcessingError
from ..utils.logging_utils import log_api_call

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')
try:
    nltk.data.find('corpora/wordnet')
except LookupError:
    nltk.download('wordnet')

logger = logging.getLogger(__name__)

class TextProcessor:
    """Text analysis and extraction processor"""
    
    def __init__(self):
        self.lemmatizer = WordNetLemmatizer()
        self.stop_words = set(stopwords.words('english'))
        
    @log_api_call
    def analyze_text(
        self,
        text: str,
        include_statistics: bool = True,
        include_keywords: bool = True,
        include_sentences: bool = True,
        include_entities: bool = True
    ) -> Dict[str, Any]:
        """Analyze text content"""
        try:
            analysis = {}
            
            # Basic text cleaning
            cleaned_text = self._clean_text(text)
            
            # Add text statistics if requested
            if include_statistics:
                analysis["statistics"] = self._calculate_statistics(cleaned_text)
                
            # Extract keywords if requested
            if include_keywords:
                analysis["keywords"] = self._extract_keywords(cleaned_text)
                
            # Extract sentences if requested
            if include_sentences:
                analysis["sentences"] = self._extract_sentences(cleaned_text)
                
            # Extract entities if requested
            if include_entities:
                analysis["entities"] = self._extract_entities(cleaned_text)
                
            return analysis
            
        except Exception as e:
            error_msg = f"Text analysis failed: {str(e)}"
            logger.error(error_msg)
            raise ProcessingError(error_msg)
            
    def extract_metadata(
        self,
        text: str,
        patterns: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Extract metadata using patterns"""
        try:
            metadata = {}
            default_patterns = {
                "emails": r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
                "urls": r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+',
                "dates": r'\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2}',
                "phone_numbers": r'\+?1?\d{9,15}|\(\d{3}\)\s*\d{3}[-\s]?\d{4}',
                "hashtags": r'#\w+'
            }
            
            # Update patterns with custom ones
            if patterns:
                default_patterns.update(patterns)
                
            # Extract metadata using patterns
            for key, pattern in default_patterns.items():
                matches = re.findall(pattern, text)
                if matches:
                    metadata[key] = list(set(matches))
                    
            return metadata
            
        except Exception as e:
            error_msg = f"Metadata extraction failed: {str(e)}"
            logger.error(error_msg)
            raise ProcessingError(error_msg)
            
    def summarize_text(
        self,
        text: str,
        ratio: float = 0.3,
        min_sentences: int = 3
    ) -> Dict[str, Any]:
        """Generate text summary"""
        try:
            # Clean and split text into sentences
            cleaned_text = self._clean_text(text)
            sentences = sent_tokenize(cleaned_text)
            
            if len(sentences) <= min_sentences:
                return {
                    "summary": cleaned_text,
                    "sentence_count": len(sentences),
                    "ratio": 1.0
                }
                
            # Calculate sentence scores
            word_freq = self._calculate_word_frequency(cleaned_text)
            sentence_scores = {}
            
            for sentence in sentences:
                words = word_tokenize(sentence.lower())
                score = sum(word_freq.get(word, 0) for word in words)
                sentence_scores[sentence] = score
                
            # Select top sentences
            num_sentences = max(
                min_sentences,
                int(len(sentences) * ratio)
            )
            top_sentences = sorted(
                sentence_scores.items(),
                key=lambda x: x[1],
                reverse=True
            )[:num_sentences]
            
            # Reconstruct summary in original order
            summary_sentences = [s[0] for s in top_sentences]
            summary = " ".join(
                sent for sent in sentences
                if sent in summary_sentences
            )
            
            return {
                "summary": summary,
                "sentence_count": len(summary_sentences),
                "ratio": len(summary_sentences) / len(sentences)
            }
            
        except Exception as e:
            error_msg = f"Text summarization failed: {str(e)}"
            logger.error(error_msg)
            raise ProcessingError(error_msg)
            
    def _clean_text(self, text: str) -> str:
        """Clean text content"""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters
        text = re.sub(r'[^\w\s.,!?-]', '', text)
        return text.strip()
        
    def _calculate_statistics(self, text: str) -> Dict[str, Any]:
        """Calculate text statistics"""
        sentences = sent_tokenize(text)
        words = word_tokenize(text.lower())
        words_no_stop = [w for w in words if w not in self.stop_words]
        
        return {
            "char_count": len(text),
            "word_count": len(words),
            "sentence_count": len(sentences),
            "avg_word_length": sum(len(w) for w in words) / len(words),
            "avg_sentence_length": len(words) / len(sentences),
            "unique_words": len(set(words_no_stop))
        }
        
    def _extract_keywords(
        self,
        text: str,
        top_k: int = 10,
        min_freq: int = 2
    ) -> List[Dict[str, Any]]:
        """Extract keywords from text"""
        # Tokenize and clean words
        words = word_tokenize(text.lower())
        words = [
            self.lemmatizer.lemmatize(word)
            for word in words
            if word.isalnum() and word not in self.stop_words
        ]
        
        # Calculate word frequencies
        word_freq = Counter(words)
        
        # Get top keywords
        keywords = [
            {
                "word": word,
                "frequency": freq,
                "score": freq / len(words)
            }
            for word, freq in word_freq.most_common(top_k)
            if freq >= min_freq
        ]
        
        return keywords
        
    def _extract_sentences(
        self,
        text: str,
        min_length: int = 10
    ) -> List[Dict[str, Any]]:
        """Extract and analyze sentences"""
        sentences = sent_tokenize(text)
        
        analyzed_sentences = []
        for sent in sentences:
            if len(sent) >= min_length:
                words = word_tokenize(sent.lower())
                analyzed_sentences.append({
                    "text": sent,
                    "length": len(sent),
                    "word_count": len(words),
                    "keywords": [
                        w for w in words
                        if w.isalnum() and w not in self.stop_words
                    ]
                })
                
        return analyzed_sentences
        
    def _extract_entities(self, text: str) -> Dict[str, List[str]]:
        """Extract named entities"""
        # Simple pattern-based entity extraction
        entities = {
            "dates": re.findall(
                r'\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2}',
                text
            ),
            "numbers": re.findall(r'\b\d+(?:\.\d+)?\b', text),
            "emails": re.findall(
                r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
                text
            ),
            "urls": re.findall(
                r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+',
                text
            )
        }
        
        # Remove duplicates and empty lists
        return {
            k: list(set(v))
            for k, v in entities.items()
            if v
        }
        
    def _calculate_word_frequency(self, text: str) -> Dict[str, float]:
        """Calculate normalized word frequencies"""
        words = word_tokenize(text.lower())
        words = [
            self.lemmatizer.lemmatize(word)
            for word in words
            if word.isalnum() and word not in self.stop_words
        ]
        
        # Calculate frequencies
        freq = Counter(words)
        max_freq = max(freq.values())
        
        # Normalize frequencies
        return {
            word: count/max_freq
            for word, count in freq.items()
        } 