# System Design

## Architecture Principles
- Event-driven processing
- Modular services
- Horizontal scalability
- API-first backend
- Geospatial-first data model
- Human-in-the-loop verification

## Major Components

| Component | Responsibility |
|---|---|
| Source Connectors | Collect external data |
| Ingestion Gateway | Validate and normalize incoming data |
| Message Broker | Buffer and distribute events |
| Stream Processor | Real-time enrichment |
| NLP Service | Text extraction/classification |
| Vision Service | Image/video analysis |
| Verification Engine | Trust and evidence fusion |
| Deduplication Engine | Detect repeated reports |
| Geo Service | Geocoding and spatial operations |
| Storage | Structured + object data |
| API Gateway | Client access |
| Dashboard | Visualization |
| Admin Panel | Moderation |

## Evidence Fusion

A report should not be marked verified from a single weak signal. Combine:
- source reliability
- temporal consistency
- spatial consistency
- agreement with other reports
- official/open weather observations
- media analysis
- duplicate/recycled-content indicators

## Design Rule
AI should provide evidence and confidence to the administrator rather than silently making irreversible moderation decisions.
