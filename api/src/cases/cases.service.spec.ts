import { EventEmitter2 } from '@nestjs/event-emitter';
import { CasePriority, CaseStatus } from '@signaldesk/shared';
import { CasesService } from './cases.service';
import { CasesRepository } from './cases.repository';
import { CreateCaseDto } from './dto/create-case.dto';

describe('CasesService', () => {
  let service: CasesService;
  let mockRepository: jest.Mocked<CasesRepository>;
  let mockEventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(() => {
    mockRepository = {
      createCase: jest.fn(),
    } as any;

    mockEventEmitter = {
      emit: jest.fn(),
    } as any;

    service = new CasesService(mockRepository, mockEventEmitter);
  });

  it('should create a case and emit a case_created event', async () => {
    const workspaceId = 'a0000000-0000-0000-0000-000000000001';
    const creatorId = 'a1111111-1111-1111-1111-111111111111';
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
});
