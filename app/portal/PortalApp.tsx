'use client';

// Mounts the entire dashboard.poro SPA (Admin/Seller/Supplier portals + the
// portal chooser) inside the Next.js app. This single 'use client' boundary
// makes the whole imported SPA tree client-side, so no per-file directives are
// needed. The SPA navigates via internal state, so it lives happily at /portal.
import App from '@/spa/App';
import { ThemeProvider } from '@/spa/shared/theme/ThemeProvider';
import { ProfileProvider } from '@/spa/shared/profile/ProfileProvider';
import { I18nProvider } from '@/spa/i18n/I18nProvider';

export default function PortalApp() {
  return (
    <ThemeProvider>
      <ProfileProvider>
        <I18nProvider>
          <App />
        </I18nProvider>
      </ProfileProvider>
    </ThemeProvider>
  );
}
