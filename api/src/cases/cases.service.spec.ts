import { EventEmitter2 } from '@nestjs/event-emitter';
import { HttpException, HttpStatus } from '@nestjs/common';
import { CasePriority, CaseStatus, ErrorCode, WorkspaceMemberRole } from '@signaldesk/shared';
import { CasesService } from './cases.service';
import { CasesRepository } from './cases.repository';
import { CreateCaseDto } from './dto/create-case.dto';
import { ListCasesQueryDto } from './dto/list-cases-query.dto';
import { ResolveCaseDto } from './dto/resolve-case.dto';

describe('CasesService', () => {
  let service: CasesService;
  let mockRepository: jest.Mocked<CasesRepository>;
  let mockEventEmitter: jest.Mocked<EventEmitter2>;

  const workspaceId = 'a0000000-0000-0000-0000-000000000001';
  const creatorId = 'a1111111-1111-1111-1111-111111111111';

  beforeEach(() => {
    mockRepository = {
      createCase: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      claimCase: jest.fn(),
      resolveCase: jest.fn(),
    } as any;

    mockEventEmitter = {
      emit: jest.fn(),
    } as any;

    service = new CasesService(mockRepository, mockEventEmitter);
  });

  it('should create a case and emit a case_created event', async () => {
    const dto: CreateCaseDto = {
      title: 'New support request',
      description: 'Detailed description',
      priority: CasePriority.HIGH,
    };

    const mockCreatedCase = {
      id: 'case-uuid-1234',
      reference: 42,
      formattedReference: 'CASE-0042',
      title: 'New support request',
      description: 'Detailed description',
      priority: CasePriority.HIGH,
      status: CaseStatus.OPEN,
      workspaceId,
      creatorId,
      creatorDisplayName: 'Alice Smith',
      assigneeId: null,
      assigneeDisplayName: null,
      resolutionNote: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockRepository.createCase.mockResolvedValue(mockCreatedCase);

    const result = await service.createCase(workspaceId, creatorId, dto);

    expect(mockRepository.createCase).toHaveBeenCalledWith(
      workspaceId,
      creatorId,
      dto,
    );
    expect(mockEventEmitter.emit).toHaveBeenCalledWith('case_created', {
      type: 'case_created',
      caseId: 'case-uuid-1234',
      workspaceId,
    });
    expect(result).toEqual(mockCreatedCase);
  });

  it('should return paginated list from findAll', async () => {
    const query: ListCasesQueryDto = { limit: 10 };
    const mockPaginated = {
      data: [],
      nextCursor: null,
      hasMore: false,
    };

    mockRepository.findAll.mockResolvedValue(mockPaginated);

    const result = await service.findAll(workspaceId, creatorId, query);

    expect(mockRepository.findAll).toHaveBeenCalledWith(
      workspaceId,
      creatorId,
      query,
    );
    expect(result).toEqual(mockPaginated);
  });

  it('should return case by ID if found', async () => {
    const mockCase = {
      id: 'case-uuid-1234',
      reference: 1,
      formattedReference: 'CASE-0001',
      title: 'Valid Case',
      description: null,
      priority: CasePriority.LOW,
      status: CaseStatus.OPEN,
      workspaceId,
      creatorId,
      assigneeId: null,
      resolutionNote: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockRepository.findById.mockResolvedValue(mockCase);

    const result = await service.findById(workspaceId, 'case-uuid-1234');

    expect(mockRepository.findById).toHaveBeenCalledWith(
      workspaceId,
      'case-uuid-1234',
    );
    expect(result).toEqual(mockCase);
  });

  it('should throw 404 CASE_NOT_FOUND when case does not exist or belongs to another workspace', async () => {
    mockRepository.findById.mockResolvedValue(null);

    try {
      await service.findById(workspaceId, 'non-existent-case');
      fail('Should have thrown HttpException');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      const httpErr = err as HttpException;
      expect(httpErr.getStatus()).toBe(HttpStatus.NOT_FOUND);
      const res = httpErr.getResponse() as any;
      expect(res.error.code).toBe(ErrorCode.CASE_NOT_FOUND);
    }
  });

  it('should claim case and emit case_claimed event', async () => {
    const mockClaimedCase = {
      id: 'case-uuid-1234',
      reference: 1,
      formattedReference: 'CASE-0001',
      title: 'Valid Case',
      description: null,
      priority: CasePriority.LOW,
      status: CaseStatus.ASSIGNED,
      workspaceId,
      creatorId,
      assigneeId: creatorId,
      assigneeDisplayName: 'Alice Smith',
      resolutionNote: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockRepository.claimCase.mockResolvedValue(mockClaimedCase);

    const result = await service.claimCase(workspaceId, 'case-uuid-1234', creatorId);

    expect(mockRepository.claimCase).toHaveBeenCalledWith(
      workspaceId,
      'case-uuid-1234',
      creatorId,
    );
    expect(mockEventEmitter.emit).toHaveBeenCalledWith('case_claimed', {
      type: 'case_claimed',
      caseId: 'case-uuid-1234',
      workspaceId,
    });
    expect(result).toEqual(mockClaimedCase);
  });

  it('should resolve case and emit case_resolved event', async () => {
    const resolveDto: ResolveCaseDto = {
      resolutionNote: 'Fixed configuration issue.',
    };

    const mockResolvedCase = {
      id: 'case-uuid-1234',
      reference: 1,
      formattedReference: 'CASE-0001',
      title: 'Valid Case',
      description: null,
      priority: CasePriority.LOW,
      status: CaseStatus.RESOLVED,
      workspaceId,
      creatorId,
      assigneeId: creatorId,
      assigneeDisplayName: 'Alice Smith',
      resolutionNote: 'Fixed configuration issue.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockRepository.resolveCase.mockResolvedValue(mockResolvedCase);

    const result = await service.resolveCase(
      workspaceId,
      'case-uuid-1234',
      creatorId,
      WorkspaceMemberRole.AGENT,
      resolveDto,
    );

    expect(mockRepository.resolveCase).toHaveBeenCalledWith(
      workspaceId,
      'case-uuid-1234',
      creatorId,
      WorkspaceMemberRole.AGENT,
      resolveDto,
    );
    expect(mockEventEmitter.emit).toHaveBeenCalledWith('case_resolved', {
      type: 'case_resolved',
      caseId: 'case-uuid-1234',
      workspaceId,
    });
    expect(result).toEqual(mockResolvedCase);
  });
});
