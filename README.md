# National Weather Big Data Analytics Platform

## Problem Statement
**SIH 2026 PS 26069 — National Weather Big Data Analytics Platform**

A scalable platform for collecting, processing, verifying, deduplicating, classifying, storing, and visualizing real-time weather-related information for India.

## Core Pipeline
`Sources → Ingestion → Stream Processing → AI/ML → Verification → Deduplication → Geospatial Processing → Storage → APIs → Dashboard/Alerts`

## Main Capabilities
- Multi-source weather report ingestion
- Citizen and social-media report processing
- Weather-event classification
- Fake/misleading report detection
- Duplicate/event clustering
- Location extraction and geocoding
- Confidence and verification scoring
- Real-time map visualization
- Date/event/location filtering
- Admin review workflow
- Analytics and alerts

## Suggested Repository Structure
```text
weather-platform/
├── frontend/
├── backend/
├── ingestion/
├── ml/
├── data/
├── infrastructure/
├── docs/
└── tests/
```
