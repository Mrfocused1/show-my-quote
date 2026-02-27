import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Homepage from './Homepage.jsx'
import BookDemo from './BookDemo.jsx'
import SignIn from './SignIn.jsx'
import TermsPage from './TermsPage.jsx'
import PrivacyPage from './PrivacyPage.jsx'
import DemoPage from './DemoPage.jsx'

// If the URL path is /demo, open the public demo page directly
const initialPage = window.location.pathname === '/demo' ? 'demo' : 'home'

function Root() {
  const [page, setPage] = useState(initialPage) // 'home' | 'book-demo' | 'sign-in' | 'app' | 'terms' | 'privacy' | 'demo'
  const [pendingSection, setPendingSection] = useState(null)

  const goHome = (sectionId) => {
    setPendingSection(sectionId || null)
    setPage('home')
  }

  if (page === 'app')       return <App onHome={() => goHome()} />
  if (page === 'book-demo') return <BookDemo  onHome={goHome} onEnterApp={() => setPage('sign-in')} />
  if (page === 'sign-in')   return <SignIn    onHome={goHome} onEnterApp={() => setPage('app')} />
  if (page === 'terms')     return <TermsPage onHome={() => goHome()} />
  if (page === 'privacy')   return <PrivacyPage onHome={() => goHome()} />
  if (page === 'demo')      return <DemoPage  onHome={() => goHome()} onBookDemo={() => setPage('book-demo')} />
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
