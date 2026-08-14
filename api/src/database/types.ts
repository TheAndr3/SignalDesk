import { Generated } from 'kysely';
import { CasePriority, CaseStatus, WorkspaceMemberRole } from '@signaldesk/shared';

export interface WorkspacesTable {
  id: Generated<string>;
  name: string;
  case_counter: Generated<number>;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface WorkspaceMembersTable {
  user_id: string;
  workspace_id: string;
  role: WorkspaceMemberRole;
  display_name: string;
  created_at: Generated<string>;
}

export interface CasesTable {
  id: Generated<string>;
  reference: number;
  title: string;
  description: string | null;
  priority: CasePriority;
  status: Generated<CaseStatus>;
  workspace_id: string;
  creator_id: string;
  assignee_id: string | null;
  resolution_note: string | null;
  created_at: Generated<string>;
  updated_at: Generated<string>;
}

export interface CaseEventsTable {
  id: Generated<string>;
  case_id: string;
  workspace_id: string;
  event_type: string;
  actor_id: string;
  payload: Record<string, unknown>;
  created_at: Generated<string>;
}

export interface Database {
  workspaces: WorkspacesTable;
  workspace_members: WorkspaceMembersTable;
  cases: CasesTable;
  case_events: CaseEventsTable;
}
