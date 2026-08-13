import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './styles/index.css'
import App from './App.jsx'
import { trackPageView } from './lib/analytics.js'
import SharedResultPage from './pages/SharedResultPage.jsx'

function RouteAnalytics() {
  const location = useLocation()

  useEffect(() => {
    trackPageView(`${location.pathname}${location.search}`)
  }, [location])

  return null
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <RouteAnalytics />
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/result/:shareToken" element={<SharedResultPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
