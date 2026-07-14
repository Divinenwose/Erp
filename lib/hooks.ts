import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { if (page > totalPages) setPage(1); }, [items.length, totalPages, page]);
  return { page, setPage, totalPages, paginatedItems, totalItems: items.length, pageSize };
}

export function useSort<T>(items: T[]) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleSort = useCallback((key: keyof T) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }, [sortKey]);

  const sorted = sortKey
    ? [...items].sort((a, b) => {
        const av = a[sortKey]; const bv = b[sortKey];
        if (av == null) return 1; if (bv == null) return -1;
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : items;

  return { sorted, sortKey, sortDir, toggleSort };
}

interface FetchState<T> { data: T[]; loading: boolean; error: string | null; }

export function useSupabaseTable<T extends Record<string, unknown>>(
  table: string,
  query?: Record<string, unknown>,
  deps: unknown[] = []
) {
  const { company } = useAuth();
  const [state, setState] = useState<FetchState<T>>({ data: [], loading: true, error: null });

  const fetchData = useCallback(async () => {
    if (!company?.id) { setState(s => ({ ...s, loading: false })); return; }
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      let q = supabase.from(table).select('*').eq('company_id', company.id);
      if (query) {
        Object.entries(query).forEach(([k, v]) => { q = q.eq(k, v as string); });
      }
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      setState({ data: (data ?? []) as T[], loading: false, error: null });
    } catch (err: unknown) {
      setState(s => ({ ...s, loading: false, error: err instanceof Error ? err.message : 'Failed to load data' }));
    }
  }, [company?.id, table, JSON.stringify(query), ...deps]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { ...state, refetch: fetchData };
}

export function useCounters() {
  const { company } = useAuth();
  const [counters, setCounters] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company?.id) return;
    const tables = ['employees', 'customers', 'projects', 'vendors', 'products', 'leads', 'assets'];
    Promise.all(
      tables.map(t =>
        supabase.from(t).select('id', { count: 'exact', head: true }).eq('company_id', company.id)
          .then(({ count }) => [t, count ?? 0] as [string, number])
      )
    ).then(results => {
      setCounters(Object.fromEntries(results));
      setLoading(false);
    });
  }, [company?.id]);

  return { counters, loading };
}
