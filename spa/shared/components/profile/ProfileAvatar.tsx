import { useState } from 'react';

const initials = (name: string, email: string) => {
  const value = name.trim() || email.trim();
  return value.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U';
};

export const ProfileAvatar = ({ name, email, url, className = 'w-8 h-8' }: {
  name: string; email: string; url?: string | null; className?: string;
}) => {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (url && failedUrl !== url) return <img src={url} alt={`${name} avatar`} onError={() => setFailedUrl(url)} className={`${className} rounded-full object-cover bg-gray-800`} />;
  return <div className={`${className} rounded-full bg-gray-800 text-white flex items-center justify-center text-xs font-semibold shrink-0`}>{initials(name, email)}</div>;
};
