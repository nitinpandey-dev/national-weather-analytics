# Database Schema

## Core Tables

### weather_reports
- id UUID PK
- source_id FK
- external_id
- raw_payload_uri
- text
- event_type
- event_confidence
- reported_at
- ingested_at
- verification_status
- latitude
- longitude
- location GEOGRAPHY(Point, 4326)
- language
- created_at

### sources
- id UUID PK
- name
- source_type
- reliability_score
- verified
- metadata
- created_at

### media
- id UUID PK
- report_id FK
- object_uri
- media_type
- sha256
- perceptual_hash
- metadata

### weather_events
- id UUID PK
- event_type
- title
- centroid
- start_time
- end_time
- confidence
- status
- created_at

### report_event_links
- report_id FK
- event_id FK
- relationship_type

### verification_results
- id UUID PK
- report_id FK
- source_score
- temporal_score
- spatial_score
- corroboration_score
- media_score
- duplicate_penalty
- final_score
- model_version
- decision
- created_at

### audit_logs
- id UUID PK
- actor_id
- action
- entity_type
- entity_id
- old_value
- new_value
- timestamp

## Important Indexes
- PostGIS spatial index on `location`
- B-tree index on `reported_at`
- B-tree index on `event_type`
- B-tree index on `verification_status`
- Hash/index strategy for media fingerprints
