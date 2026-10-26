'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchSignups } from './signup-api';
import type { SignupRange } from './signup-range';

export const signupQueryKey = ['dashboard', 'signups'] as const;

export function useSignups(range: SignupRange | undefined, enabled: boolean) {
  return useQuery({
    queryKey: [...signupQueryKey, range],
    queryFn: ({ signal }) => fetchSignups(range!, signal),
    enabled: enabled && Boolean(range),
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
