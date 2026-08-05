// Global styles the SPA relies on (base html/body + its data-theme dark mode).
// Scoped to the /portal route so it only loads with the mounted SPA.
import '@/spa/index.css';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
