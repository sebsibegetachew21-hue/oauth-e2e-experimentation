# Sequence Flow

Text version of the local POC sequence:

1. `Third-Party App -> Proxy`: `GET /authorize`
2. `Proxy -> Cache`: store original authorize request by state
3. `Proxy -> Okta/Resource App`: redirect browser into login and consent journey
4. `User -> Okta`: authenticate
5. `Okta -> Resource App`: return authenticated user to consent app
6. `Resource App -> User`: render consent
7. `User -> Resource App`: approve consent
8. `Resource App -> Proxy`: `GET /tpd/callback?state=...`
9. `Proxy -> Cache`: restore original third-party app authorize request
10. `Proxy -> Okta`: redirect to rebuilt original `/authorize`
11. `Okta -> Third-Party App redirect_uri`: return authorization code
12. `Third-Party App -> Okta`: exchange code for tokens
