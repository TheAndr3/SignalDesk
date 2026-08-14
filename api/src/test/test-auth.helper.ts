import * as jwt from 'jsonwebtoken';
import { WorkspaceMemberRole } from '@signaldesk/shared';

export const TEST_JWT_SECRET =
  process.env.SUPABASE_JWT_SECRET ||
  'super-secret-jwt-token-with-at-least-32-characters-long';

export const WORKSPACE_A_ID = 'a0000000-0000-0000-0000-000000000001';
export const WORKSPACE_B_ID = 'b0000000-0000-0000-0000-000000000002';

export const ALICE_ID = 'a1111111-1111-1111-1111-111111111111';
export const BOB_ID = 'a2222222-2222-2222-2222-222222222222';
export const CAROL_ID = 'a3333333-3333-3333-3333-333333333333';
export const DAVE_ID = 'b1111111-1111-1111-1111-111111111111';
export const NO_WS_USER_ID = 'e9999999-9999-9999-9999-999999999999';

export function createTestJwt(payload: Record<string, any>): string {
  return jwt.sign(payload, TEST_JWT_SECRET, { algorithm: 'HS256' });
}

export function getAliceToken(): string {
  return createTestJwt({
    sub: ALICE_ID,
    email: 'alice@acme.com',
    workspace_id: WORKSPACE_A_ID,
    role: WorkspaceMemberRole.AGENT,
    display_name: 'Alice Smith',
    aud: 'authenticated',
  });
}

export function getBobToken(): string {
  return createTestJwt({
    sub: BOB_ID,
    email: 'bob@acme.com',
    workspace_id: WORKSPACE_A_ID,
    role: WorkspaceMemberRole.AGENT,
    display_name: 'Bob Jones',
    aud: 'authenticated',
  });
}

export function getCarolToken(): string {
  return createTestJwt({
    sub: CAROL_ID,
    email: 'carol@acme.com',
    workspace_id: WORKSPACE_A_ID,
    role: WorkspaceMemberRole.MANAGER,
    display_name: 'Carol Manager',
    aud: 'authenticated',
  });
}

export function getDaveToken(): string {
  return createTestJwt({
    sub: DAVE_ID,
    email: 'dave@stark.com',
    workspace_id: WORKSPACE_B_ID,
    role: WorkspaceMemberRole.AGENT,
    display_name: 'Dave Wilson',
    aud: 'authenticated',
  });
}

export function getNoWorkspaceToken(): string {
  return createTestJwt({
    sub: NO_WS_USER_ID,
    email: 'orphan@nowhere.com',
    aud: 'authenticated',
  });
}
