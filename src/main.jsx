import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Homepage from './Homepage.jsx'
import BookDemo from './BookDemo.jsx'
import SignIn from './SignIn.jsx'
import TermsPage from './TermsPage.jsx'
import PrivacyPage from './PrivacyPage.jsx'

function Root() {
  const [page, setPage] = useState('home') // 'home' | 'book-demo' | 'sign-in' | 'app' | 'terms' | 'privacy'

  if (page === 'app')       return <App onHome={() => setPage('home')} />
  if (page === 'book-demo') return <BookDemo  onHome={() => setPage('home')} onEnterApp={() => setPage('app')} />
  if (page === 'sign-in')   return <SignIn    onHome={() => setPage('home')} onEnterApp={() => setPage('app')} />
  if (page === 'terms')     return <TermsPage onHome={() => setPage('home')} />
  if (page === 'privacy')   return <PrivacyPage onHome={() => setPage('home')} />
  return (
    <Homepage
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
