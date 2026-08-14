import { Test, TestingModule } from '@nestjs/testing';
import { CasePriority, CaseStatus, WorkspaceMemberRole } from '@signaldesk/shared';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { CreateCaseDto } from './dto/create-case.dto';

describe('CasesController', () => {
  let controller: CasesController;
  let casesService: CasesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CasesController],
      providers: [
        {
          provide: CasesService,
          useValue: {
            createCase: jest.fn().mockResolvedValue({
              id: 'case-uuid-1234',
              reference: 1,
              formattedReference: 'CASE-0001',
              title: 'API endpoint latency issue',
              description: null,
              priority: CasePriority.URGENT,
              status: CaseStatus.OPEN,
              workspaceId: 'a0000000-0000-0000-0000-000000000001',
              creatorId: 'a1111111-1111-1111-1111-111111111111',
              creatorDisplayName: 'Alice Smith',
              assigneeId: null,
              assigneeDisplayName: null,
              resolutionNote: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<CasesController>(CasesController);
    casesService = module.get<CasesService>(CasesService);
  });

  it('should call casesService.createCase with user context and payload', async () => {
    const mockUser: AuthUser = {
      userId: 'a1111111-1111-1111-1111-111111111111',
      workspaceId: 'a0000000-0000-0000-0000-000000000001',
      role: WorkspaceMemberRole.AGENT,
      displayName: 'Alice Smith',
    };

    const dto: CreateCaseDto = {
      title: 'API endpoint latency issue',
      priority: CasePriority.URGENT,
    };

    const result = await controller.createCase(mockUser, dto);

    expect(casesService.createCase).toHaveBeenCalledWith(
      'a0000000-0000-0000-0000-000000000001',
      'a1111111-1111-1111-1111-111111111111',
      dto,
    );
    expect(result.formattedReference).toBe('CASE-0001');
    expect(result.status).toBe(CaseStatus.OPEN);
  });
});
