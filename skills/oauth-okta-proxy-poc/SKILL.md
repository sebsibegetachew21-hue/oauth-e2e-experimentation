---
name: oauth-okta-proxy-poc
description: Use when building or iterating on a local proof of concept for an OAuth or OIDC proxy that intercepts third-party app authorize requests, detours through Okta-backed resource app consent, then resumes the original authorization flow. Applies to architecture clarification, endpoint design, local Okta setup, request and state handling, and POC scoping. Excludes Ping-specific implementation unless the user explicitly adds it back.
---

# OAuth Okta Proxy POC

Use this skill when the task is to design, explain, or implement a local proof of concept for the proxy flow where:

- the third-party app starts with `GET /authorize`
- the proxy caches the original OAuth request
- the browser is redirected through `Okta` and a resource app consent step
- the proxy resumes the original authorize request after consent
- the third-party app eventually receives the final authorization code

## Workflow

1. Read [references/local-poc-scope.md](references/local-poc-scope.md) to confirm what stays real versus mocked.
2. Read [references/architecture.md](references/architecture.md) for actor responsibilities.
3. Read [references/oauth-flow.md](references/oauth-flow.md) when reasoning about redirects, state, PKCE, and callback order.
4. Read [references/api-contracts.md](references/api-contracts.md) before defining endpoints or request handling.
5. Read [references/okta-setup.md](references/okta-setup.md) when configuring local redirect URIs and Okta apps.
6. Read [references/security-checklist.md](references/security-checklist.md) before finalizing behavior around cache, state, or token handling.

## Default Build Constraints

- Prefer a local POC with three apps: `proxy`, `resource-app-mock`, and `third-party-app-mock`.
- Keep `Ping` out of scope unless explicitly requested.
- Prefer direct `/token` exchange between the third-party app and `Okta`.
- Only proxy `/token` if the user explicitly requires the same public domain for both `/authorize` and `/token`.
- Start with in-memory cache. Add Redis only if the task specifically needs shared state or realistic deployment behavior.
- Preserve original third-party app parameters exactly where possible:
  - `client_id`
  - `redirect_uri`
  - `state`
  - `scope`
  - `response_type`
  - `code_challenge`
  - `code_challenge_method`

## Implementation Priorities

- Treat the proxy as a stateful orchestration layer, not as a second authorization server.
- Separate the resource app consent journey from the third-party app final authorization result.
- Resume the original third-party app authorize request only after the consent callback succeeds.
- Make cached authorize requests short-lived and one-time-use.
- Do not leak tokens, secrets, or full authorize payloads into logs.

## When To Avoid This Skill

- The user only wants a standard direct Okta social login with no consent detour.
- The user wants a production-grade platform design rather than a local POC.
- The task is primarily about Ping federation internals.
