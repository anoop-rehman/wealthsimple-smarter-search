"""Simple in-memory cache for query -> SQL mappings."""

import time
from typing import Optional
from collections import OrderedDict
import hashlib


class QueryCache:
    """
    LRU cache for natural language query -> SQL mappings.
    
    Features:
    - TTL (time-to-live) for cache entries
    - Max size with LRU eviction
    - Query normalization for better hit rate
    """
    
    def __init__(self, max_size: int = 1000, ttl_seconds: int = 3600):
        """
        Initialize the cache.
        
        Args:
            max_size: Maximum number of entries (default 1000)
            ttl_seconds: Time-to-live in seconds (default 1 hour)
        """
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._cache: OrderedDict[str, tuple[str, float]] = OrderedDict()
        self._hits = 0
        self._misses = 0
    
    def _normalize_query(self, query: str) -> str:
        """
        Normalize query for consistent cache keys.
        
        - Lowercase
        - Strip whitespace
        - Remove extra spaces
        """
        return ' '.join(query.lower().strip().split())
    
    def _make_key(self, query: str, limit: int) -> str:
        """Create a cache key from query and limit."""
        normalized = self._normalize_query(query)
        # Include limit in key since different limits = different SQL
        key_str = f"{normalized}|{limit}"
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def get(self, query: str, limit: int) -> Optional[str]:
        """
        Get cached SQL for a query.
        
        Args:
            query: Natural language query
            limit: Result limit
            
        Returns:
            Cached SQL string or None if not found/expired
        """
        key = self._make_key(query, limit)
        
        if key not in self._cache:
            self._misses += 1
            return None
        
        sql, timestamp = self._cache[key]
        
        # Check if expired
        if time.time() - timestamp > self.ttl_seconds:
            del self._cache[key]
            self._misses += 1
            return None
        
        # Move to end (most recently used)
        self._cache.move_to_end(key)
        self._hits += 1
        
        return sql
    
    def set(self, query: str, limit: int, sql: str) -> None:
        """
        Cache SQL for a query.
        
        Args:
            query: Natural language query
            limit: Result limit
            sql: Generated SQL to cache
        """
        key = self._make_key(query, limit)
        
        # Remove if exists (to update timestamp and move to end)
        if key in self._cache:
            del self._cache[key]
        
        # Evict oldest if at max size
        while len(self._cache) >= self.max_size:
            self._cache.popitem(last=False)
        
        self._cache[key] = (sql, time.time())
    
    def clear(self) -> None:
        """Clear all cached entries."""
        self._cache.clear()
        self._hits = 0
        self._misses = 0
    
    def stats(self) -> dict:
        """Get cache statistics."""
        total = self._hits + self._misses
        hit_rate = (self._hits / total * 100) if total > 0 else 0
        return {
            "size": len(self._cache),
            "max_size": self.max_size,
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate_percent": round(hit_rate, 2),
            "ttl_seconds": self.ttl_seconds
        }


# Global cache instance
query_cache = QueryCache(max_size=1000, ttl_seconds=3600)  # 1 hour TTL

# Precomputed SQL for suggested prompts (no LLM call needed)
PRECOMPUTED_QUERIES = {
    'healthcare stocks with upcoming earnings': 
        "SELECT * FROM stocks WHERE sector ILIKE '%Healthcare%' AND earnings_call_date >= CURRENT_DATE ORDER BY earnings_call_date ASC LIMIT 50",
    'tech stocks under $100': 
        "SELECT * FROM stocks WHERE sector ILIKE '%Technology%' AND current_price < 100 LIMIT 50",
    'top gaining stocks today': 
        "SELECT * FROM stocks WHERE day_change_percent > 0 ORDER BY day_change_percent DESC LIMIT 50",
    'energy sector with high volume': 
        "SELECT * FROM stocks WHERE sector ILIKE '%Energy%' ORDER BY volume DESC LIMIT 50",
    'canadian bank stocks': 
        "SELECT * FROM stocks WHERE (exchange ILIKE '%TSX%' OR exchange ILIKE '%TOR%') AND (sector ILIKE '%Finance%' OR industry ILIKE '%Bank%') LIMIT 50",
}


def warm_cache() -> dict:
    """
    Pre-warm the cache with precomputed SQL for suggested prompts.
    
    No LLM calls - uses hardcoded SQL that matches what the LLM would generate.
    
    Returns:
        Dict with count of warmed queries
    """
    warmed = 0
    for prompt, sql in PRECOMPUTED_QUERIES.items():
        # Check if already cached
        if query_cache.get(prompt, 50) is None:
            query_cache.set(prompt, 50, sql)
            print(f"[Cache WARM] '{prompt}' -> Cached")
            warmed += 1
        else:
            print(f"[Cache WARM] '{prompt}' -> Already cached")
    
    return {"warmed": warmed, "total_prompts": len(PRECOMPUTED_QUERIES)}
