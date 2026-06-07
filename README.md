# Okta Proxy POC

This repository is a local proof of concept for an OAuth-style flow with three apps:

- `thirdparty-app-frontend`: the third-party app that starts the flow and receives the final callback
- `proxy-backend`: stores transient authorize state, owns the Okta callback, and resumes the third-party app flow
- `resource-app-frontend`: the resource app that owns login, consent, and account access UI

## Current Status

Implemented so far:

- The third-party app starts the flow by calling `GET /oauth/authorize` on the proxy.
- Proxy caches the original authorize request using the third-party app `state`.
- Proxy redirects the browser to the resource app consent page at `/consent?state=...`.
- The resource app uses Okta login for local users.
- Direct resource app login at `/` does not show consent.
- Resource app consent only appears when the user arrives with a valid consent `state`.
- Resource app approval posts back to the proxy.
- Proxy redirects the browser to Okta using proxy-owned callback `http://127.0.0.1:8080/login/callback`.
- Proxy exchanges the Okta authorization code for real Okta tokens.
- Proxy stores the Okta token response and mints a proxy code like `proxy-code-...`.
- Proxy redirects back to the third-party app callback with that proxy code.
- The third-party app exchanges the proxy code at `POST /oauth/token`.
- Proxy returns the stored Okta token response for proxy codes.
- The third-party app calls `GET /api/resource-app/account` with the returned access token.
- Proxy currently returns mock resource app account data for accepted tokens.

## Current Flow

1. User opens the third-party app and clicks `Connect account`.
2. The third-party app sends `/oauth/authorize` to the proxy.
3. Proxy caches request state in memory with no time limit for the current backend process.
4. Proxy redirects browser to the resource app consent page.
5. The resource app requires Okta login if the user is not already authenticated.
6. User approves consent in the resource app.
7. The resource app posts approval to the proxy.
8. Proxy starts Okta login using `/oauth/okta/start?state=...`.
9. Okta redirects to proxy `/login/callback`.
10. Proxy exchanges the Okta code, stores tokens, and redirects the third-party app callback with `proxy-code-...`.
11. The third-party app exchanges the proxy code at the proxy token endpoint.
12. The third-party app calls the mock resource app account API using the returned access token.

## Running Apps

- Third-party app frontend: `http://127.0.0.1:5173`
- Resource app frontend: `http://127.0.0.1:5174`
- Proxy backend: `http://127.0.0.1:8080`
- Proxy health check: `http://127.0.0.1:8080/api/health`

### Start the proxy backend

Run the backend from `proxy-backend` with:

```bash
./gradlew bootRun --no-daemon
```

## Important Config

### Resource app frontend

The resource app expects local Okta SPA config in `resource-app-frontend/.env`:

- `VITE_OKTA_ISSUER`
- `VITE_OKTA_CLIENT_ID`
- `VITE_OKTA_SCOPES`

### Proxy backend

Proxy expects Okta web app config from environment-backed properties:

- `OKTA_ISSUER`
- `OKTA_CLIENT_ID`
- `OKTA_CLIENT_SECRET`
- `OKTA_REDIRECT_URI=http://127.0.0.1:8080/login/callback`

## Key Implementation Notes

- `AuthorizeRequestStore` keeps proxy authorize state in memory until the backend restarts.
- Resource app consent no longer has a countdown timer in this POC.
- `ProxyTokenStore` stores Okta token responses for proxy-issued codes until the backend restarts.
- The third-party app now treats the cached authorize request as optional during callback processing.
- `GET /api/resource-app/account` is still a mock endpoint. It accepts demo tokens and proxy-stored Okta access tokens, but it does not yet call a real resource app API.

## Known Challenges

- Third-party app callback behavior has been unstable in Vite dev mode. We saw blank or flickering callback pages before adding stronger error handling.
- Browser-side debugging is still weak because this session does not have browser-control MCP access.
- The callback page can fail due to dev-server issues, host/port mismatches, or transient frontend runtime errors that do not come from the proxy.
- `GET /api/resource-app/account` is not a real downstream resource app call yet. It only returns mock account data.
- The current POC still mixes real Okta login with mock resource app access.
- CORS and callback URLs are sensitive to exact host/port values such as `127.0.0.1` vs `localhost`, and `5173` vs `5175`.

## Next Likely Steps

- Add browser MCP access or stronger in-page debug output for frontend troubleshooting.
- Stabilize third-party app callback behavior in dev mode.
- Replace mock resource app account endpoint with a real downstream API call if needed.
- Decide whether the proxy should keep owning the token exchange long-term or whether the resource app should issue or mediate resource access directly.
