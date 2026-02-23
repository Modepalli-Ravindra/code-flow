import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// SES/Lockdown Safety: Ignore harmless "null" exceptions often thrown by browser extensions
window.addEventListener('error', (event) => {
  if (event.error === null || event.message?.includes('SES_UNCAUGHT_EXCEPTION')) {
    event.preventDefault();
    event.stopPropagation();
  }
}, true);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
