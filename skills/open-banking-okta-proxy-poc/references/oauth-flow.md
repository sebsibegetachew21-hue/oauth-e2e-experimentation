# OAuth Flow

## Main Flow

1. `LuxHub` calls proxy `GET /authorize` with standard OAuth or OIDC query parameters.
2. The proxy validates required inputs and caches the original authorize request under a short-lived key derived from `state`.
3. The proxy redirects the browser into the `Treasury` login and consent journey, usually through an Okta-backed app.
4. The user authenticates with `Okta`.
5. `Treasury` renders consent and collects approval.
6. `Treasury` redirects back to proxy `GET /tpd/callback` with the LuxHub state or a value that can recover it.
7. The proxy loads the original cached authorize request.
8. The proxy rebuilds the original LuxHub authorize call and redirects the browser to `Okta /authorize`.
9. `Okta` sees the user session and returns an authorization code to LuxHub's original `redirect_uri`.
10. `LuxHub` exchanges the code for tokens with `Okta`.

## State Handling

- Preserve LuxHub's incoming `state`.
- If the consent detour needs its own correlation id, keep that distinct from the original LuxHub `state`.
- Cache entries should expire quickly and be deleted after successful resume.

## PKCE Handling

- Treat `code_challenge` and `code_challenge_method` as part of the original LuxHub request.
- The proxy stores and forwards them unchanged when resuming the authorize request.
- The proxy should not generate a new PKCE challenge for LuxHub's final flow.

## Optional Token Proxying

Only add proxy `POST /token` if the user explicitly needs a single public domain for both authorize and token endpoints. Otherwise keep token exchange direct between LuxHub and Okta.
