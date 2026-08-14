import { WorkspaceMemberRole } from '@signaldesk/shared';

export interface AuthUser {
  userId: string;
  workspaceId: string;
  role: WorkspaceMemberRole;
  email?: string;
  displayName?: string;
}
