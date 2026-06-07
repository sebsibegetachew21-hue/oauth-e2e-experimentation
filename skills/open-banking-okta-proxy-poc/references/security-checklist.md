# Security Checklist

Use this checklist whenever implementing or reviewing the POC.

## Request Handling

- validate required query parameters on inbound `GET /authorize`
- whitelist forwarded OAuth parameters rather than forwarding arbitrary query strings
- verify callback inputs before resuming the original flow

## Cache Handling

- use short TTL, such as 5 minutes
- delete cached entries after successful use
- reject replay attempts for already-consumed state
- avoid storing more user context than needed to rebuild the authorize request

## State And PKCE

- preserve the third-party app `state` accurately
- keep any proxy-specific correlation id distinct
- preserve `code_challenge` values unchanged

## Logging

- do not log client secrets
- do not log tokens
- avoid logging full authorize payloads in plaintext

## Token Proxying

- do not add proxy `/token` unless required by the task
- if added, treat it as a higher-risk surface and review request forwarding, client authentication, and logging behavior explicitly
