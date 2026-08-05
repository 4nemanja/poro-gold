import type { ReactNode } from 'react';

export type PillVariant = 'gray' | 'green' | 'blue' | 'yellow' | 'red';

export const Pill = ({
  children,
  variant = 'gray',
}: {
  children: ReactNode;
  variant?: PillVariant;
}) => {
  const colors: Record<PillVariant, string> = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    yellow: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
  };

  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${colors[variant]}`}>
      {children}
    </span>
  );
};
