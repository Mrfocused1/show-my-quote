import React, { useState, Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import Homepage from './Homepage.jsx'

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

function Root() {
  const [page, setPage] = useState(initialPage) // 'home' | 'book-demo' | 'sign-in' | 'app' | 'terms' | 'privacy' | 'demo'
  const [pendingSection, setPendingSection] = useState(null)
  const [tourMode, setTourMode] = useState(false)

  const goHome = (sectionId) => {
    setPendingSection(sectionId || null)
    setTourMode(false)
    setPage('home')
  }

  if (page === 'app')       return <Suspense fallback={null}><App onHome={() => goHome()} tourMode={tourMode} /></Suspense>
  if (page === 'book-demo') return <Suspense fallback={null}><BookDemo  onHome={goHome} onEnterApp={() => setPage('sign-in')} /></Suspense>
  if (page === 'sign-in')   return <Suspense fallback={null}><SignIn    onHome={goHome} onEnterApp={() => setPage('app')} /></Suspense>
  if (page === 'terms')     return <Suspense fallback={null}><TermsPage onHome={() => goHome()} /></Suspense>
  if (page === 'privacy')   return <Suspense fallback={null}><PrivacyPage onHome={() => goHome()} /></Suspense>
  if (page === 'demo')      return <Suspense fallback={null}><DemoPage  onHome={() => goHome()} onBookDemo={() => setPage('book-demo')} onEnterApp={() => { setTourMode(true); setPage('app'); }} /></Suspense>
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
