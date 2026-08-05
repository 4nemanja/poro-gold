'use client';

import dynamic from 'next/dynamic';

// The SPA reads window/localStorage at module load, so it must never render on
// the server. ssr:false keeps it browser-only.
const PortalApp = dynamic(() => import('./PortalApp'), {
  ssr: false,
  loading: () => <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">Loading POROGOLD…</div>,
});

export default function PortalPage() {
  return <PortalApp />;
}
