# Weather Data Pipeline

## Purpose
Defines how heterogeneous weather observations become normalized weather events.

## Input Types
- Structured API observations
- Public datasets
- Web content
- Social/public posts where permitted
- Citizen reports
- Images and videos

## Normalization

Every report should be converted into a common structure:

```json
{
  "report_id": "uuid",
  "source": "citizen",
  "timestamp": "2026-10-02T00:00:00Z",
  "text": "Heavy rainfall reported...",
  "event_type": "heavy_rainfall",
  "latitude": 25.43,
  "longitude": 81.85,
  "media": [],
  "verification_status": "pending"
}
```

## Processing Stages
1. Ingest
2. Validate
3. Normalize
4. Enrich
5. Classify
6. Geolocate
7. Deduplicate
8. Corroborate
9. Score
10. Persist
11. Broadcast

## Event Types
- Rainfall
- Heavy rainfall
- Thunderstorm
- Flood
- Heatwave
- Fog
- Dust storm
- Strong wind
- Hailstorm
- Lightning
- Other/unknown

## Event Aggregation
Multiple reports referring to the same spatial-temporal phenomenon should be clustered into one event while retaining all supporting reports.
