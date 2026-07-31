'use client';

import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export default function PageHeader({ title, description, children, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
      <div className="min-w-0 flex-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 mb-1 overflow-x-auto pb-1">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5 text-xs text-gray-400 whitespace-nowrap">
                {i > 0 && <span>/</span>}
                <span className={cn(i === breadcrumbs.length - 1 ? 'text-gray-600 dark:text-gray-300' : 'hover:text-gray-600 cursor-pointer')}>{crumb.label}</span>
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">{title}</h1>
        {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2 shrink-0 sm:mt-0 mt-2">{children}</div>}
    </div>
  );
}
