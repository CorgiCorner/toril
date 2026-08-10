# Security policy

Never open a public issue for a suspected vulnerability, and never include
secrets or exploit details in a public discussion.

Report security issues confidentially through
[GitHub Private Vulnerability Reporting](https://github.com/CorgiCorner/toril/security/advisories/new).
Include the affected Toril version, impact, reproduction steps, and any known
mitigations. Remove credentials, production connection strings, personal data,
and unrelated customer data from the report.

Only the latest released version is eligible for security fixes. The latest
distribution foundation release is currently `v0.0.6`. Its container does not
connect to Redis. Toril Doctor connects to the Redis endpoint supplied by the
operator and performs only the documented read-only preflight commands.
