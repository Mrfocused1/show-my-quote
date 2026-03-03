import React, { useState, Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import Homepage from './Homepage.jsx'
import { setPendingPhone } from './callBridge.js'

// Lazy-load all pages so each becomes its own chunk.
// Only Homepage is eager — it's always the first thing shown.
const App         = lazy(() => import('./App.jsx'))
const BookDemo    = lazy(() => import('./BookDemo.jsx'))
const SignIn      = lazy(() => import('./SignIn.jsx'))
const TermsPage   = lazy(() => import('./TermsPage.jsx'))
const PrivacyPage = lazy(() => import('./PrivacyPage.jsx'))
const DemoPage    = lazy(() => import('./DemoPage.jsx'))

// If the URL path is /demo, open the public demo page directly
const initialPage = window.location.pathname === '/demo' ? 'demo' : 'home'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', fontFamily:'sans-serif', gap:16 }}>
          <p style={{ color:'#64748b', fontSize:14 }}>Something went wrong loading this page.</p>
          <button onClick={() => window.location.reload()} style={{ background:'#16a34a', color:'#fff', border:'none', borderRadius:8, padding:'10px 20px', fontSize:14, cursor:'pointer', fontWeight:600 }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Root() {
  const [page, setPage] = useState(initialPage) // 'home' | 'book-demo' | 'sign-in' | 'app' | 'terms' | 'privacy' | 'demo'
  const [pendingSection, setPendingSection] = useState(null)
  const [tourMode, setTourMode] = useState(false)
  const [demoInitPhone, setDemoInitPhone] = useState('')
  const [demoInitNiche, setDemoInitNiche] = useState(null)
  const [demoForceFillSelect, setDemoForceFillSelect] = useState(false)

  const goHome = (sectionId) => {
    setPendingSection(sectionId || null)
    setTourMode(false)
    setDemoInitPhone('')
    setDemoInitNiche(null)
    setDemoForceFillSelect(false)
    setPage('home')
  }

  const handleCallAgain = (phone, niche, forceFillSelect = false) => {
    setPendingPhone(phone); // reliable bridge — not subject to React batching timing
    setDemoInitPhone(phone || '')
    setDemoInitNiche(niche || null)
    setDemoForceFillSelect(!!forceFillSelect)
    setPage('demo')
  }

  if (page === 'app')       return <ErrorBoundary><Suspense fallback={null}><App onHome={() => goHome()} tourMode={tourMode} onCallAgain={handleCallAgain} /></Suspense></ErrorBoundary>
  if (page === 'book-demo') return <ErrorBoundary><Suspense fallback={null}><BookDemo  onHome={goHome} onEnterApp={() => setPage('sign-in')} /></Suspense></ErrorBoundary>
  if (page === 'sign-in')   return <ErrorBoundary><Suspense fallback={null}><SignIn    onHome={goHome} onEnterApp={() => setPage('app')} /></Suspense></ErrorBoundary>
  if (page === 'terms')     return <ErrorBoundary><Suspense fallback={null}><TermsPage onHome={() => goHome()} /></Suspense></ErrorBoundary>
  if (page === 'privacy')   return <ErrorBoundary><Suspense fallback={null}><PrivacyPage onHome={() => goHome()} /></Suspense></ErrorBoundary>
  if (page === 'demo')      return <ErrorBoundary><Suspense fallback={null}><DemoPage  onHome={() => goHome()} onBookDemo={() => setPage('book-demo')} onEnterApp={() => { setTourMode(true); setPage('app'); }} onGoToDashboard={() => setPage('app')} initialPhone={demoInitPhone} initialNiche={demoInitNiche} forceFillSelect={demoForceFillSelect} /></Suspense></ErrorBoundary>
  return (
    <Homepage
      scrollTo={pendingSection}
      onScrollHandled={() => setPendingSection(null)}
      onBookDemo={() => setPage('book-demo')}
      onEnterApp={() => setPage('sign-in')}
      onTerms={() => setPage('terms')}
      onPrivacy={() => setPage('privacy')}
    />
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
