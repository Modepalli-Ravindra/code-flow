import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// SES/Lockdown Safety: Ignore harmless "null" or intrinsic exceptions often thrown by browser extensions
window.addEventListener('error', (event) => {
  const msg = event.message || "";
  const isSES = msg.includes('SES') || msg.includes('lockdown') || event.error === null;
  if (isSES) {
    event.preventDefault();
    event.stopPropagation();
  }
}, true);

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason === null || String(event.reason).includes('SES')) {
    event.preventDefault();
    event.stopPropagation();
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
