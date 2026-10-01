# Analytics Specification

## Dashboard KPIs
- Total reports
- Reports in last hour
- Verified reports
- Pending reports
- Rejected reports
- Duplicate reports
- Active weather events
- High-confidence events
- Reports by state

## Filters
- Date/time range
- State
- District/city
- Event type
- Verification status
- Confidence range
- Source type

## Visualizations
- Live India event map
- State-wise event density
- Event-type distribution
- Time-series of reports
- Verification funnel
- Source reliability
- Hotspot map
- Event lifecycle

## Derived Metrics
### Verification Rate
`verified_reports / total_processed_reports`

### Duplicate Rate
`duplicate_reports / total_reports`

### Average Processing Latency
`dashboard_timestamp - ingestion_timestamp`

### Event Corroboration
Number of independent reports supporting the same event.
