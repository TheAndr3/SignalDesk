import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SSEEventMessage } from '@signaldesk/shared';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function useRealtimeEvents() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!session?.access_token) {
      return;
    }

    const token = session.access_token;
    const url = `${API_BASE}/events/stream?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const payload: SSEEventMessage = JSON.parse(event.data);
        if (payload?.type) {
          // Invalidate cases list query
          queryClient.invalidateQueries({ queryKey: ['cases'] });

          // Invalidate specific case detail query if applicable
          if (payload.caseId) {
            queryClient.invalidateQueries({
              queryKey: ['case', session.user.id, payload.caseId],
            });
          }
        }
      } catch (err) {
        console.error('Failed to parse SSE event message:', err);
      }
    };

    eventSource.onerror = () => {
      // Reconnect / retry scenario -> invalidate all queries
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    };

    return () => {
      eventSource.close();
    };
  }, [session?.access_token, session?.user.id, queryClient]);
}
