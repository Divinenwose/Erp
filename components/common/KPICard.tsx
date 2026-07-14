'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  prefix?: string;
  suffix?: string;
  loading?: boolean;
}

export default function KPICard({ title, value, change, changeLabel, icon, iconBg, prefix, suffix, loading }: KPICardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-md transition-shadow duration-200">
      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            {icon && (
              <div className={cn('p-2 rounded-lg', iconBg ?? 'bg-blue-50 dark:bg-blue-950/50')}>
                {icon}
              </div>
            )}
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
          </p>
          {change !== undefined && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className={cn(
                'flex items-center gap-0.5 text-xs font-medium',
                isPositive ? 'text-emerald-600 dark:text-emerald-400' : isNegative ? 'text-red-600 dark:text-red-400' : 'text-gray-500'
              )}>
                {isPositive ? <TrendingUp className="h-3 w-3" /> : isNegative ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {Math.abs(change)}%
              </span>
              {changeLabel && <span className="text-xs text-gray-400 dark:text-gray-500">{changeLabel}</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
