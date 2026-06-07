# Okta Setup

For a minimal POC, prefer two Okta app integrations:

- `third-party-app-local`
- `resource-app-local`

## Suggested Local Redirect URIs

- `third-party-app-local`: `http://localhost:8083/callback`
- `resource-app-local`: `http://localhost:8082/login/callback`

## Third-Party App Expectations

- OIDC app integration
- authorization code flow
- PKCE enabled if the third-party app acts like a public client
- scopes aligned to the POC, often `openid profile email`

## Resource App Expectations

- OIDC app integration used only to establish user authentication before consent
- redirects back into the local resource app mock app

## Proxy Expectations

The proxy is usually not registered as the final third-party app callback target. The original third-party app `redirect_uri` remains owned by the third-party app. The proxy handles only:

- inbound third-party app `GET /authorize`
- resource app callback after consent

If the design changes so that the proxy fronts more of the OAuth surface, update the API contracts and security checklist first.
