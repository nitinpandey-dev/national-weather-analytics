import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

from app.pipeline.classifier import classify_weather_event
from app.pipeline.geocoder import extract_location_from_text, is_within_india, reverse_geocode
from app.pipeline.deduplicator import compute_text_similarity
from app.pipeline.verifier import evaluate_verification
from datetime import datetime, timezone

def test_nlp_classification_flood():
    result = classify_weather_event("Severe waterlogging at Dadar subway waist-deep water local trains submerged")
    assert result["event_type"] == "flood"
    assert result["confidence"] > 0.8

def test_nlp_classification_heatwave():
    result = classify_weather_event("Extreme heatwave conditions 47 degrees scorching sun loo blowing in Rajasthan")
    assert result["event_type"] == "heatwave"
    assert result["confidence"] > 0.8

def test_nlp_classification_thunderstorm():
    result = classify_weather_event("Massive thunderstorm with loud thunder and violent lightning strikes")
    assert result["event_type"] in ["thunderstorm", "lightning"]

def test_geocoder_india_bounds():
    # Delhi coordinates
    assert is_within_india(28.6139, 77.2090) is True
    # Outside India (London)
    assert is_within_india(51.5074, -0.1278) is False

def test_geocoder_text_extraction():
    loc = extract_location_from_text("Torrential rain reported in Mumbai near marine drive")
    assert loc is not None
    assert loc["city"] == "Mumbai"
    assert loc["state"] == "Maharashtra"

def test_deduplicator_similarity():
    t1 = "Severe waterlogging at Milan Subway and Dadar TT circle"
    t2 = "Severe waterlogging at Milan Subway and Dadar TT circle"
    sim = compute_text_similarity(t1, t2)
    assert sim == 1.0

def test_evidence_fusion_verifier():
    res = evaluate_verification(
        source_reliability=0.95,
        reported_at=datetime.now(timezone.utc),
        latitude=19.0760,
        longitude=72.8777,
        is_duplicate=False,
        has_media=True,
        nearby_matching_reports_count=3,
        is_official_source=True
    )
    assert res["final_score"] >= 0.85
    assert res["decision"] == "VERIFIED"
    assert len(res["reasons"]) > 0

if __name__ == "__main__":
    test_nlp_classification_flood()
    test_nlp_classification_heatwave()
    test_nlp_classification_thunderstorm()
    test_geocoder_india_bounds()
    test_geocoder_text_extraction()
    test_deduplicator_similarity()
    test_evidence_fusion_verifier()
    print("All pipeline unit and integration tests passed successfully!")
