import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './shared/theme/ThemeProvider.tsx'
import { ProfileProvider } from './shared/profile/ProfileProvider.tsx'
import { I18nProvider } from './i18n/I18nProvider.tsx'
import { PublicGiftShopPage } from './features/gift-service/PublicGiftShopPage.tsx'
import { PublicGiftLandingPage } from './features/gift-service/PublicGiftLandingPage.tsx'
import { resolveRuntimeShell } from './features/gift-service/runtimeRouting.ts'

const runtimeShell = resolveRuntimeShell(window.location)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {runtimeShell.kind === 'gift-shop' ? <PublicGiftShopPage token={runtimeShell.token} />
      : runtimeShell.kind === 'gift-landing' ? <PublicGiftLandingPage /> : (
      <ThemeProvider>
        <ProfileProvider>
          <I18nProvider><App /></I18nProvider>
        </ProfileProvider>
      </ThemeProvider>
    )}
  </StrictMode>,
)
