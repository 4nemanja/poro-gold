export const NotificationBadge = ({ count, className = '' }: { count: number; className?: string }) => {
  if (count <= 0) return null;
  return (
    <span className={`inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white ${className}`}>
      {count > 99 ? '99+' : count}
    </span>
  );
};
