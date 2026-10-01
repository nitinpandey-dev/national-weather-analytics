import random
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from app.pipeline.geocoder import INDIA_LOCATIONS

SIMULATED_REPORTS = [
    {
        "city_key": "mumbai",
        "text": "Severe waterlogging at Milan Subway and Dadar TT circle. Heavy torrential rain non-stop for 4 hours, vehicular traffic diverted.",
        "event_type": "flood",
        "source_type": "citizen",
        "source_name": "Citizen Weather Watcher",
        "media_urls": ["https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=600"]
    },
    {
        "city_key": "mumbai",
        "text": "Incessant heavy downpour in Bandra West with squally winds. Water entering low lying shops.",
        "event_type": "heavy_rainfall",
        "source_type": "social_rss",
        "source_name": "Twitter Weather Alerts",
        "media_urls": []
    },
    {
        "city_key": "mumbai",
        "text": "Severe waterlogging at Milan Subway and Dadar TT circle. Heavy torrential rain non-stop for 4 hours, vehicular traffic diverted.", # Intentional duplicate for deduplication demo!
        "event_type": "flood",
        "source_type": "social_rss",
        "source_name": "Viral News X",
        "media_urls": ["https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=600"]
    },
    {
        "city_key": "delhi",
        "text": "Dense fog envelope across NCR and IGI Airport. Visibility dropped to near zero meters, departures temporarily suspended.",
        "event_type": "fog",
        "source_type": "imd_api",
        "source_name": "IMD Regional Met Centre Delhi",
        "media_urls": ["https://images.unsplash.com/photo-1485236715568-ddc5ee6ca227?w=600"]
    },
    {
        "city_key": "delhi",
        "text": "Thick smog and blinding fog on Yamuna Expressway. Commuters advised to drive at low speeds.",
        "event_type": "fog",
        "source_type": "citizen",
        "source_name": "NCR Commuter Alert",
        "media_urls": []
    },
    {
        "city_key": "bengaluru",
        "text": "Massive thunderstorm with violent lightning strikes near Whitefield and Bellandur. Trees uprooted near eco-space.",
        "event_type": "thunderstorm",
        "source_type": "citizen",
        "source_name": "Bangalore Techie",
        "media_urls": ["https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?w=600"]
    },
    {
        "city_key": "bengaluru",
        "text": "Loud thunder and intense lightning accompanied by hail in Indiranagar.",
        "event_type": "thunderstorm",
        "source_type": "social_rss",
        "source_name": "Bengaluru Weather Bot",
        "media_urls": []
    },
    {
        "city_key": "jaipur",
        "text": "Extreme heatwave alert across Western Rajasthan. Maximum temperature clocked at 46.8 degrees Celsius, scorching loo winds.",
        "event_type": "heatwave",
        "source_type": "imd_api",
        "source_name": "IMD Jaipur Radar & Automated Station",
        "media_urls": ["https://images.unsplash.com/photo-1504370805625-d32c54b16100?w=600"]
    },
    {
        "city_key": "jodhpur",
        "text": "Scorching sun and hot loo making it impossible to step outside. Mercury touched 47.2C.",
        "event_type": "heatwave",
        "source_type": "citizen",
        "source_name": "Desert Guardian",
        "media_urls": []
    },
    {
        "city_key": "bhubaneswar",
        "text": "Severe cyclone wind gusts exceeding 90 kmph along coastal Odisha. Tin roofs blown away and power lines snapped.",
        "event_type": "strong_wind",
        "source_type": "imd_api",
        "source_name": "Odisha Disaster Management Met Bureau",
        "media_urls": ["https://images.unsplash.com/photo-1527482797697-8795b05a13fe?w=600"]
    },
    {
        "city_key": "kolkata",
        "text": "Lightning strike near Salt Lake Sector V during heavy evening squall. Commuters stranded.",
        "event_type": "lightning",
        "source_type": "citizen",
        "source_name": "Citizen S. Banerjee",
        "media_urls": []
    },
    {
        "city_key": "shimla",
        "text": "Violent hailstorm struck apple orchards in Theog and upper Shimla. Hailstones accumulated up to 2 inches.",
        "event_type": "hailstorm",
        "source_type": "citizen",
        "source_name": "Himachal Farmer Union",
        "media_urls": ["https://images.unsplash.com/photo-1518803194621-27188ba362c9?w=600"]
    },
    {
        "city_key": "amritsar",
        "text": "Sudden blinding dust storm rolled across border belt. Sand and dust cloud plunged visibility under 100m.",
        "event_type": "dust_storm",
        "source_type": "citizen",
        "source_name": "Punjab Field Observer",
        "media_urls": []
    },
    {
        "city_key": "guwahati",
        "text": "Brahmaputra water level crossed danger mark near Kaziranga. Flood waters inundating agricultural lowlands.",
        "event_type": "flood",
        "source_type": "imd_api",
        "source_name": "Assam State Met & Flood Warning Wing",
        "media_urls": ["https://images.unsplash.com/photo-1547683905-f686c993aae5?w=600"]
    },
    {
        "city_key": "kochi",
        "text": "Monsoon downpour lashing Ernakulam marine drive. High tide alert along coastal fishing hamlets.",
        "event_type": "heavy_rainfall",
        "source_type": "citizen",
        "source_name": "Coastal Observer",
        "media_urls": []
    },
    {
        "city_key": "lucknow",
        "text": "Light continuous showers bringing relief from sultry conditions. Pleasant weather in Gomti Nagar.",
        "event_type": "rainfall",
        "source_type": "citizen",
        "source_name": "Awadh Resident",
        "media_urls": []
    }
]

def generate_sample_report(index: int = None) -> Dict[str, Any]:
    if index is not None and index < len(SIMULATED_REPORTS):
        template = SIMULATED_REPORTS[index]
    else:
        template = random.choice(SIMULATED_REPORTS)
        
    loc = INDIA_LOCATIONS.get(template["city_key"], INDIA_LOCATIONS["delhi"])
    # Add slight coordinate jitter (within ~2km) for spatial realism
    lat = loc["lat"] + (random.uniform(-0.02, 0.02))
    lon = loc["lon"] + (random.uniform(-0.02, 0.02))
    
    # Reported in the last 15 to 120 minutes
    reported_at = datetime.now(timezone.utc) - timedelta(minutes=random.randint(5, 120))
    
    return {
        "text": template["text"],
        "event_type": template["event_type"],
        "source_type": template["source_type"],
        "source_name": template["source_name"],
        "latitude": round(lat, 5),
        "longitude": round(lon, 5),
        "state": loc["state"],
        "district": loc["district"],
        "city": loc["district"],
        "reported_at": reported_at,
        "media_urls": template.get("media_urls", [])
    }
