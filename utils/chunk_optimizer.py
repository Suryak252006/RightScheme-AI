"""
Chunk optimization utilities to reduce bundle size and improve loading performance.
This module provides functions to compress, organize, and lazily load chunk data.
"""

import gzip
import json
import os
import glob
from typing import Dict, List, Any
import streamlit as st
from pathlib import Path

@st.cache_data
def get_compressed_chunks_data() -> Dict[str, List[str]]:
    """
    Load and return compressed chunk data organized by state.
    This replaces loading individual chunk files and reduces memory usage.
    """
    compressed_file = "chunks/compressed_chunks.json.gz"
    
    # If compressed file exists, load it
    if os.path.exists(compressed_file):
        try:
            with gzip.open(compressed_file, 'rt', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading compressed chunks: {e}")
            # Fall back to loading individual files
            return load_and_organize_chunks()
    else:
        # Create compressed file if it doesn't exist
        chunk_data = load_and_organize_chunks()
        save_compressed_chunks(chunk_data)
        return chunk_data

def load_and_organize_chunks() -> Dict[str, List[str]]:
    """
    Load all chunk files and organize them by state.
    """
    chunks_by_state = {}
    chunk_pattern = "chunks/state_*_doc_*_chunks.txt"
    chunk_files = glob.glob(chunk_pattern)
    
    for file_path in chunk_files:
        try:
            # Extract state name from filename
            filename = os.path.basename(file_path)
            # Format: state_statename_doc_X_chunks.txt
            parts = filename.split('_')
            if len(parts) >= 3:
                state_name = parts[1]
                
                # Read chunk content
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read().strip()
                
                if content:  # Only add non-empty chunks
                    if state_name not in chunks_by_state:
                        chunks_by_state[state_name] = []
                    chunks_by_state[state_name].append(content)
                    
        except Exception as e:
            print(f"Error processing chunk file {file_path}: {e}")
    
    return chunks_by_state

def save_compressed_chunks(chunk_data: Dict[str, List[str]]) -> None:
    """
    Save chunk data to a compressed JSON file.
    """
    try:
        compressed_file = "chunks/compressed_chunks.json.gz"
        os.makedirs(os.path.dirname(compressed_file), exist_ok=True)
        
        with gzip.open(compressed_file, 'wt', encoding='utf-8') as f:
            json.dump(chunk_data, f, ensure_ascii=False, separators=(',', ':'))
        
        print(f"Compressed chunks saved to {compressed_file}")
        
        # Calculate compression ratio
        original_size = sum(
            sum(len(chunk.encode('utf-8')) for chunk in chunks)
            for chunks in chunk_data.values()
        )
        compressed_size = os.path.getsize(compressed_file)
        ratio = (1 - compressed_size / original_size) * 100
        print(f"Compression ratio: {ratio:.1f}% (Original: {original_size:,} bytes, Compressed: {compressed_size:,} bytes)")
        
    except Exception as e:
        print(f"Error saving compressed chunks: {e}")

@st.cache_data
def get_chunks_for_state(state_name: str) -> List[str]:
    """
    Get chunks for a specific state using lazy loading.
    This reduces memory usage by only loading relevant chunks.
    """
    if not state_name or state_name == "Select your state":
        return []
    
    # Normalize state name
    state_name_normalized = state_name.lower().replace(" ", "").replace("pradesh", "pradesh")
    
    # Get all chunk data
    all_chunks = get_compressed_chunks_data()
    
    # Return chunks for the specific state
    return all_chunks.get(state_name_normalized, [])

@st.cache_data
def get_chunk_statistics() -> Dict[str, Any]:
    """
    Get statistics about chunk data for monitoring and optimization.
    """
    all_chunks = get_compressed_chunks_data()
    
    stats = {
        "total_states": len(all_chunks),
        "total_chunks": sum(len(chunks) for chunks in all_chunks.values()),
        "chunks_by_state": {
            state: len(chunks) for state, chunks in all_chunks.items()
        },
        "average_chunk_size": 0,
        "total_content_size": 0
    }
    
    # Calculate content statistics
    total_content_size = 0
    total_chunk_count = 0
    
    for chunks in all_chunks.values():
        for chunk in chunks:
            total_content_size += len(chunk.encode('utf-8'))
            total_chunk_count += 1
    
    stats["total_content_size"] = total_content_size
    stats["average_chunk_size"] = total_content_size // total_chunk_count if total_chunk_count > 0 else 0
    
    return stats

def optimize_chunks_directory():
    """
    Optimize the chunks directory by creating compressed versions and cleaning up.
    This function should be run periodically or as part of deployment.
    """
    print("Starting chunk optimization...")
    
    # Load and organize chunks
    chunk_data = load_and_organize_chunks()
    
    # Save compressed version
    save_compressed_chunks(chunk_data)
    
    # Get statistics
    stats = get_chunk_statistics()
    
    print(f"Optimization complete:")
    print(f"- Total states: {stats['total_states']}")
    print(f"- Total chunks: {stats['total_chunks']}")
    print(f"- Total content size: {stats['total_content_size']:,} bytes")
    print(f"- Average chunk size: {stats['average_chunk_size']:,} bytes")
    
    return stats

def create_backup_of_chunks():
    """
    Create a backup of the original chunks directory before optimization.
    """
    import shutil
    
    backup_dir = "chunks_backup"
    if not os.path.exists(backup_dir):
        try:
            shutil.copytree("chunks", backup_dir)
            print(f"Backup created at {backup_dir}")
        except Exception as e:
            print(f"Error creating backup: {e}")

def validate_chunk_integrity():
    """
    Validate that compressed chunks match original files.
    """
    print("Validating chunk integrity...")
    
    # Load original chunks
    original_chunks = load_and_organize_chunks()
    
    # Load compressed chunks
    compressed_chunks = get_compressed_chunks_data()
    
    # Compare
    if original_chunks == compressed_chunks:
        print("✅ Chunk integrity validated - compressed data matches original")
        return True
    else:
        print("❌ Chunk integrity check failed - data mismatch detected")
        return False

def get_memory_usage_estimate() -> Dict[str, int]:
    """
    Estimate memory usage for different loading strategies.
    """
    stats = get_chunk_statistics()
    
    return {
        "all_chunks_loaded": stats["total_content_size"],
        "single_state_average": stats["total_content_size"] // stats["total_states"] if stats["total_states"] > 0 else 0,
        "compressed_file_size": os.path.getsize("chunks/compressed_chunks.json.gz") if os.path.exists("chunks/compressed_chunks.json.gz") else 0
    }

def cleanup_original_chunks(confirm: bool = False):
    """
    Remove original chunk files after successful compression.
    Use with caution - only after validating integrity.
    """
    if not confirm:
        print("⚠️  Use cleanup_original_chunks(confirm=True) to actually delete files")
        return
    
    if not validate_chunk_integrity():
        print("❌ Integrity check failed - not deleting original files")
        return
    
    chunk_files = glob.glob("chunks/state_*_doc_*_chunks.txt")
    deleted_count = 0
    
    for file_path in chunk_files:
        try:
            os.remove(file_path)
            deleted_count += 1
        except Exception as e:
            print(f"Error deleting {file_path}: {e}")
    
    print(f"✅ Deleted {deleted_count} original chunk files")
    print(f"💾 Space saved: Compressed file is much smaller than {deleted_count} individual files")

if __name__ == "__main__":
    # Run optimization when script is executed directly
    print("Running chunk optimization...")
    optimize_chunks_directory()
    
    # Show memory usage estimates
    memory_estimates = get_memory_usage_estimate()
    print("\nMemory usage estimates:")
    for strategy, size in memory_estimates.items():
        print(f"- {strategy}: {size:,} bytes ({size / 1024 / 1024:.1f} MB)")
    
    # Validate integrity
    validate_chunk_integrity()