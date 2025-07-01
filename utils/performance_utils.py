"""
Performance optimization utilities for RightScheme AI application.
This module provides caching functions for expensive operations.
"""

import streamlit as st
from typing import Dict, Any, List
import functools
import time
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@st.cache_resource
def get_semantic_matcher():
    """
    Cache the SemanticSchemeMatcher instance to avoid recreation on every page load.
    This reduces initialization time from 2-3 seconds to near-instantaneous.
    """
    from Python_Files.scheme_semantic_matcher import SemanticSchemeMatcher
    logger.info("Creating cached SemanticSchemeMatcher instance")
    return SemanticSchemeMatcher()

@st.cache_resource
def get_scheme_agent():
    """
    Cache the scheme agent instance to avoid recreation on every page load.
    This reduces LangChain agent initialization time significantly.
    """
    from Python_Files.scheme_agent import create_scheme_agent
    logger.info("Creating cached scheme agent instance")
    return create_scheme_agent()

@st.cache_data(ttl=3600)  # Cache for 1 hour
def cached_translation(text: str, target_language: str = "en") -> str:
    """
    Cache translation results to avoid repeated API calls.
    TTL of 1 hour balances freshness with performance.
    """
    from Python_Files.translation_utils import translate_text
    logger.info(f"Translating text to {target_language} (cached)")
    return translate_text(text, target_language)

@st.cache_data(ttl=86400)  # Cache embeddings for 24 hours
def cached_embedding_generation(text: str) -> List[float]:
    """
    Cache embedding generation to avoid expensive OpenAI API calls.
    Embeddings are stable for 24 hours.
    """
    matcher = get_semantic_matcher()
    logger.info("Generating cached embedding")
    return matcher.generate_embedding(text).tolist()

@st.cache_data(ttl=3600)  # Cache for 1 hour
def cached_scheme_recommendations(user_profile_dict: Dict[str, Any]) -> List[Dict]:
    """
    Cache scheme recommendations based on user profile.
    Converts to/from dict to ensure hashability for caching.
    """
    from Python_Files.scheme_semantic_matcher import UserProfile
    
    # Convert dict back to UserProfile object
    user_profile = UserProfile(**user_profile_dict)
    matcher = get_semantic_matcher()
    
    logger.info("Getting cached scheme recommendations")
    recommendations = matcher.get_scheme_recommendations(user_profile)
    
    # Convert to serializable format for caching
    return [
        {
            "scheme_name": rec.scheme_name,
            "relevance_score": rec.relevance_score,
            "benefits": rec.benefits,
            "eligibility_requirements": rec.eligibility_requirements,
            "eligibility_status": rec.eligibility_status,
            "application_process": rec.application_process,
            "why_recommended": rec.why_recommended
        }
        for rec in recommendations
    ]

@st.cache_data(ttl=1800)  # Cache for 30 minutes
def cached_scheme_search(query: str, user_state: str = None) -> List[Dict]:
    """
    Cache scheme search results to avoid repeated Pinecone queries.
    """
    agent = get_scheme_agent()
    logger.info(f"Performing cached scheme search for: {query}")
    
    # Set user state context if provided
    if user_state and hasattr(agent, 'tools'):
        for tool in agent.tools:
            if hasattr(tool.func, 'set_user_state'):
                tool.func.set_user_state(user_state)
    
    # Perform search using the agent's tools
    try:
        response = agent.invoke({"input": query})
        return [{"response": response["output"]}]
    except Exception as e:
        logger.error(f"Error in cached scheme search: {e}")
        return []

def performance_timer(func):
    """
    Decorator to measure function execution time.
    Useful for identifying performance bottlenecks.
    """
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        logger.info(f"{func.__name__} executed in {end_time - start_time:.3f} seconds")
        return result
    return wrapper

@st.cache_data
def load_chunks_on_demand(state_name: str) -> List[str]:
    """
    Load only relevant chunks for user's state to reduce memory usage.
    """
    import glob
    import os
    
    logger.info(f"Loading chunks for state: {state_name}")
    
    # Normalize state name
    state_name_clean = state_name.lower().replace(" ", "")
    
    # Load state-specific chunks
    chunk_pattern = f"chunks/state_{state_name_clean}_*.txt"
    chunk_files = glob.glob(chunk_pattern)
    
    chunks = []
    for file_path in chunk_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                chunks.append(f.read())
        except Exception as e:
            logger.error(f"Error loading chunk file {file_path}: {e}")
    
    logger.info(f"Loaded {len(chunks)} chunks for {state_name}")
    return chunks

def optimize_session_state():
    """
    Optimize session state management to reduce memory usage and improve performance.
    """
    # Initialize core state only once
    if "core_initialized" not in st.session_state:
        st.session_state.core_initialized = True
        st.session_state.user_state = "Select your state"
        st.session_state.language = "en"
        logger.info("Core session state initialized")
    
    # Lazy initialization for heavy components
    if "scheme_components" not in st.session_state:
        st.session_state.scheme_components = {}
        logger.info("Scheme components container initialized")

def clear_performance_cache():
    """
    Clear all cached data for debugging or when needed.
    Use sparingly as it will temporarily reduce performance.
    """
    st.cache_data.clear()
    st.cache_resource.clear()
    logger.info("All caches cleared")

@performance_timer
def optimized_pinecone_query(query_vector: List[float], filters: Dict = None, top_k: int = 20):
    """
    Optimized Pinecone query with caching and filtering.
    """
    # This would be implemented with actual Pinecone optimization
    # For now, it's a placeholder for the pattern
    logger.info(f"Optimized Pinecone query with top_k={top_k}")
    pass

def get_cache_stats() -> Dict[str, Any]:
    """
    Get statistics about cache usage for monitoring.
    """
    return {
        "cache_data_stats": "Available in Streamlit 1.18+",
        "cache_resource_stats": "Available in Streamlit 1.18+",
        "memory_usage": "Use external profiling tools"
    }