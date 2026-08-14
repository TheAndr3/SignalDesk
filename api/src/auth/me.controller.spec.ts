import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceMemberRole } from '@signaldesk/shared';
import { MeController } from './me.controller';
import { AuthService } from './auth.service';
import { AuthUser } from './interfaces/auth-user.interface';

describe('MeController', () => {
  let controller: MeController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            getMe: jest.fn().mockResolvedValue({
              userId: 'a1111111-1111-1111-1111-111111111111',
              displayName: 'Alice Smith',
              role: WorkspaceMemberRole.AGENT,
              workspace: {
                id: 'a0000000-0000-0000-0000-000000000001',
                name: 'Acme Corp',
              },
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<MeController>(MeController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should return user profile and workspace for authenticated user', async () => {
    const mockUser: AuthUser = {
      userId: 'a1111111-1111-1111-1111-111111111111',
      workspaceId: 'a0000000-0000-0000-0000-000000000001',
      role: WorkspaceMemberRole.AGENT,
      displayName: 'Alice Smith',
    };

    const result = await controller.getMe(mockUser);

    expect(authService.getMe).toHaveBeenCalledWith(
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
});
