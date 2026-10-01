import hashlib
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime, timezone
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.pipeline.geocoder import haversine_distance_km
from app.core.config import settings

def compute_media_hashes(image_bytes: bytes) -> Dict[str, str]:
    # SHA-256 cryptographic hash
    sha256 = hashlib.sha256(image_bytes).hexdigest()
    
    # 64-bit Average/Difference perceptual hash heuristic
    # (Fast 8x8 block average hash)
    step = max(1, len(image_bytes) // 64)
    bits = []
    avg_byte = sum(image_bytes[:64*step]) / max(1, 64*step)
    for i in range(64):
        sample = image_bytes[i*step] if i*step < len(image_bytes) else 0
        bits.append("1" if sample > avg_byte else "0")
    phash = hex(int("".join(bits), 2))[2:].zfill(16)
    
    return {"sha256": sha256, "perceptual_hash": phash}

def compute_text_similarity(text1: str, text2: str) -> float:
    if not text1 or not text2:
        return 0.0
    if text1.strip().lower() == text2.strip().lower():
        return 1.0
        
    try:
        vec = TfidfVectorizer().fit_transform([text1.lower(), text2.lower()])
        sim = cosine_similarity(vec[0:1], vec[1:2])[0][0]
        return float(sim)
    except Exception:
        # Fallback to Jaccard similarity
        s1 = set(text1.lower().split())
        s2 = set(text2.lower().split())
        if not s1 or not s2:
            return 0.0
        return len(s1.intersection(s2)) / len(s1.union(s2))

def find_duplicate_candidate(
    new_text: str,
    new_lat: float,
    new_lon: float,
    new_time: datetime,
    existing_reports: List[Dict[str, Any]]
) -> Optional[Tuple[str, float, str]]:
    """
    Returns (duplicate_of_id, similarity_score, reason) if a match is found.
    """
    for r in existing_reports:
        # 1. Check spatial proximity
        dist_km = haversine_distance_km(new_lat, new_lon, r["latitude"], r["longitude"])
        if dist_km > settings.SPATIAL_CLUSTER_RADIUS_KM:
            continue
            
        # 2. Check temporal proximity (within configurable hours)
        r_time = r["reported_at"]
        if r_time and r_time.tzinfo is None:
            r_time = r_time.replace(tzinfo=timezone.utc)
        n_time = new_time
        if n_time and n_time.tzinfo is None:
            n_time = n_time.replace(tzinfo=timezone.utc)
            
        dt_hours = abs((n_time - r_time).total_seconds()) / 3600.0
        if dt_hours > settings.TEMPORAL_CLUSTER_HOURS:
            continue
            
        # 3. Check exact text hash
        if r.get("text_hash") and hashlib.sha256(new_text.strip().lower().encode("utf-8")).hexdigest() == r["text_hash"]:
            return (r["id"], 1.0, f"Identical text hash within {dist_km:.1f}km")
            
        # 4. Check text similarity
        sim = compute_text_similarity(new_text, r["text"])
        if sim >= settings.DEDUPLICATION_SIMILARITY_THRESHOLD:
            return (r["id"], sim, f"High text similarity ({sim*100:.1f}%) within {dist_km:.1f}km")
            
    return None
