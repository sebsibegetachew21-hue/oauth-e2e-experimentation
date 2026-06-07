# Sequence Flow

Text version of the local POC sequence:

1. `LuxHub -> Proxy`: `GET /authorize`
2. `Proxy -> Cache`: store original authorize request by state
3. `Proxy -> Okta/Treasury`: redirect browser into login and consent journey
4. `User -> Okta`: authenticate
5. `Okta -> Treasury`: return authenticated user to consent app
6. `Treasury -> User`: render consent
7. `User -> Treasury`: approve consent
8. `Treasury -> Proxy`: `GET /tpd/callback?state=...`
9. `Proxy -> Cache`: restore original LuxHub authorize request
10. `Proxy -> Okta`: redirect to rebuilt original `/authorize`
11. `Okta -> LuxHub redirect_uri`: return authorization code
12. `LuxHub -> Okta`: exchange code for tokens
