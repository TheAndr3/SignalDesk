import { useQuery } from '@tanstack/react-query';
import { CaseDto } from '@signaldesk/shared';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export function useCaseDetail(caseId: string | null) {
  const { session } = useAuth();

  return useQuery<CaseDto>({
    queryKey: ['case', session?.user.id, caseId],
    queryFn: () => apiFetch<CaseDto>(`/cases/${caseId}`),
    enabled: !!caseId && !!session,
    staleTime: 1000 * 30, // 30 seconds
  });
}
