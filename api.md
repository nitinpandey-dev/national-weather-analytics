# API Specification

## Reports
`GET /api/v1/reports`

Query parameters:
- `from`
- `to`
- `event_type`
- `status`
- `state`
- `limit`
- `offset`

## Report Detail
`GET /api/v1/reports/{report_id}`

## Citizen Submission
`POST /api/v1/reports`

## Verification
`POST /api/v1/reports/{report_id}/verify`

## Reject
`POST /api/v1/reports/{report_id}/reject`

## Merge
`POST /api/v1/reports/merge`

## Events
`GET /api/v1/events`

`GET /api/v1/events/{event_id}`

## Analytics
`GET /api/v1/analytics/summary`

`GET /api/v1/analytics/timeseries`

## Health
`GET /health`

## WebSocket
`/ws/events`

The WebSocket should publish newly processed or materially updated events to connected dashboards.
