import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    console.error('Third-Party App runtime error', error)
  }

  render() {
    if (this.state.error) {
      return (
        <main className="page">
          <section className="card">
            <p className="eyebrow">Third-Party App Error</p>
            <h1>Frontend crashed</h1>
            <p className="error">{this.state.error.message || 'Unknown runtime error'}</p>
            <div className="detail">
              <span>Current URL</span>
              <strong>{window.location.href}</strong>
            </div>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}

const rootElement = document.getElementById('root')
const root = ReactDOM.createRoot(rootElement)

function renderStartupError(message) {
  root.render(
    <main className="page">
      <section className="card">
        <p className="eyebrow">Third-Party App Error</p>
        <h1>Frontend failed to start</h1>
        <p className="error">{message}</p>
        <div className="detail">
          <span>Current URL</span>
          <strong>{window.location.href}</strong>
        </div>
      </section>
    </main>
  )
}

window.addEventListener('error', (event) => {
  renderStartupError(event.error?.message || event.message || 'Unknown startup error')
})

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  renderStartupError(reason?.message || String(reason) || 'Unhandled promise rejection')
})

import('./App')
  .then(({ default: App }) => {
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    )
  })
  .catch((error) => {
    console.error('Third-Party App startup import failed', error)
    renderStartupError(error?.message || 'Failed to import App module')
  })
