# Engineering and Data Rules

## Data Rules
1. Preserve original source payloads where legally and technically permitted.
2. Never overwrite raw data with normalized data.
3. Store timestamps in UTC and render them in IST where appropriate.
4. Store coordinates as geospatial types.
5. Record source and ingestion timestamps separately.
6. Assign a unique report ID to every incoming report.

## AI Rules
1. Never treat model confidence as ground truth.
2. Keep model version with every prediction.
3. Store prediction explanations/evidence where possible.
4. Use thresholds that can be configured and audited.
5. Human review must remain available for uncertain cases.

## Deduplication Rules
- Exact duplicate → merge.
- Same media hash → investigate as duplicate.
- Near-identical text → similarity check.
- Same event/time/location cluster → event aggregation.
- Do not delete the original evidence; maintain relationships.

## API Rules
- Validate all incoming payloads.
- Use pagination.
- Apply rate limits.
- Return stable error formats.
- Version public APIs.

## Code Rules
- Type-safe interfaces
- Environment variables for secrets
- Unit and integration tests
- No credentials committed to Git
