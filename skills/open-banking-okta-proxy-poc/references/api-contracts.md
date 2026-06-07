# API Contracts

These contracts are intentionally minimal for the POC.

## Proxy `GET /authorize`

Purpose:
- receive LuxHub's original OAuth authorize request
- validate and cache the request
- redirect the browser into the Treasury login and consent journey

Expected inbound parameters:
- `client_id`
- `redirect_uri`
- `response_type`
- `scope`
- `state`
- `code_challenge`
- `code_challenge_method`

Behavior:
- reject requests missing required fields
- store a normalized request object keyed by state or a stable derived key
- redirect to the Treasury start URL with enough correlation data to return later

## Treasury `GET /consent`

Purpose:
- display the consent page after successful login

Expected data:
- LuxHub correlation value, directly or indirectly

Behavior:
- render requested access in a simplified form for the POC
- send approval to a local endpoint that redirects back to proxy callback

## Proxy `GET /tpd/callback`

Purpose:
- receive control back after Treasury consent
- restore cached LuxHub authorize parameters
- redirect to Okta authorize for the original LuxHub client

Expected inbound parameters:
- `state` or another callback value that can restore the original LuxHub state

Behavior:
- load cached request
- rebuild original authorize URL
- redirect browser to Okta
- consume cache entry after successful redirect decision

## Optional Proxy `POST /token`

Only define this if the task explicitly requires it.

Purpose:
- forward LuxHub token exchange requests to Okta

Default recommendation:
- skip this endpoint for the local POC
