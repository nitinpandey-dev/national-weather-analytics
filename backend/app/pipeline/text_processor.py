import re
import hashlib
from typing import Dict, Any, List

def clean_text(text: str) -> str:
    if not text:
        return ""
    # Strip URLs
    text = re.sub(r"https?://\S+|www\.\S+", "", text)
    # Strip excessive whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text

def compute_text_hash(text: str) -> str:
    cleaned = clean_text(text).lower()
    return hashlib.sha256(cleaned.encode("utf-8")).hexdigest()

def detect_language(text: str) -> str:
    # Basic script/heuristic detection for Indian languages vs Latin
    # Check for Devanagari Unicode range: \u0900-\u097F
    if re.search(r"[\u0900-\u097F]", text):
        return "hi"
    # Bengali: \u0980-\u09FF
    elif re.search(r"[\u0980-\u09FF]", text):
        return "bn"
    # Tamil: \u0B80-\u0BFF
    elif re.search(r"[\u0B80-\u0BFF]", text):
        return "ta"
    # Telugu: \u0C00-\u0C7F
    elif re.search(r"[\u0C00-\u0C7F]", text):
        return "te"
    return "en"

def extract_severity_keywords(text: str) -> Dict[str, Any]:
    text_lower = text.lower()
    severe_indicators = [
        "severe", "extreme", "danger", "massive", "catastrophic", "incessant",
        "red alert", "emergency", "washed away", "submerged", "evacuate",
        "overwhelmed", "destructive", "calamity", "high alert"
    ]
    moderate_indicators = [
        "moderate", "steady", "waterlogging", "delay", "caution", "orange alert",
        "heavy", "continuous", "traffic stopped", "trees uprooted"
    ]
    
    severity = "MODERATE"
    score = 0.5
    for word in severe_indicators:
        if word in text_lower:
            severity = "SEVERE"
            score = 0.95
            break
            
    if severity != "SEVERE":
        for word in moderate_indicators:
            if word in text_lower:
                severity = "MODERATE"
                score = 0.70
                break
                
    return {"severity": severity, "intensity_score": score}
