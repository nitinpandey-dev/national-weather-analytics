from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict, Any
from app.pipeline.geocoder import haversine_distance_km
from app.core.config import settings

def find_or_create_weather_event(
    event_type: str,
    lat: float,
    lon: float,
    reported_at: datetime,
    state: Optional[str],
    district: Optional[str],
    city: Optional[str],
    severity: str,
    existing_events: List[Any]
) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
    """
    Looks for an existing active weather event of the same or compatible type
    within the cluster radius (e.g. 40km) and time window (e.g. 6h).
    If found, returns (event_id, None).
    If not found, returns (None, new_event_dict).
    """
    for event in existing_events:
        if event.status != "ACTIVE":
            continue
            
        # Match event category
        same_family = False
        if event.event_type == event_type:
            same_family = True
        elif {event.event_type, event_type}.issubset({"rainfall", "heavy_rainfall", "flood"}):
            same_family = True
        elif {event.event_type, event_type}.issubset({"thunderstorm", "lightning", "strong_wind"}):
            same_family = True
            
        if not same_family:
            continue
            
        dist_km = haversine_distance_km(lat, lon, event.latitude, event.longitude)
        if dist_km <= event.radius_km:
            # Check time overlap
            e_time = event.start_time
            if e_time and e_time.tzinfo is None:
                e_time = e_time.replace(tzinfo=timezone.utc)
            r_time = reported_at
            if r_time and r_time.tzinfo is None:
                r_time = r_time.replace(tzinfo=timezone.utc)
            dt_hours = abs((r_time - e_time).total_seconds()) / 3600.0
            if dt_hours <= settings.TEMPORAL_CLUSTER_HOURS:
                return (event.id, None)
                
    # Create new event blueprint
    title_location = city or district or state or "India"
    display_title = f"{event_type.replace('_', ' ').title()} in {title_location}"
    
    new_event = {
        "event_type": event_type,
        "title": display_title,
        "description": f"Automated cluster established from active meteorological sensor & public reports in {title_location}.",
        "latitude": lat,
        "longitude": lon,
        "radius_km": settings.SPATIAL_CLUSTER_RADIUS_KM,
        "state": state,
        "district": district,
        "severity": severity,
        "start_time": reported_at,
        "confidence": 0.85,
        "status": "ACTIVE"
    }
    return (None, new_event)
