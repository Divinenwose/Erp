import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export function useRealtimeTable(
  table: string,
  companyId: string | undefined,
  onChange: () => void | Promise<void>,
) {
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel(`administration-${table}-${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          void onChangeRef.current();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [companyId, table]);
}