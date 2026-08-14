import { WorkspaceMemberRole } from '@signaldesk/shared';

export interface SupabaseJwtPayload {
  sub: string;
  aud?: string;
  email?: string;
  role?: string;
  workspace_id?: string;
  workspace_role?: string;
  display_name?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}
