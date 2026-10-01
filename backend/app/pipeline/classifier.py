import re
from typing import Dict, Any, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

# Seed corpus for training NLP classifier
TRAINING_SAMPLES = [
    # rainfall
    ("Light rain started in morning drizzle cloudy sky", "rainfall"),
    ("Continuous gentle shower cool breeze raining now", "rainfall"),
    ("Wet roads and light precipitation across the area", "rainfall"),
    ("Barish ho rahi hai halki barish", "rainfall"),
    # heavy_rainfall
    ("Torrential downpour cloudburst incessant heavy rain non-stop", "heavy_rainfall"),
    ("Extremely heavy rainfall 150mm recorded localized inundation", "heavy_rainfall"),
    ("Pounding rain streets turning into rivers relentless downpour", "heavy_rainfall"),
    ("Bahut tez barish ho rahi hai musladhar barish", "heavy_rainfall"),
    # thunderstorm
    ("Thunderstorm lightning strikes loud thundering dark thunder clouds", "thunderstorm"),
    ("Severe thunderstorm with gale winds and thunder squalls", "thunderstorm"),
    ("Toofan bijli kadak rahi hai thunder and lightning", "thunderstorm"),
    ("Thunderstorm alert issued with violent winds", "thunderstorm"),
    # flood
    ("Flood water overflowing riverbanks residential area submerged", "flood"),
    ("Flash flood waterlogging rescue boats deployed waist-deep water", "flood"),
    ("Badh ka pani gharon me ghus gaya flood situation critical", "flood"),
    ("Dam gates opened downstream flooding alert", "flood"),
    # heatwave
    ("Severe heatwave temperature crossed 47 degrees scorching sun loo", "heatwave"),
    ("Extreme hot day dehydration warning heat stroke alert blistering heat", "heatwave"),
    ("Tez dhoop aur loo chal rahi hai extreme summer heat", "heatwave"),
    ("Heatwave conditions prevailing across the state 45C", "heatwave"),
    # fog
    ("Dense fog zero visibility trains delayed highway pileup smog", "fog"),
    ("Thick fog enveloped early morning visibility under 50m", "fog"),
    ("Kohra ghana kohra visibility nil", "fog"),
    ("Cold wave and blinding fog affecting morning flights", "fog"),
    # dust_storm
    ("Massive dust storm brown wall blinding sandstorm gale velocity", "dust_storm"),
    ("Andhi toofan dust clouds reducing visibility sand everywhere", "dust_storm"),
    ("Severe dust storm hit city uprooting hoardings", "dust_storm"),
    ("Strong dust haze and high particulate matter storm", "dust_storm"),
    # strong_wind
    ("High velocity winds gusts over 80 kmph trees uprooted tin roofs blown", "strong_wind"),
    ("Squall lines strong gale wind damaging power lines", "strong_wind"),
    ("Hawa bahut tez chal rahi hai cyclone outer bands", "strong_wind"),
    ("Fierce wind blowing structures away", "strong_wind"),
    # hailstorm
    ("Hailstorm golf ball size hailstones damaging crops windshields", "hailstorm"),
    ("Oley gir rahe hain severe hail storm icy precipitation", "hailstorm"),
    ("Ice pellets raining down hail storm destroying wheat fields", "hailstorm"),
    ("Sudden hailstorm blanketed streets in ice", "hailstorm"),
    # lightning
    ("Deadly lightning bolt struck tree thunder bolt electrocution risk", "lightning"),
    ("Multiple cloud to ground lightning strikes captured on camera", "lightning"),
    ("Bijli giri lightning strike near farm", "lightning"),
    ("Intense atmospheric electrical activity lightning discharges", "lightning"),
]

# Train the internal TF-IDF + Naive Bayes pipeline
texts, labels = zip(*TRAINING_SAMPLES)
nlp_pipeline = Pipeline([
    ("tfidf", TfidfVectorizer(ngram_range=(1, 2), lowercase=True)),
    ("clf", MultinomialNB(alpha=0.1))
])
nlp_pipeline.fit(texts, labels)

MODEL_VERSION = "nlp-tfidf-ensemble-v2.1"

# Rule-based heuristics dictionary for boosted precision
KEYWORD_MAPPINGS = {
    "flood": ["flood", "submerged", "waterlogging", "inundated", "badh", "rescue boat", "waist-deep"],
    "heavy_rainfall": ["heavy rain", "torrential", "cloudburst", "musladhar", "downpour", "incessant rain"],
    "hailstorm": ["hail", "hailstorm", "oley", "ice balls", "ice pellets"],
    "lightning": ["lightning", "bijli giri", "thunderbolt", "electrical strike"],
    "thunderstorm": ["thunderstorm", "thunder", "toofan", "squall", "gale"],
    "heatwave": ["heatwave", "loo", "scorching", "45°c", "46°c", "47°c", "48°c", "heat wave", "dehydration"],
    "fog": ["fog", "dense fog", "visibility zero", "kohra", "smog", "mist"],
    "dust_storm": ["dust storm", "andhi", "sandstorm", "haboob"],
    "strong_wind": ["strong wind", "gale", "high winds", "cyclone winds", "trees uprooted"],
    "rainfall": ["rain", "raining", "drizzle", "shower", "barish"],
}

def classify_weather_event(text: str) -> Dict[str, Any]:
    text_lower = text.lower()
    
    # 1. Exact rule/keyword matching for high-priority emergency categories
    matched_rules = []
    for event_cat, keywords in KEYWORD_MAPPINGS.items():
        for kw in keywords:
            if re.search(r"\b" + re.escape(kw) + r"\b", text_lower):
                matched_rules.append((event_cat, kw))
                break

    if matched_rules:
        # Sort priority: flood/heavy_rainfall/hailstorm/lightning > general rainfall
        priority_order = ["flood", "heavy_rainfall", "hailstorm", "lightning", "dust_storm", "heatwave", "thunderstorm", "strong_wind", "fog", "rainfall"]
        matched_rules.sort(key=lambda x: priority_order.index(x[0]) if x[0] in priority_order else 99)
        top_event, top_kw = matched_rules[0]
        return {
            "event_type": top_event,
            "confidence": 0.94,
            "model_version": MODEL_VERSION,
            "trigger_keywords": [top_kw],
            "method": "hybrid_rule_boost"
        }
        
    # 2. ML Classifier prediction
    try:
        predicted = nlp_pipeline.predict([text_lower])[0]
        probabilities = nlp_pipeline.predict_proba([text_lower])[0]
        classes = list(nlp_pipeline.classes_)
        max_prob = float(max(probabilities))
        
        # If low probability, classify as 'other'
        if max_prob < 0.25:
            return {
                "event_type": "other",
                "confidence": 0.40,
                "model_version": MODEL_VERSION,
                "trigger_keywords": [],
                "method": "ml_fallback"
            }
            
        return {
            "event_type": str(predicted),
            "confidence": round(max_prob, 2),
            "model_version": MODEL_VERSION,
            "trigger_keywords": [],
            "method": "ml_classifier"
        }
    except Exception:
        return {
            "event_type": "rainfall",
            "confidence": 0.50,
            "model_version": MODEL_VERSION,
            "trigger_keywords": [],
            "method": "default_fallback"
        }
