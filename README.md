# Okta Proxy POC

This repository is a local proof of concept for an OAuth-style flow with three apps:

- `luxhub-frontend`: starts the flow and receives the final callback
- `proxy-backend`: stores transient authorize state, owns the Okta callback, and resumes the LuxHub flow
- `treasury-frontend`: owns Treasury login and consent UI

## Current Status

Implemented so far:

- LuxHub starts the flow by calling `GET /oauth/authorize` on the proxy.
- Proxy caches the original authorize request using the LuxHub `state`.
- Proxy redirects the browser to Treasury consent at `/consent?state=...`.
- Treasury uses Okta login for Treasury users.
- Direct Treasury login at `/` does not show consent.
- Treasury consent only appears when the user arrives with a valid consent `state`.
- Treasury approval posts back to the proxy.
- Proxy redirects the browser to Okta using proxy-owned callback `http://127.0.0.1:8080/login/callback`.
- Proxy exchanges the Okta authorization code for real Okta tokens.
- Proxy stores the Okta token response and mints a proxy code like `proxy-code-...`.
- Proxy redirects back to LuxHub callback with that proxy code.
- LuxHub exchanges the proxy code at `POST /oauth/token`.
- Proxy returns the stored Okta token response for proxy codes.
- LuxHub calls `GET /api/treasury/account` with the returned access token.
- Proxy currently returns mock Treasury account data for accepted tokens.

## Current Flow

1. User opens LuxHub and clicks `Connect account`.
2. LuxHub sends `/oauth/authorize` to the proxy.
3. Proxy caches request state in memory with no time limit for the current backend process.
4. Proxy redirects browser to Treasury consent.
5. Treasury requires Okta login if the user is not already authenticated.
6. User approves consent in Treasury.
7. Treasury posts approval to the proxy.
8. Proxy starts Okta login using `/oauth/okta/start?state=...`.
9. Okta redirects to proxy `/login/callback`.
10. Proxy exchanges the Okta code, stores tokens, and redirects LuxHub callback with `proxy-code-...`.
11. LuxHub exchanges the proxy code at the proxy token endpoint.
12. LuxHub calls the mock Treasury account API using the returned access token.

## Running Apps

- LuxHub frontend: `http://127.0.0.1:5173`
- Treasury frontend: `http://127.0.0.1:5174`
- Proxy backend: `http://127.0.0.1:8080`
- Proxy health check: `http://127.0.0.1:8080/api/health`

### Start the proxy backend

Run the backend from `proxy-backend` with:

```bash
./gradlew bootRun --no-daemon
```

## Important Config

### Treasury frontend

Treasury expects local Okta SPA config in `treasury-frontend/.env`:

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
- Treasury consent no longer has a countdown timer in this POC.
- `ProxyTokenStore` stores Okta token responses for proxy-issued codes until the backend restarts.
- LuxHub now treats the cached authorize request as optional during callback processing.
- `GET /api/treasury/account` is still a mock endpoint. It accepts demo tokens and proxy-stored Okta access tokens, but it does not yet call a real Treasury API.

## Known Challenges

- LuxHub callback behavior has been unstable in Vite dev mode. We saw blank or flickering callback pages before adding stronger error handling.
- Browser-side debugging is still weak because this session does not have browser-control MCP access.
- The callback page can fail due to dev-server issues, host/port mismatches, or transient frontend runtime errors that do not come from the proxy.
- `GET /api/treasury/account` is not a real downstream Treasury call yet. It only returns mock account data.
- The current POC still mixes real Okta login with mock Treasury resource access.
- CORS and callback URLs are sensitive to exact host/port values such as `127.0.0.1` vs `localhost`, and `5173` vs `5175`.

## Next Likely Steps

- Add browser MCP access or stronger in-page debug output for frontend troubleshooting.
- Stabilize LuxHub callback behavior in dev mode.
- Replace mock Treasury account endpoint with a real downstream API call if needed.
- Decide whether the proxy should keep owning the token exchange long-term or whether Treasury should issue/mediate resource access directly.
