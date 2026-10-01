# Implementation Plan

## Phase 1 — Foundation
- Create monorepo
- Configure Docker
- Create FastAPI backend
- Create React frontend
- Configure PostgreSQL/PostGIS
- Add Redis

## Phase 2 — Ingestion
- Implement source connector interface
- Build API/dataset adapters
- Add citizen-report endpoint
- Publish normalized messages to Kafka/Redpanda

## Phase 3 — Processing
- Text normalization
- Language detection
- Entity extraction
- Location extraction
- Timestamp normalization
- Media metadata extraction

## Phase 4 — AI
- Weather-event classifier
- Source/reliability model
- Duplicate similarity model
- Image verification pipeline
- Confidence-score service

## Phase 5 — Dashboard
- India map
- Live event feed
- Filters
- Event details
- Analytics
- Admin review queue

## Phase 6 — Hardening
- Authentication
- Rate limiting
- Audit logging
- Monitoring
- Tests
- Load testing
- Deployment

## Definition of Done
Every accepted report must be traceable from its source through processing, model decisions, verification status and final dashboard representation.
