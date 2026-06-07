# Local POC Scope

## Implement

- a proxy endpoint that intercepts third-party app `GET /authorize`
- short-lived storage for original authorize parameters
- a resource app mock app with a consent page and approve action
- an Okta-backed login before the resource app consent page
- a proxy callback endpoint that resumes the original third-party app authorize request
- a third-party app mock callback page that displays the returned authorization code

## Mock Or Simplify

- resource app business logic
- account data APIs
- production consent records
- Redis, unless shared cache behavior is explicitly required
- token proxying
- advanced MFA, routing rules, or federation chains outside Okta

## Success Criteria

- user starts at the third-party app
- proxy stores original authorize request
- user signs in with Okta
- user approves resource app consent
- proxy resumes original third-party app authorize request
- the third-party app receives an authorization code at its configured redirect URI

## Non-Goals

- full standards compliance
- production hardening
- enterprise SSO edge cases
