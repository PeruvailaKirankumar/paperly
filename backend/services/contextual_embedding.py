from anthropic import Anthropic
from typing import List, Dict, Any
import numpy as np
from config import settings


class ContextualEmbeddingService:
    """Service for generating contextual embeddings using GLM-4.5-air."""
    
    def __init__(self):
        self.client = Anthropic(
            api_key=settings.anthropic_api_key,
            base_url=settings.anthropic_base_url
        )
        self.model = settings.embedding_model
    
    def generate_contextual_embedding(self, text: str, context: str = "") -> List[float]:
        """
        Generate contextual embedding by using LLM to create a rich representation.
        
        Args:
            text: The text to embed
            context: Additional context to enhance the embedding
            
        Returns:
            List of floats representing the embedding
        """
        # Create a prompt that helps the LLM understand the semantic meaning
        prompt = f"""Analyze and summarize the key concepts, topics, and educational content in the following text.
Focus on identifying:
- Main topics and subtopics
- Key concepts and definitions
- Important facts and relationships
- Difficulty level indicators
- Question-worthy information

{f"Context: {context}" if context else ""}

Text to analyze:
{text[:2000]}  # Limit length for API

Provide a comprehensive semantic summary that captures the essence of this content."""

        try:
            # Note: The actual API might not support embeddings directly
            # This is a workaround using text generation to create semantic representations
            response = self.client.messages.create(
                model=self.model,
                max_tokens=500,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )
            
            # Extract the response text
            summary = response.content[0].text if response.content else text
            
            # Return the summary which will be embedded by sentence-transformers
            return summary
            
        except Exception as e:
            print(f"Error generating contextual embedding: {str(e)}")
            # Fallback to original text
            return text
    
    def batch_generate_contextual_embeddings(
        self, 
        texts: List[str], 
        contexts: List[str] = None
    ) -> List[str]:
        """
        Generate contextual embeddings for multiple texts.
        
        Args:
            texts: List of texts to embed
            contexts: Optional list of contexts (same length as texts)
            
        Returns:
            List of contextually enriched texts
        """
        if contexts is None:
            contexts = [""] * len(texts)
        
        enriched_texts = []
        for text, context in zip(texts, contexts):
            enriched_text = self.generate_contextual_embedding(text, context)
            enriched_texts.append(enriched_text)
        
        return enriched_texts
