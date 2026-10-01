# Security Specification

## Authentication
- JWT/OAuth2 for administrators
- Role-based access control
- Short-lived access tokens
- Secure refresh-token handling

## Roles
### Viewer
Read-only dashboard access.

### Analyst
Can inspect reports and analytics.

### Moderator
Can verify/reject/merge reports.

### Administrator
Can manage users, sources, configuration and system policies.

## API Security
- HTTPS only
- Input validation
- Rate limiting
- Request-size limits
- CORS allowlist
- Secure headers
- Audit logging

## Data Security
- Encrypt secrets
- Encrypt sensitive storage where appropriate
- Use least-privilege database users
- Separate raw and processed data
- Avoid unnecessary personal information

## Media Security
- Validate file type
- Limit upload size
- Malware scanning
- Store outside executable paths
- Generate signed URLs for protected objects

## ML Security
- Validate external media
- Protect model-serving endpoints
- Log model versions
- Monitor abnormal input patterns
