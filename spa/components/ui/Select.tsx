import type { ReactNode, SelectHTMLAttributes } from 'react';

interface SelectOption {
  value: string | number;
  label: ReactNode;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  options: SelectOption[];
}

export const Select = ({ label, options, className = '', ...props }: SelectProps) => (
  <div className={`min-w-0 space-y-1 ${className}`}>
    {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
    <select className="block min-w-0 w-full rounded-lg border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm px-3 py-2 border bg-white" {...props}>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);
