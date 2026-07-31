'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import EmptyState from './EmptyState';
import { useDebounce } from '@/lib/hooks';

export interface Column<T = any> {
  key: string;
  header: string;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  hidden?: boolean;
}

interface DataTableProps<T extends object> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchPlaceholder?: string;
  searchKeys?: string[];
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  emptyAction?: React.ReactNode;
  toolbar?: React.ReactNode;
  onExport?: () => void;
  rowKey?: string;
  onRowClick?: (row: T) => void;
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" style={{ width: `${Math.random() * 40 + 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

export default function DataTable<T extends object>({
  data, columns, loading, searchPlaceholder = 'Search...', searchKeys = [],
  pageSize = 15, emptyTitle = 'No records found', emptyDescription = 'No data to display',
  emptyIcon, emptyAction, toolbar, onExport, rowKey = 'id', onRowClick,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const debouncedSearch = useDebounce(search, 200);
  const visibleColumns = columns.filter(c => !c.hidden);

  // Filter
  const filtered = debouncedSearch
    ? data.filter(row => {
        const keys = searchKeys.length > 0 ? searchKeys : Object.keys(row);
        return keys.some(k => String((row as any)[k] ?? '').toLowerCase().includes(debouncedSearch.toLowerCase()));
      })
    : data;

  // Sort
  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const av = (a as any)[sortKey]; const bv = (b as any)[sortKey];
        if (av == null) return 1; if (bv == null) return -1;
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : filtered;

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ChevronsUpDown className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500" />;
    return sortDir === 'asc'
      ? <ChevronUp className="h-3.5 w-3.5 text-blue-500" />
      : <ChevronDown className="h-3.5 w-3.5 text-blue-500" />;
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <div className="relative flex-1 min-w-[140px] sm:min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9 h-9"
            placeholder={searchPlaceholder}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
        {onExport && (
          <Button variant="outline" size="sm" className="ml-auto" onClick={onExport}>
            <Download className="h-4 w-4 mr-1.5" />Export
          </Button>
        )}
        {!toolbar && !onExport && <div className="ml-auto" />}
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {loading ? '...' : `${sorted.length} record${sorted.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              {visibleColumns.map(col => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap',
                    col.sortable && 'cursor-pointer select-none group hover:text-gray-700 dark:hover:text-gray-200',
                    col.headerClassName
                  )}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && <SortIcon col={col.key} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={visibleColumns.length} />)
            ) : paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length} className="py-16">
                  <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />
                </td>
              </tr>
            ) : (
              paginatedRows.map(row => (
                <tr
                  key={String((row as any)[rowKey] ?? Math.random())}
                  className={cn(
                    'hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {visibleColumns.map(col => (
                    <td key={col.key} className={cn('px-4 py-3 text-gray-700 dark:text-gray-300', col.className)}>
                      {col.cell ? col.cell(row) : String((row as any)[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && sorted.length > pageSize && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-400">
            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={currentPage === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={cn('w-7 h-7 text-xs rounded-lg font-medium transition-colors', p === currentPage ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800')}>
                  {p}
                </button>
              );
            })}
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={currentPage === totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
