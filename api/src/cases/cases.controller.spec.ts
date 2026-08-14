import { Test, TestingModule } from '@nestjs/testing';
import { CasePriority, CaseStatus, WorkspaceMemberRole } from '@signaldesk/shared';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { CreateCaseDto } from './dto/create-case.dto';
import { ListCasesQueryDto } from './dto/list-cases-query.dto';

describe('CasesController', () => {
  let controller: CasesController;
  let casesService: CasesService;

  const mockUser: AuthUser = {
    userId: 'a1111111-1111-1111-1111-111111111111',
    workspaceId: 'a0000000-0000-0000-0000-000000000001',
    role: WorkspaceMemberRole.AGENT,
    displayName: 'Alice Smith',
  };

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
              workspaceId: mockUser.workspaceId,
              creatorId: mockUser.userId,
              creatorDisplayName: 'Alice Smith',
              assigneeId: null,
              assigneeDisplayName: null,
              resolutionNote: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }),
            findAll: jest.fn().mockResolvedValue({
              data: [],
              nextCursor: null,
              hasMore: false,
            }),
            findById: jest.fn().mockResolvedValue({
              id: 'case-uuid-1234',
              reference: 1,
              formattedReference: 'CASE-0001',
              title: 'API endpoint latency issue',
              description: null,
              priority: CasePriority.URGENT,
              status: CaseStatus.OPEN,
              workspaceId: mockUser.workspaceId,
              creatorId: mockUser.userId,
              creatorDisplayName: 'Alice Smith',
              assigneeId: null,
              assigneeDisplayName: null,
              resolutionNote: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              events: [],
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<CasesController>(CasesController);
    casesService = module.get<CasesService>(CasesService);
  });

  it('should call casesService.createCase with user context and payload', async () => {
    const dto: CreateCaseDto = {
      title: 'API endpoint latency issue',
      priority: CasePriority.URGENT,
    };

    const result = await controller.createCase(mockUser, dto);

    expect(casesService.createCase).toHaveBeenCalledWith(
      mockUser.workspaceId,
      mockUser.userId,
      dto,
    );
    expect(result.formattedReference).toBe('CASE-0001');
    expect(result.status).toBe(CaseStatus.OPEN);
  });

  it('should call casesService.findAll with query parameters', async () => {
    const query: ListCasesQueryDto = {
      status: CaseStatus.OPEN,
      mine: true,
      limit: 10,
    };

    const result = await controller.findAll(mockUser, query);

    expect(casesService.findAll).toHaveBeenCalledWith(
      mockUser.workspaceId,
      mockUser.userId,
      query,
    );
    expect(result).toEqual({
      data: [],
      nextCursor: null,
      hasMore: false,
    });
  });

  it('should call casesService.findById with caseId and user workspace', async () => {
    const result = await controller.findById(mockUser, 'case-uuid-1234');

    expect(casesService.findById).toHaveBeenCalledWith(
      mockUser.workspaceId,
      'case-uuid-1234',
    );
    expect(result.id).toBe('case-uuid-1234');
  });
});
