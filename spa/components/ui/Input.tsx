import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
}

export const Input = ({ label, className = '', ...props }: InputProps) => (
  <div className={`min-w-0 space-y-1 ${className}`}>
    {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
    <input
      className="block min-w-0 w-full rounded-lg border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm px-3 py-2 border"
      {...props}
    />
  </div>
);
