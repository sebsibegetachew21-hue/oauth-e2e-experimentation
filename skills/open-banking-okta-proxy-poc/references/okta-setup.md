# Okta Setup

For a minimal POC, prefer two Okta app integrations:

- `luxhub-local`
- `treasury-local`

## Suggested Local Redirect URIs

- `luxhub-local`: `http://localhost:8083/callback`
- `treasury-local`: `http://localhost:8082/login/callback`

## LuxHub App Expectations

- OIDC app integration
- authorization code flow
- PKCE enabled if LuxHub acts like a public client
- scopes aligned to the POC, often `openid profile email`

## Treasury App Expectations

- OIDC app integration used only to establish user authentication before consent
- redirects back into the local Treasury mock app

## Proxy Expectations

The proxy is usually not registered as the final LuxHub callback target. The original LuxHub `redirect_uri` remains owned by LuxHub. The proxy handles only:

- inbound LuxHub `GET /authorize`
- Treasury callback after consent

If the design changes so that the proxy fronts more of the OAuth surface, update the API contracts and security checklist first.
