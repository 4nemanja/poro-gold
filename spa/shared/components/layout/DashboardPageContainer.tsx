import type { ReactNode } from 'react';

export type DashboardPageSize = 'narrow' | 'standard' | 'wide' | 'full';

interface DashboardPageContainerProps {
  children: ReactNode;
  size?: DashboardPageSize;
}

const widthClasses: Record<DashboardPageSize, string> = {
  narrow: 'max-w-3xl',
  standard: 'max-w-6xl',
  wide: 'max-w-[1500px]',
  full: 'max-w-none',
};

export function DashboardPageContainer({ children, size = 'standard' }: DashboardPageContainerProps) {
  return <div className={`mx-auto w-full min-w-0 ${widthClasses[size]}`}>{children}</div>;
}
