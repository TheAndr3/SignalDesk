import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, WorkspaceMemberRole } from '@signaldesk/shared';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      selectFrom: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      executeTakeFirst: jest.fn(),
    };
    service = new AuthService(mockDb);
  });

  it('should return user profile and workspace information', async () => {
    mockDb.executeTakeFirst.mockResolvedValue({
      user_id: 'a1111111-1111-1111-1111-111111111111',
      display_name: 'Alice Smith',
      role: WorkspaceMemberRole.AGENT,
      workspace_id: 'a0000000-0000-0000-0000-000000000001',
      workspace_name: 'Acme Corp',
    });

    const result = await service.getMe(
      'a1111111-1111-1111-1111-111111111111',
      'a0000000-0000-0000-0000-000000000001',
    );

    expect(result).toEqual({
      userId: 'a1111111-1111-1111-1111-111111111111',
      displayName: 'Alice Smith',
      role: WorkspaceMemberRole.AGENT,
      workspace: {
        id: 'a0000000-0000-0000-0000-000000000001',
        name: 'Acme Corp',
      },
    });
  });

  it('should throw 403 Forbidden with NO_WORKSPACE code if member row not found', async () => {
    mockDb.executeTakeFirst.mockResolvedValue(undefined);

    try {
      await service.getMe('invalid-user', 'invalid-workspace');
      fail('Should have thrown HttpException');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      const httpErr = err as HttpException;
      expect(httpErr.getStatus()).toBe(HttpStatus.FORBIDDEN);
      const res = httpErr.getResponse() as any;
      expect(res.error.code).toBe(ErrorCode.NO_WORKSPACE);
    }
  });
});
