import math
import re
from typing import Optional, Dict, Tuple, Any

# Extensive geospatial index for India
INDIA_LOCATIONS = {
    # Major Metros & Cities
    "mumbai": {"lat": 19.0760, "lon": 72.8777, "state": "Maharashtra", "district": "Mumbai"},
    "delhi": {"lat": 28.6139, "lon": 77.2090, "state": "Delhi", "district": "New Delhi"},
    "bengaluru": {"lat": 12.9716, "lon": 77.5946, "state": "Karnataka", "district": "Bengaluru Urban"},
    "bangalore": {"lat": 12.9716, "lon": 77.5946, "state": "Karnataka", "district": "Bengaluru Urban"},
    "kolkata": {"lat": 22.5726, "lon": 88.3639, "state": "West Bengal", "district": "Kolkata"},
    "chennai": {"lat": 13.0827, "lon": 80.2707, "state": "Tamil Nadu", "district": "Chennai"},
    "hyderabad": {"lat": 17.3850, "lon": 78.4867, "state": "Telangana", "district": "Hyderabad"},
    "ahmedabad": {"lat": 23.0225, "lon": 72.5714, "state": "Gujarat", "district": "Ahmedabad"},
    "pune": {"lat": 18.5204, "lon": 73.8567, "state": "Maharashtra", "district": "Pune"},
    "jaipur": {"lat": 26.9124, "lon": 75.7873, "state": "Rajasthan", "district": "Jaipur"},
    "lucknow": {"lat": 26.8467, "lon": 80.9462, "state": "Uttar Pradesh", "district": "Lucknow"},
    "patna": {"lat": 25.5941, "lon": 85.1376, "state": "Bihar", "district": "Patna"},
    "bhopal": {"lat": 23.2599, "lon": 77.4126, "state": "Madhya Pradesh", "district": "Bhopal"},
    "indore": {"lat": 22.7196, "lon": 75.8577, "state": "Madhya Pradesh", "district": "Indore"},
    "surat": {"lat": 21.1702, "lon": 72.8311, "state": "Gujarat", "district": "Surat"},
    "kanpur": {"lat": 26.4499, "lon": 80.3319, "state": "Uttar Pradesh", "district": "Kanpur Nagar"},
    "nagpur": {"lat": 21.1458, "lon": 79.0882, "state": "Maharashtra", "district": "Nagpur"},
    "visakhapatnam": {"lat": 17.6868, "lon": 83.2185, "state": "Andhra Pradesh", "district": "Visakhapatnam"},
    "vizag": {"lat": 17.6868, "lon": 83.2185, "state": "Andhra Pradesh", "district": "Visakhapatnam"},
    "kochi": {"lat": 9.9312, "lon": 76.2673, "state": "Kerala", "district": "Ernakulam"},
    "cochin": {"lat": 9.9312, "lon": 76.2673, "state": "Kerala", "district": "Ernakulam"},
    "thiruvananthapuram": {"lat": 8.5241, "lon": 76.9366, "state": "Kerala", "district": "Thiruvananthapuram"},
    "chandigarh": {"lat": 30.7333, "lon": 76.7794, "state": "Chandigarh", "district": "Chandigarh"},
    "srinagar": {"lat": 34.0837, "lon": 74.7973, "state": "Jammu & Kashmir", "district": "Srinagar"},
    "shimla": {"lat": 31.1048, "lon": 77.1734, "state": "Himachal Pradesh", "district": "Shimla"},
    "dehradun": {"lat": 30.3165, "lon": 78.0322, "state": "Uttarakhand", "district": "Dehradun"},
    "guwahati": {"lat": 26.1445, "lon": 91.7362, "state": "Assam", "district": "Kamrup Metropolitan"},
    "bhubaneswar": {"lat": 20.2961, "lon": 85.8245, "state": "Odisha", "district": "Khurda"},
    "ranchi": {"lat": 23.3441, "lon": 85.3096, "state": "Jharkhand", "district": "Ranchi"},
    "raipur": {"lat": 21.2514, "lon": 81.6296, "state": "Chhattisgarh", "district": "Raipur"},
    "amritsar": {"lat": 31.6340, "lon": 74.8723, "state": "Punjab", "district": "Amritsar"},
    "varanasi": {"lat": 25.3176, "lon": 82.9739, "state": "Uttar Pradesh", "district": "Varanasi"},
    "agra": {"lat": 27.1767, "lon": 78.0081, "state": "Uttar Pradesh", "district": "Agra"},
    "allahabad": {"lat": 25.4358, "lon": 81.8463, "state": "Uttar Pradesh", "district": "Prayagraj"},
    "prayagraj": {"lat": 25.4358, "lon": 81.8463, "state": "Uttar Pradesh", "district": "Prayagraj"},
    "coimbatore": {"lat": 11.0168, "lon": 76.9558, "state": "Tamil Nadu", "district": "Coimbatore"},
    "madurai": {"lat": 9.9252, "lon": 78.1198, "state": "Tamil Nadu", "district": "Madurai"},
    "kozhikode": {"lat": 11.2588, "lon": 75.7804, "state": "Kerala", "district": "Kozhikode"},
    "calicut": {"lat": 11.2588, "lon": 75.7804, "state": "Kerala", "district": "Kozhikode"},
    "mangalore": {"lat": 12.9141, "lon": 74.8560, "state": "Karnataka", "district": "Dakshina Kannada"},
    "mysuru": {"lat": 12.2958, "lon": 76.6394, "state": "Karnataka", "district": "Mysuru"},
    "mysore": {"lat": 12.2958, "lon": 76.6394, "state": "Karnataka", "district": "Mysuru"},
    "jodhpur": {"lat": 26.2389, "lon": 73.0243, "state": "Rajasthan", "district": "Jodhpur"},
    "udaipur": {"lat": 24.5854, "lon": 73.7125, "state": "Rajasthan", "district": "Udaipur"},
    "panaji": {"lat": 15.4909, "lon": 73.8278, "state": "Goa", "district": "North Goa"},
    "goa": {"lat": 15.2993, "lon": 74.1240, "state": "Goa", "district": "Goa"},
    "shillong": {"lat": 25.5788, "lon": 91.8933, "state": "Meghalaya", "district": "East Khasi Hills"},
    "cherrapunji": {"lat": 25.2702, "lon": 91.7323, "state": "Meghalaya", "district": "East Khasi Hills"},
    "imphal": {"lat": 24.8170, "lon": 93.9368, "state": "Manipur", "district": "Imphal West"},
    "agartala": {"lat": 23.8315, "lon": 91.2868, "state": "Tripura", "district": "West Tripura"},
    "aizawl": {"lat": 23.7271, "lon": 92.7176, "state": "Mizoram", "district": "Aizawl"},
    "kohima": {"lat": 25.6751, "lon": 94.1086, "state": "Nagaland", "district": "Kohima"},
    "itanagar": {"lat": 27.0844, "lon": 93.6053, "state": "Arunachal Pradesh", "district": "Papum Pare"},
    "gangtok": {"lat": 27.3389, "lon": 88.6065, "state": "Sikkim", "district": "East Sikkim"},
    "leh": {"lat": 34.1526, "lon": 77.5771, "state": "Ladakh", "district": "Leh"},
    "port blair": {"lat": 11.6234, "lon": 92.7265, "state": "Andaman & Nicobar", "district": "South Andaman"},
}

# India bounding box
INDIA_BOUNDS = {
    "min_lat": 6.5,
    "max_lat": 37.5,
    "min_lon": 68.0,
    "max_lon": 97.5
}

def is_within_india(lat: float, lon: float) -> bool:
    return (
        INDIA_BOUNDS["min_lat"] <= lat <= INDIA_BOUNDS["max_lat"] and
        INDIA_BOUNDS["min_lon"] <= lon <= INDIA_BOUNDS["max_lon"]
    )

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def extract_location_from_text(text: str) -> Optional[Dict[str, Any]]:
    normalized_text = " " + text.lower() + " "
    # Search for known cities or states
    for name, data in INDIA_LOCATIONS.items():
        pattern = r"\b" + re.escape(name) + r"\b"
        if re.search(pattern, normalized_text):
            return {
                "city": name.title(),
                "district": data["district"],
                "state": data["state"],
                "latitude": data["lat"],
                "longitude": data["lon"],
                "confidence": 0.95
            }
    return None

def reverse_geocode(lat: float, lon: float) -> Dict[str, str]:
    # Find nearest known city in our geospatial index
    nearest_loc = None
    min_dist = float("inf")
    for name, data in INDIA_LOCATIONS.items():
        dist = haversine_distance_km(lat, lon, data["lat"], data["lon"])
        if dist < min_dist:
            min_dist = dist
            nearest_loc = (name, data)
    
    if nearest_loc and min_dist <= 75.0: # within 75km
        return {
            "city": nearest_loc[0].title(),
            "district": nearest_loc[1]["district"],
            "state": nearest_loc[1]["state"],
            "distance_km": round(min_dist, 1)
        }
    
    # Regional estimation by coordinate bands
    if lat > 28.0:
        return {"city": "Northern Region", "district": "North District", "state": "North India", "distance_km": round(min_dist, 1)}
    elif lat < 14.0:
        return {"city": "Southern Region", "district": "South District", "state": "South India", "distance_km": round(min_dist, 1)}
    elif lon > 87.0:
        return {"city": "Eastern Region", "district": "East District", "state": "East India", "distance_km": round(min_dist, 1)}
    elif lon < 74.0:
        return {"city": "Western Region", "district": "West District", "state": "West India", "distance_km": round(min_dist, 1)}
    else:
        return {"city": "Central Region", "district": "Central District", "state": "Central India", "distance_km": round(min_dist, 1)}
