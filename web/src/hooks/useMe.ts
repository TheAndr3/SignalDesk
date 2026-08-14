import { useQuery } from '@tanstack/react-query';
import { UserMeDto } from '@signaldesk/shared';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export function useMe() {
  const { session } = useAuth();

  return useQuery<UserMeDto>({
    queryKey: ['me', session?.user?.id],
    queryFn: () => apiFetch<UserMeDto>('/me'),
    enabled: !!session,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 1,
  });
}
