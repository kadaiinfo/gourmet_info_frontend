import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { jaJP } from '@clerk/localizations'
import './index.css'
import App from './App.tsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('VITE_CLERK_PUBLISHABLE_KEY が設定されていません')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      localization={jaJP}
      appearance={{
        variables: {
          colorPrimary: '#70523E',
          fontFamily: '"Noto Sans JP", sans-serif',
          borderRadius: '10px',
        },
      }}
    >
      <App />
    </ClerkProvider>
  </StrictMode>,
)
