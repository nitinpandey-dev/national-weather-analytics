import httpx
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.ingestion.connector_base import BaseConnector
from app.pipeline.geocoder import INDIA_LOCATIONS

# WMO Weather interpretation codes (WW)
WMO_MAP = {
    0: "clear",
    1: "clear",
    2: "cloudy",
    3: "cloudy",
    45: "fog",
    48: "fog",
    51: "rainfall",
    53: "rainfall",
    55: "rainfall",
    61: "rainfall",
    63: "rainfall",
    65: "heavy_rainfall",
    71: "hailstorm",
    75: "hailstorm",
    80: "rainfall",
    81: "rainfall",
    82: "heavy_rainfall",
    95: "thunderstorm",
    96: "thunderstorm",
    99: "thunderstorm"
}

class OpenMeteoConnector(BaseConnector):
    def __init__(self):
        self.cities = ["mumbai", "delhi", "bengaluru", "kolkata", "chennai", "jaipur", "guwahati", "bhopal"]
        self.base_url = "https://api.open-meteo.com/v1/forecast"

    def fetch_hourly_forecast(
        self,
        latitude: float,
        longitude: float,
        hourly_params: str = "temperature_2m"
    ) -> Dict[str, Any]:
        """
        Fetches live forecast and hourly temperature from Open-Meteo API:
        https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly={hourly_params}
        """
        url = f"{self.base_url}?latitude={latitude}&longitude={longitude}&hourly={hourly_params}&current_weather=true"
        with httpx.Client(timeout=8.0) as client:
            resp = client.get(url)
            resp.raise_for_status()
            return resp.json()

    def fetch_data(self) -> List[Dict[str, Any]]:
        results = []
        with httpx.Client(timeout=6.0) as client:
            for city_key in self.cities:
                loc = INDIA_LOCATIONS.get(city_key)
                if not loc:
                    continue
                try:
                    url = f"{self.base_url}?latitude={loc['lat']}&longitude={loc['lon']}&hourly=temperature_2m,relative_humidity_2m,weathercode&current_weather=true"
                    resp = client.get(url)
                    if resp.status_code == 200:
                        data = resp.json()
                        curr = data.get("current_weather", {})
                        hourly = data.get("hourly", {})
                        temps = hourly.get("temperature_2m", [])
                        avg_temp = round(sum(temps[:24]) / max(1, len(temps[:24])), 1) if temps else curr.get("temperature", 28)
                        
                        results.append({
                            "city": city_key.title(),
                            "state": loc["state"],
                            "district": loc["district"],
                            "lat": loc["lat"],
                            "lon": loc["lon"],
                            "temperature": curr.get("temperature", avg_temp),
                            "windspeed": curr.get("windspeed", 12),
                            "weathercode": curr.get("weathercode", 0),
                            "hourly_temps": temps[:24],
                            "hourly_times": hourly.get("time", [])[:24],
                            "time": curr.get("time")
                        })
                except Exception:
                    continue
        return results

    def normalize_payload(self, raw_item: Dict[str, Any]) -> Dict[str, Any]:
        wcode = raw_item.get("weathercode", 0)
        event_type = WMO_MAP.get(wcode, "rainfall")
        temp = raw_item.get("temperature", 28)
        wind = raw_item.get("windspeed", 10)
        
        # Heatwave heuristic
        if temp > 42:
            event_type = "heatwave"
        elif wind > 50:
            event_type = "strong_wind"

        text = f"Automated meteorology station in {raw_item['city']}, {raw_item['state']} records {event_type.replace('_', ' ')} with temperature {temp}°C and wind speed {wind} km/h (Open-Meteo Hourly Forecast Sync)."
        
        return {
            "source_type": "open_meteo",
            "source_name": "Open-Meteo Global Sensor Station",
            "external_id": f"OM-{raw_item['city']}-{int(datetime.now(timezone.utc).timestamp())}",
            "text": text,
            "event_type": event_type,
            "latitude": raw_item["lat"],
            "longitude": raw_item["lon"],
            "state": raw_item["state"],
            "district": raw_item["district"],
            "city": raw_item["city"],
            "reported_at": datetime.now(timezone.utc),
            "media_urls": []
        }
