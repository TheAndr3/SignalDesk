import { ApiErrorResponse } from '@signaldesk/shared';
import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorPayload: ApiErrorResponse;
    try {
      errorPayload = await response.json();
    } catch {
      errorPayload = {
        error: {
          code: 'HTTP_ERROR',
          message: response.statusText || 'An unexpected error occurred',
          statusCode: response.status,
        },
      };
    }
    throw errorPayload;
  }

  return response.json();
}
