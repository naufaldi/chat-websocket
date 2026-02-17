import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';

function useDebouncedValue(value: string, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debouncedValue;
}

export function useUsersSearch(query: string, limit = 20) {
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  return useQuery({
    queryKey: ['users', 'search', debouncedQuery, limit],
    queryFn: () => usersApi.search(debouncedQuery, limit),
    enabled: debouncedQuery.length >= 3,
  });
}
