# Architecture

This POC has four actors:

- `Third-Party App`: the OAuth client that starts the original `GET /authorize` request and later receives the final authorization code.
- `Proxy`: the orchestration layer that pauses the third-party app authorize request, stores its parameters, sends the browser through a consent detour, and resumes the original flow afterward.
- `Okta`: the identity layer that authenticates the user and issues the final authorization code for the third-party app OAuth client.
- `Resource App`: the consent and protected-resource domain. For the POC it is usually a mock app that shows a consent screen and redirects back to the proxy after approval.

## Responsibility Split

- `Okta` answers "who is the user?"
- `Resource App` answers "does the user approve the third-party app access?"
- `Proxy` answers "how do we preserve the original OAuth request while consent happens elsewhere?"
- `Third-Party App` answers "which OAuth client receives the final code and later exchanges it for tokens?"

## Out Of Scope

- `Ping`
- real account APIs unless explicitly requested
- production-grade consent persistence
- proxying `/token` by default

## Design Intent

The proxy exists to combine two different journeys:

1. The third-party app normal OAuth authorization request
2. an internal login and consent journey that must complete first

The proxy should not become the system of record for identity, consent, or token issuance. It only coordinates redirects and request restoration.
