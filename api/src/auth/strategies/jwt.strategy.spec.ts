import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, WorkspaceMemberRole } from '@signaldesk/shared';
import { JwtStrategy } from './jwt.strategy';
import { SupabaseJwtPayload } from '../interfaces/jwt-payload.interface';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: ConfigService;

  beforeEach(() => {
    configService = new ConfigService({
      SUPABASE_JWT_SECRET: 'test-secret-at-least-32-chars-long-12345',
    });
    strategy = new JwtStrategy(configService);
  });

  it('should validate and extract user context from valid JWT claims', async () => {
    const payload: SupabaseJwtPayload = {
      sub: 'a1111111-1111-1111-1111-111111111111',
      email: 'alice@acme.com',
      workspace_id: 'a0000000-0000-0000-0000-000000000001',
      role: 'agent',
      display_name: 'Alice Smith',
    };

    const user = await strategy.validate(payload);

    expect(user).toEqual({
      userId: 'a1111111-1111-1111-1111-111111111111',
      workspaceId: 'a0000000-0000-0000-0000-000000000001',
      role: WorkspaceMemberRole.AGENT,
      email: 'alice@acme.com',
      displayName: 'Alice Smith',
    });
  });

  it('should correctly parse manager role', async () => {
    const payload: SupabaseJwtPayload = {
      sub: 'a3333333-3333-3333-3333-333333333333',
      email: 'carol@acme.com',
      workspace_id: 'a0000000-0000-0000-0000-000000000001',
      role: 'manager',
      display_name: 'Carol Manager',
    };

    const user = await strategy.validate(payload);

    expect(user.role).toBe(WorkspaceMemberRole.MANAGER);
  });

  it('should reject requests where workspace_id is missing with 403 Forbidden', async () => {
    const payloadWithoutWorkspace: SupabaseJwtPayload = {
      sub: '99999999-9999-9999-9999-999999999999',
      email: 'no-workspace@example.com',
      role: 'agent',
    };

    try {
      await strategy.validate(payloadWithoutWorkspace);
      fail('Should have thrown HttpException');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      const httpErr = err as HttpException;
      expect(httpErr.getStatus()).toBe(HttpStatus.FORBIDDEN);
      const response = httpErr.getResponse() as any;
      expect(response.error.code).toBe(ErrorCode.NO_WORKSPACE);
    }
  });

  it('should reject requests where sub (userId) is missing with 401 Unauthorized', async () => {
    const invalidPayload = {
      workspace_id: 'a0000000-0000-0000-0000-000000000001',
    } as SupabaseJwtPayload;

    try {
      await strategy.validate(invalidPayload);
      fail('Should have thrown HttpException');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      const httpErr = err as HttpException;
      expect(httpErr.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    }
  });
});
