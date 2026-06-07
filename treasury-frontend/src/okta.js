import { OktaAuth } from '@okta/okta-auth-js'

const issuer = import.meta.env.VITE_OKTA_ISSUER
const clientId = import.meta.env.VITE_OKTA_CLIENT_ID
const scopes = (import.meta.env.VITE_OKTA_SCOPES ?? 'openid,profile,email')
  .split(',')
  .map((scope) => scope.trim())
  .filter(Boolean)

export const oktaConfigured = Boolean(issuer && clientId)

export const oktaAuth = oktaConfigured
  ? new OktaAuth({
      issuer,
      clientId,
      redirectUri: `${window.location.origin}/login/callback`,
      postLogoutRedirectUri: `${window.location.origin}/`,
      scopes,
      pkce: true
    })
  : null

