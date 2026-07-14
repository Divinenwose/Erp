'use client';

import { cn } from '@/lib/utils';
import { STATUS_COLORS } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, className, size = 'sm' }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status.toLowerCase().replace(' ', '_')] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <span className={cn(
      'inline-flex items-center font-medium rounded-full',
      size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1',
      colorClass,
      className
    )}>
      {label}
    </span>
  );
}
