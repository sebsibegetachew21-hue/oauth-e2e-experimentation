# MCP Resume Notes

This file captures the current state before restarting Codex to enable browser MCP.

## Why This Exists

The local OAuth POC is working far enough on the backend, but browser-side callback behavior in `thirdparty-app-frontend` has been unstable in Vite dev mode. The next step is to enable a browser MCP so future sessions can inspect the actual page, console, and flow directly.

## Current Project State

- `proxy-backend` is running the main orchestration flow.
- `thirdparty-app-frontend` is the initiating app and callback receiver.
- `resource-app-frontend` owns resource app login and consent.
- Proxy authorize-request cache TTL is now 5 minutes.
- Resource app consent countdown is also 5 minutes.
- Proxy approval now routes through proxy-owned Okta login and callback.
- Proxy exchanges the real Okta code and stores token responses in `ProxyTokenStore`.
- The third-party app exchanges `proxy-code-*` codes through the proxy token endpoint.
- Resource app account info is still mocked in the proxy backend.

## Important Files Changed Recently

- `README.md`
- `proxy-backend/src/main/java/com/example/poc/controller/FlowController.java`
- `proxy-backend/src/main/java/com/example/poc/service/AuthorizeRequestStore.java`
- `proxy-backend/src/main/java/com/example/poc/service/ProxyTokenStore.java`
- `proxy-backend/src/main/java/com/example/poc/model/ProxyCallbackState.java`
- `thirdparty-app-frontend/src/App.jsx`
- `thirdparty-app-frontend/src/main.jsx`
- `thirdparty-app-frontend/vite.config.js`
- `resource-app-frontend/src/App.jsx`

## Browser Symptom

Observed issue:

- after approve, the third-party app callback sometimes appeared blank
- later it rendered but showed transient or disappearing errors
- one concrete callback error was `Failed to load cached request`
- that was due to the short-lived authorize cache, which has since been increased to 5 minutes

Current understanding:

- backend token exchange works
- proxy code exchange works
- callback route is served correctly by Vite
- remaining instability is browser/dev-mode side, not the main proxy flow itself

## Verified Backend Behavior

From logs and direct endpoint checks:

- authorize request is cached successfully
- resource app consent reaches the proxy
- proxy starts Okta login
- Okta redirects back to proxy `/login/callback`
- proxy stores real Okta token response
- `POST /oauth/token` returns the stored Okta token response for `proxy-code-*`

## Current Local URLs

- Third-party app: `http://127.0.0.1:5173`
- Resource app: `http://127.0.0.1:5174`
- Proxy: `http://127.0.0.1:8080`
- Proxy health: `http://127.0.0.1:8080/api/health`

## MCP Setup Progress

Already verified:

- `node -v` -> `v22.22.0`
- `npx -v` -> `10.9.4`
- Codex config file exists at `~/.codex/config.toml`

Planned MCP config addition:

```toml
[mcp_servers.playwright]
command = "npx"
args = ["-y", "@playwright/mcp@latest"]
```

## What To Do Next

1. Append the Playwright MCP config block to `~/.codex/config.toml`.
2. Fully restart Codex.
3. Start a new session.
4. In the new session, confirm Playwright MCP tools are available.
5. Use MCP browser access to inspect the third-party app callback page directly.

## Suggested First Prompt In New Session

Use this prompt after restart:

`Read MCP_RESUME.md and continue setting up Playwright MCP, then inspect the third-party app callback flow in the browser.`
