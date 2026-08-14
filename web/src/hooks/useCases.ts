import { useInfiniteQuery } from '@tanstack/react-query';
import { CasePriority, CaseStatus, PaginatedCasesDto } from '@signaldesk/shared';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export interface CasesFilters {
  status?: CaseStatus | 'all';
  priority?: CasePriority | 'all';
  mine?: boolean;
}

export function useInfiniteCases(filters: CasesFilters) {
  const { session } = useAuth();

  return useInfiniteQuery<PaginatedCasesDto>({
    queryKey: ['cases', session?.user.id, filters],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (filters.status && filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters.priority && filters.priority !== 'all') {
        params.append('priority', filters.priority);
      }
      if (filters.mine) {
        params.append('mine', 'true');
      }
      if (pageParam) {
        params.append('cursor', pageParam as string);
      }
      params.append('limit', '20');

      const query = params.toString() ? `?${params.toString()}` : '';
      return apiFetch<PaginatedCasesDto>(`/cases${query}`);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: null as string | null,
    enabled: !!session,
  });
}
