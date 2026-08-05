import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemeMode } from './ThemeProvider';

const nextMode: Record<ThemeMode, ThemeMode> = { light: 'dark', dark: 'system', system: 'light' };

export const ThemeToggle = ({ className = '' }: { className?: string }) => {
  const { mode, setMode } = useTheme();
  const Icon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor;
  return (
    <button
      type="button"
      onClick={() => setMode(nextMode[mode])}
      className={`theme-toggle inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900 ${className}`}
      title={`Theme: ${mode}. Switch to ${nextMode[mode]}.`}
      aria-label={`Theme is ${mode}. Switch to ${nextMode[mode]}.`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
};
