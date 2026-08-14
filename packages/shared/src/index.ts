/**
 * Domain Enums matching PostgreSQL schema exactly
 */
export enum CasePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum CaseStatus {
  OPEN = 'open',
  ASSIGNED = 'assigned',
  RESOLVED = 'resolved',
}

export enum WorkspaceMemberRole {
  AGENT = 'agent',
  MANAGER = 'manager',
}

export enum CaseEventType {
  CREATED = 'created',
  CLAIMED = 'claimed',
  RESOLVED = 'resolved',
}

export enum ErrorCode {
  CLAIM_CONFLICT = 'CLAIM_CONFLICT',
  CASE_NOT_FOUND = 'CASE_NOT_FOUND',
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  FORBIDDEN = 'FORBIDDEN',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  NO_WORKSPACE = 'NO_WORKSPACE',
}

/**
 * Standard API error response shape
 */
export interface ApiErrorResponse {
  error: {
    code: ErrorCode | string;
    message: string;
    statusCode: number;
    details?: unknown;
  };
}

/**
 * User context (/me)
 */
export interface UserMeDto {
  userId: string;
  displayName: string;
  role: WorkspaceMemberRole;
  workspace: {
    id: string;
    name: string;
  };
}

/**
 * Case Event Timeline Item
 */
export interface CaseEventDto {
  id: string;
  caseId: string;
  workspaceId: string;
  eventType: CaseEventType;
  actorId: string;
  actorDisplayName?: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

/**
 * Case entity / detail item
 */
export interface CaseDto {
  id: string;
  reference: number;
  formattedReference: string; // e.g. "CASE-0042"
  title: string;
  description: string | null;
  priority: CasePriority;
  status: CaseStatus;
  workspaceId: string;
  creatorId: string;
  creatorDisplayName?: string;
  assigneeId: string | null;
  assigneeDisplayName?: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
  events?: CaseEventDto[];
}

/**
 * Keyset Cursor pagination response
 */
export interface PaginatedCasesDto {
  data: CaseDto[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * SSE Payload emitted over Server-Sent Events
 */
export interface SSEEventMessage {
  type: 'case_created' | 'case_claimed' | 'case_resolved';
  caseId: string;
}
