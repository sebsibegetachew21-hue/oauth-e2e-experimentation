# Architecture

This POC has four actors:

- `LuxHub`: the OAuth client that starts the original `GET /authorize` request and later receives the final authorization code.
- `Proxy`: the orchestration layer that pauses LuxHub's authorize request, stores its parameters, sends the browser through a consent detour, and resumes the original flow afterward.
- `Okta`: the identity layer that authenticates the user and issues the final authorization code for the LuxHub OAuth client.
- `Treasury`: the consent and protected-resource domain. For the POC it is usually a mock app that shows a consent screen and redirects back to the proxy after approval.

## Responsibility Split

- `Okta` answers "who is the user?"
- `Treasury` answers "does the user approve LuxHub's access?"
- `Proxy` answers "how do we preserve the original OAuth request while consent happens elsewhere?"
- `LuxHub` answers "which OAuth client receives the final code and later exchanges it for tokens?"

## Out Of Scope

- `Ping`
- real account APIs unless explicitly requested
- production-grade consent persistence
- proxying `/token` by default

## Design Intent

The proxy exists to combine two different journeys:

1. LuxHub's normal OAuth authorization request
2. an internal login and consent journey that must complete first

The proxy should not become the system of record for identity, consent, or token issuance. It only coordinates redirects and request restoration.
