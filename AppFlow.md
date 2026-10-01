# Application Flow

## End-to-End Flow

```text
Weather Sources
     ↓
Source Connectors
     ↓
Message Queue
     ↓
Raw Data Validation
     ↓
Normalization
     ↓
NLP / Image / Metadata Extraction
     ↓
Event Classification
     ↓
Location & Time Resolution
     ↓
Duplicate / Event Clustering
     ↓
Verification Engine
     ↓
Confidence Score
     ↓
PostgreSQL + PostGIS
     ↓
FastAPI
     ↓
WebSocket / REST
     ↓
React Dashboard
```

## Report Lifecycle

```text
RECEIVED
   ↓
NORMALIZED
   ↓
CLASSIFIED
   ↓
GEOLOCATED
   ↓
DEDUPLICATED
   ↓
VERIFICATION_PENDING
   ↓
VERIFIED / REJECTED / NEEDS_REVIEW
```

## Real-Time Path
Kafka/Redpanda receives new reports → stream processor enriches them → verification pipeline evaluates them → database is updated → WebSocket broadcasts the new event to the dashboard.
