"""Simple in-memory cache for query -> SQL mappings."""

from typing import Optional
from collections import OrderedDict
import hashlib


class QueryCache:
    """
    LRU cache for natural language query -> SQL mappings.
    
    Features:
    - Max size with LRU eviction
    - Query normalization for better hit rate
    """
    
    def __init__(self, max_size: int = 1000):
        """
        Initialize the cache.
        
        Args:
            max_size: Maximum number of entries (default 1000)
        """
        self.max_size = max_size
        self._cache: OrderedDict[str, str] = OrderedDict()
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
            Cached SQL string or None if not found
        """
        key = self._make_key(query, limit)
        
        if key not in self._cache:
            self._misses += 1
            return None
        
        # Move to end (most recently used)
        self._cache.move_to_end(key)
        self._hits += 1
        
        return self._cache[key]
    
    def set(self, query: str, limit: int, sql: str) -> None:
        """
        Cache SQL for a query.
        
        Args:
            query: Natural language query
            limit: Result limit
            sql: Generated SQL to cache
        """
        key = self._make_key(query, limit)
        
        # Remove if exists (to move to end)
        if key in self._cache:
            del self._cache[key]
        
        # Evict oldest if at max size
        while len(self._cache) >= self.max_size:
            self._cache.popitem(last=False)
        
        self._cache[key] = sql
    
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
            "hit_rate_percent": round(hit_rate, 2)
        }


# Global cache instance
query_cache = QueryCache(max_size=1000)

# Precomputed SQL for suggested prompts (no LLM call needed)
# Key format: "query|limit" normalized (lowercase, trimmed)
PRECOMPUTED_QUERIES = {
    # Homepage suggested prompts (limit 50)
    ('healthcare stocks with upcoming earnings', 50): 
        "SELECT * FROM stocks WHERE sector ILIKE '%Healthcare%' AND earnings_call_date >= CURRENT_DATE ORDER BY earnings_call_date ASC LIMIT 50",
    ('tech stocks under $100', 50): 
        "SELECT * FROM stocks WHERE sector ILIKE '%Technology%' AND current_price < 100 LIMIT 50",
    ('top gaining stocks today', 50): 
        "SELECT * FROM stocks WHERE day_change_percent > 0 ORDER BY day_change_percent DESC LIMIT 50",
    ('energy sector with high volume', 50): 
        "SELECT * FROM stocks WHERE sector ILIKE '%Energy%' ORDER BY volume DESC LIMIT 50",
    ('canadian bank stocks', 50): 
        "SELECT * FROM stocks WHERE (exchange ILIKE '%TSX%' OR exchange ILIKE '%TOR%') AND (sector ILIKE '%Finance%' OR industry ILIKE '%Bank%') LIMIT 50",
    # All stocks query (high limit for showing all)
    ('all stocks', 500): 
        "SELECT * FROM stocks ORDER BY ticker ASC LIMIT 500",
}


def warm_cache() -> dict:
    """
    Pre-warm the cache with precomputed SQL for suggested prompts.
    
    No LLM calls - uses hardcoded SQL that matches what the LLM would generate.
    
    Returns:
        Dict with count of warmed queries
    """
    warmed = 0
    for (prompt, limit), sql in PRECOMPUTED_QUERIES.items():
        # Check if already cached
        if query_cache.get(prompt, limit) is None:
            query_cache.set(prompt, limit, sql)
            print(f"[Cache WARM] '{prompt}' (limit={limit}) -> Cached")
            warmed += 1
        else:
            print(f"[Cache WARM] '{prompt}' (limit={limit}) -> Already cached")
    
    return {"warmed": warmed, "total_prompts": len(PRECOMPUTED_QUERIES)}
