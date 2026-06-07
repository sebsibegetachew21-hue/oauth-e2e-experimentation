import { useEffect, useState } from 'react'
import { oktaAuth, oktaConfigured } from './okta'

const apiBaseUrl = 'http://127.0.0.1:8080'
const callbackPath = '/login/callback'
const consentTtlMs = 120_000

async function loadTreasuryAccountWithToken() {
  const tokens = await oktaAuth.tokenManager.getTokens()
  const accessToken = tokens.accessToken?.accessToken ?? ''

  if (!accessToken) {
    throw new Error('No Treasury access token found in token manager')
  }

  const response = await fetch(`${apiBaseUrl}/api/treasury/account`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    throw new Error(`Treasury account call failed with status ${response.status}`)
  }

  const account = await response.json()
  return { accessToken, account }
}

function MissingConfigPage() {
  return (
    <main className="page">
      <section className="card">
        <p className="eyebrow">Treasury Setup</p>
        <h1>Okta config required</h1>
        <p className="body">
          Add <code>VITE_OKTA_ISSUER</code> and <code>VITE_OKTA_CLIENT_ID</code> to a local
          <code>.env</code> file in <code>treasury-frontend</code>, then restart the Vite server.
        </p>
        <div className="hint">
          <span>Callback URI</span>
          <strong>http://127.0.0.1:5174/login/callback</strong>
        </div>
      </section>
    </main>
  )
}

function LoginPage({ originalUri, title, body, hintLabel, hintValue }) {
  async function handleLogin() {
    oktaAuth.setOriginalUri(originalUri)
    await oktaAuth.signInWithRedirect()
  }

  return (
    <main className="page">
      <section className="card">
        <p className="eyebrow">Treasury Login</p>
        <h1>{title}</h1>
        <p className="body">{body}</p>
        <div className="hint">
          <span>{hintLabel}</span>
          <strong>{hintValue}</strong>
        </div>
        <button className="button" type="button" onClick={handleLogin}>
          Login with Okta
        </button>
      </section>
    </main>
  )
}

function CallbackPage() {
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function completeLogin() {
      try {
        const { tokens } = await oktaAuth.token.parseFromUrl()
        oktaAuth.tokenManager.setTokens(tokens)
        const originalUri = oktaAuth.getOriginalUri() ?? '/'
        oktaAuth.removeOriginalUri()
        window.location.replace(originalUri)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Okta callback failed')
        }
      }
    }

    completeLogin()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="page">
      <section className="card">
        <p className="eyebrow">Treasury Callback</p>
        <h1>Completing sign-in</h1>
        <p className="body">Processing the Okta redirect and restoring the consent page.</p>
        {error ? <p className="error">{error}</p> : null}
      </section>
    </main>
  )
}

function TokenPanel() {
  const [accessToken, setAccessToken] = useState('')
  const [accountInfo, setAccountInfo] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadTokenAndAccount() {
      try {
        const result = await loadTreasuryAccountWithToken()
        if (cancelled) {
          return
        }

        console.log('[Treasury] access_token', result.accessToken)
        console.log('[Treasury] account response', result.account)
        setAccessToken(result.accessToken)
        setAccountInfo(result.account)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load Treasury token')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadTokenAndAccount()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <h2 className="section-title">Treasury access token</h2>
      {accessToken ? (
        <pre className="code-block">{accessToken}</pre>
      ) : loading ? (
        <p className="body">Loading Treasury access token...</p>
      ) : null}
      <h2 className="section-title">Treasury account response</h2>
      {accountInfo ? (
        <pre className="code-block">{JSON.stringify(accountInfo, null, 2)}</pre>
      ) : loading ? (
        <p className="body">Calling Treasury account endpoint...</p>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
    </>
  )
}

function HomePage({ userEmail, onLogout }) {
  return (
    <main className="page">
      <section className="card">
        <p className="eyebrow">Treasury</p>
        <h1>Treasury home</h1>
        <p className="body">
          You are signed in to Treasury directly. Consent is only shown when you arrive through the
          LuxHub or proxy flow with a valid consent state.
        </p>
        <div className="detail">
          <span>Signed in as</span>
          <strong>{userEmail}</strong>
        </div>
        <TokenPanel />
        <button className="button secondary" type="button" onClick={onLogout}>
          Sign out
        </button>
      </section>
    </main>
  )
}

function ConsentPage({ state, userEmail, onLogout }) {
  const [secondsLeft, setSecondsLeft] = useState(null)
  const [expired, setExpired] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false
    let intervalId

    async function validateConsentRequest() {
      try {
        const response = await fetch(`${apiBaseUrl}/api/requests/${state}`)
        if (!response.ok) {
          throw new Error('Consent request is missing')
        }

        const request = await response.json()
        const createdAtMs = new Date(request.createdAt).getTime()

        function updateTimer() {
          const remainingMs = Math.max(0, createdAtMs + consentTtlMs - Date.now())
          const nextSecondsLeft = Math.ceil(remainingMs / 1000)

          if (!cancelled) {
            setSecondsLeft(nextSecondsLeft)
            setExpired(remainingMs <= 0)
          }

          if (remainingMs <= 0 && intervalId) {
            window.clearInterval(intervalId)
          }
        }

        updateTimer()
        intervalId = window.setInterval(updateTimer, 1000)
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Failed to load consent request')
        }
      }
    }

    validateConsentRequest()

    return () => {
      cancelled = true
      if (intervalId) {
        window.clearInterval(intervalId)
      }
    }
  }, [state])

  return (
    <main className="page">
      <section className="card">
        <p className="eyebrow">Treasury</p>
        <h1>Approve data sharing</h1>
        <p className="body">
          Treasury owns the consent step in this POC. LuxHub does not render approval screens and
          the proxy has already cached the original authorize request.
        </p>
        <div className="detail">
          <span>Consent state</span>
          <strong>{state}</strong>
        </div>
        <div className="detail">
          <span>Signed in as</span>
          <strong>{userEmail}</strong>
        </div>
        <div className="detail">
          <span>Requested access</span>
          <strong>Accounts overview</strong>
        </div>
        <div className="detail">
          <span>Consent request</span>
          <strong>{loadError ? 'Unavailable' : expired ? 'Expired' : 'Active'}</strong>
        </div>
        <div className={`detail ${expired ? 'detail-expired' : 'detail-timer'}`}>
          <span>Time left to approve</span>
          <strong>{secondsLeft === null ? 'Loading...' : `${secondsLeft}s`}</strong>
        </div>
        {loadError ? <p className="error">{loadError}</p> : null}
        {expired ? <p className="error">This consent request has expired after 2 minutes.</p> : null}
        <TokenPanel />
        <form action={`${apiBaseUrl}/oauth/consent/approve`} method="post">
          <input type="hidden" name="state" value={state} />
          <button className="button" type="submit" disabled={expired}>
            Approve and continue
          </button>
        </form>
        <button className="button secondary" type="button" onClick={onLogout}>
          Sign out
        </button>
      </section>
    </main>
  )
}

export default function App() {
  const path = window.location.pathname
  const state = new URLSearchParams(window.location.search).get('state') ?? ''
  const isConsentRoute = path === '/consent'
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    if (!oktaConfigured || path === callbackPath) {
      return
    }

    let cancelled = false

    async function loadAuthState() {
      const authenticated = await oktaAuth.isAuthenticated()
      if (cancelled) {
        return
      }

      setIsAuthenticated(authenticated)

      if (authenticated) {
        const user = await oktaAuth.getUser()
        if (!cancelled) {
          setUserEmail(user.email ?? user.preferred_username ?? 'Okta user')
        }
      }
    }

    loadAuthState()

    return () => {
      cancelled = true
    }
  }, [path])

  async function handleLogout() {
    setIsAuthenticated(false)
    setUserEmail('')
    oktaAuth.tokenManager.clear()
    oktaAuth.removeOriginalUri()

    try {
      await oktaAuth.closeSession()
    } catch (error) {
      console.error('Treasury logout fallback', error)
    }

    window.location.replace('/')
  }

  if (!oktaConfigured) {
    return <MissingConfigPage />
  }

  if (path === callbackPath) {
    return <CallbackPage />
  }

  if (!isAuthenticated) {
    if (isConsentRoute) {
      return (
        <LoginPage
          originalUri={`/consent?state=${encodeURIComponent(state)}`}
          title="Sign in before consent"
          body="Treasury is the only frontend protected by Okta in this POC. Sign in before the consent screen is shown."
          hintLabel="Consent state"
          hintValue={state || 'missing'}
        />
      )
    }

    return (
      <LoginPage
        originalUri="/"
        title="Sign in to Treasury"
        body="Direct Treasury login lands on Treasury home. Consent only appears when you are redirected here by the proxy with a valid state."
        hintLabel="Entry point"
        hintValue="Direct Treasury login"
      />
    )
  }

  if (!isConsentRoute) {
    return <HomePage userEmail={userEmail} onLogout={handleLogout} />
  }

  if (!state) {
    return <HomePage userEmail={userEmail} onLogout={handleLogout} />
  }

  return <ConsentPage state={state} userEmail={userEmail} onLogout={handleLogout} />
}
