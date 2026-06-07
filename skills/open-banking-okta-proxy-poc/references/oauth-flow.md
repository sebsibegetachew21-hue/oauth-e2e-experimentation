# OAuth Flow

## Main Flow

1. The third-party app calls proxy `GET /authorize` with standard OAuth or OIDC query parameters.
2. The proxy validates required inputs and caches the original authorize request under a short-lived key derived from `state`.
3. The proxy redirects the browser into the resource app login and consent journey, usually through an Okta-backed app.
4. The user authenticates with `Okta`.
5. The resource app renders consent and collects approval.
6. The resource app redirects back to proxy `GET /tpd/callback` with the third-party app state or a value that can recover it.
7. The proxy loads the original cached authorize request.
8. The proxy rebuilds the original third-party app authorize call and redirects the browser to `Okta /authorize`.
9. `Okta` sees the user session and returns an authorization code to the third-party app original `redirect_uri`.
10. The third-party app exchanges the code for tokens with `Okta`.

## State Handling

- Preserve the third-party app incoming `state`.
- If the consent detour needs its own correlation id, keep that distinct from the original third-party app `state`.
- Cache entries should expire quickly and be deleted after successful resume.

## PKCE Handling

- Treat `code_challenge` and `code_challenge_method` as part of the original third-party app request.
- The proxy stores and forwards them unchanged when resuming the authorize request.
- The proxy should not generate a new PKCE challenge for the third-party app final flow.

## Optional Token Proxying

Only add proxy `POST /token` if the user explicitly needs a single public domain for both authorize and token endpoints. Otherwise keep token exchange direct between the third-party app and Okta.
