# API Contracts

These contracts are intentionally minimal for the POC.

## Proxy `GET /authorize`

Purpose:
- receive the third-party app original OAuth authorize request
- validate and cache the request
- redirect the browser into the resource app login and consent journey

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
- redirect to the resource app start URL with enough correlation data to return later

## Resource App `GET /consent`

Purpose:
- display the consent page after successful login

Expected data:
- third-party app correlation value, directly or indirectly

Behavior:
- render requested access in a simplified form for the POC
- send approval to a local endpoint that redirects back to proxy callback

## Proxy `GET /tpd/callback`

Purpose:
- receive control back after resource app consent
- restore cached third-party app authorize parameters
- redirect to Okta authorize for the original third-party app client

Expected inbound parameters:
- `state` or another callback value that can restore the original third-party app state

Behavior:
- load cached request
- rebuild original authorize URL
- redirect browser to Okta
- consume cache entry after successful redirect decision

## Optional Proxy `POST /token`

Only define this if the task explicitly requires it.

Purpose:
- forward third-party app token exchange requests to Okta

Default recommendation:
- skip this endpoint for the local POC
