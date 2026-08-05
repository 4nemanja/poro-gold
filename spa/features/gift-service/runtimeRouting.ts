export type RuntimeShellRoute =
  | { kind: 'dashboard' }
  | { kind: 'gift-landing' }
  | { kind: 'gift-shop'; token: string };

export interface RuntimeLocation {
  hostname: string;
  pathname: string;
}

const giftTokenFromPath = (pathname: string): string | null => {
  const match = pathname.match(/^\/g\/([^/]+)\/?$/);
  return match?.[1] || null;
};

export const resolveRuntimeShell = ({ hostname, pathname }: RuntimeLocation): RuntimeShellRoute => {
  const normalizedHost = hostname.toLowerCase();
  const isLocalhost = normalizedHost === 'localhost' || normalizedHost === '127.0.0.1';
  const isVercelPreview = normalizedHost.endsWith('.vercel.app');
  const isGiftHost = !isLocalhost && !isVercelPreview
    && (normalizedHost === 'gift.porogold.com' || normalizedHost.startsWith('gift.'));
  const token = giftTokenFromPath(pathname);

  if (isGiftHost) return token ? { kind: 'gift-shop', token } : { kind: 'gift-landing' };
  if ((isLocalhost || isVercelPreview) && token) return { kind: 'gift-shop', token };
  return { kind: 'dashboard' };
};
