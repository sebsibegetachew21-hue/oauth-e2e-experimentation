import { useEffect, useState } from 'react'

const apiBaseUrl = import.meta.env.VITE_PROXY_BASE_URL ?? 'http://127.0.0.1:8080'
const luxhubClientId = import.meta.env.VITE_LUXHUB_CLIENT_ID ?? 'luxhub-local'
const luxhubRedirectUri =
  import.meta.env.VITE_LUXHUB_REDIRECT_URI ?? `${window.location.origin}/callback`
const luxhubScope = import.meta.env.VITE_LUXHUB_SCOPE ?? 'openid accounts'
const luxhubResponseType = import.meta.env.VITE_LUXHUB_RESPONSE_TYPE ?? 'code'
const codeChallengeMethod = import.meta.env.VITE_LUXHUB_CODE_CHALLENGE_METHOD ?? 'S256'

function logCallbackEvent(event, payload) {
  console.log(`[LuxHub callback] ${event}`, payload)
}

function logTokenDetails(tokenResponse) {
  console.log('[LuxHub callback] proxy access_token', tokenResponse.access_token ?? null)
  console.log('[LuxHub callback] proxy id_token', tokenResponse.id_token ?? null)
  console.log('[LuxHub callback] proxy token_type', tokenResponse.token_type ?? null)
  console.log('[LuxHub callback] proxy expires_in', tokenResponse.expires_in ?? null)
  console.log('[LuxHub callback] proxy scope', tokenResponse.scope ?? null)
  console.log('[LuxHub callback] proxy token response json', JSON.stringify(tokenResponse, null, 2))
}

function buildRandomValue(prefix) {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)

  return `${prefix}-${randomPart}`
}

function buildAuthorizeUrl() {
  const params = new URLSearchParams({
    client_id: luxhubClientId,
    redirect_uri: luxhubRedirectUri,
    response_type: luxhubResponseType,
    scope: luxhubScope,
    state: buildRandomValue('luxhub-state'),
    code_challenge: buildRandomValue('pkce'),
    code_challenge_method: codeChallengeMethod
  })

  return `${apiBaseUrl}/oauth/authorize?${params.toString()}`
}

function HomePage() {
  return (
    <main className="page">
      <section className="card">
        <p className="eyebrow">LuxHub Mock</p>
        <h1>Start the proxy flow</h1>
        <p className="body">
          LuxHub only starts the OAuth request and receives the final code. Consent now lives in a
          separate Treasury frontend, which now handles its own Okta login.
        </p>
        <div className="detail">
          <span>Client</span>
          <strong>{luxhubClientId}</strong>
        </div>
        <a className="button" href={buildAuthorizeUrl()}>
          Connect account
        </a>
      </section>
    </main>
  )
}

function CallbackPage() {
  const params = new URLSearchParams(window.location.search)
  const state = params.get('state') ?? ''
  const code = params.get('code') ?? ''
  const [request, setRequest] = useState(null)
  const [tokenResponse, setTokenResponse] = useState(null)
  const [accountInfo, setAccountInfo] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!state || !code) {
      logCallbackEvent('missing-query-params', {
        state,
        code,
        currentUrl: window.location.href
      })
      setError('Callback is missing required query parameters')
      return
    }

    async function loadFlowData() {
      try {
        logCallbackEvent('callback-start', {
          state,
          code,
          currentUrl: window.location.href,
          apiBaseUrl
        })

        logCallbackEvent('request-cache-fetch-start', {
          url: `${apiBaseUrl}/api/requests/${state}`,
          state
        })
        const requestResponse = await fetch(`${apiBaseUrl}/api/requests/${state}`)
        logCallbackEvent('request-cache-fetch-response', {
          ok: requestResponse.ok,
          status: requestResponse.status,
          statusText: requestResponse.statusText,
          state
        })
        if (requestResponse.ok) {
          const cachedRequest = await requestResponse.json()
          logCallbackEvent('request-cache-fetch-body', cachedRequest)
          setRequest(cachedRequest)
        }

        const tokenBody = new URLSearchParams({ code })
        logCallbackEvent('proxy-token-exchange-start', {
          url: `${apiBaseUrl}/oauth/token`,
          method: 'POST',
          body: tokenBody.toString(),
          state,
          code
        })
        const tokenExchangeResponse = await fetch(`${apiBaseUrl}/oauth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: tokenBody
        })
        logCallbackEvent('proxy-token-exchange-response', {
          ok: tokenExchangeResponse.ok,
          status: tokenExchangeResponse.status,
          statusText: tokenExchangeResponse.statusText
        })
        if (!tokenExchangeResponse.ok) {
          throw new Error('Failed to exchange code for token')
        }
        const nextTokenResponse = await tokenExchangeResponse.json()
        logCallbackEvent('proxy-token-exchange-body', nextTokenResponse)
        logTokenDetails(nextTokenResponse)
        setTokenResponse(nextTokenResponse)

        logCallbackEvent('treasury-account-fetch-start', {
          url: `${apiBaseUrl}/api/treasury/account`,
          authorization: `Bearer ${nextTokenResponse.access_token}`
        })
        const accountInfoResponse = await fetch(`${apiBaseUrl}/api/treasury/account`, {
          headers: {
            Authorization: `Bearer ${nextTokenResponse.access_token}`
          }
        })
        logCallbackEvent('treasury-account-fetch-response', {
          ok: accountInfoResponse.ok,
          status: accountInfoResponse.status,
          statusText: accountInfoResponse.statusText
        })
        if (!accountInfoResponse.ok) {
          throw new Error('Failed to load account info')
        }
        const nextAccountInfo = await accountInfoResponse.json()
        logCallbackEvent('treasury-account-fetch-body', nextAccountInfo)
        setAccountInfo(nextAccountInfo)

        if (!requestResponse.ok) {
          const warningMessage = 'Cached authorize request was not found, but proxy token exchange succeeded'
          logCallbackEvent('request-cache-miss-after-success', {
            state,
            code,
            warningMessage
          })
          setError(warningMessage)
        }
      } catch (err) {
        logCallbackEvent('callback-error', {
          state,
          code,
          error: err instanceof Error ? err.message : String(err)
        })
        setError(err instanceof Error ? err.message : 'Callback processing failed')
      }
    }

    loadFlowData()
  }, [code, state])

  return (
    <main className="page">
      <section className="card">
        <p className="eyebrow">LuxHub Callback</p>
        <h1>Authorization code received</h1>
        <div className="detail">
          <span>Code</span>
          <strong>{code}</strong>
        </div>
        <div className="detail">
          <span>State</span>
          <strong>{state}</strong>
        </div>
        <div className="detail">
          <span>Current URL</span>
          <strong>{window.location.href}</strong>
        </div>
        {error ? <p className="error">{error}</p> : null}
        <h2 className="section-title">Proxy token response</h2>
        {tokenResponse ? (
          <pre className="code-block">{JSON.stringify(tokenResponse, null, 2)}</pre>
        ) : (
          <p className="body">Waiting for token response from the proxy...</p>
        )}
        <h2 className="section-title">Treasury account response</h2>
        {accountInfo ? (
          <pre className="code-block">{JSON.stringify(accountInfo, null, 2)}</pre>
        ) : (
          <p className="body">Loading Treasury account info using the access token...</p>
        )}
        <h2 className="section-title">Cached authorize request</h2>
        {request ? (
          <pre className="code-block">{JSON.stringify(request, null, 2)}</pre>
        ) : (
          <p className="body">Loading cached authorize request...</p>
        )}
      </section>
    </main>
  )
}

export default function App() {
  const path = window.location.pathname

  if (path === '/callback') {
    return <CallbackPage />
  }

  return <HomePage />
}
