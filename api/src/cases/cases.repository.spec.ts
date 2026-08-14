import { CasePriority, CaseStatus } from '@signaldesk/shared';
import { CasesRepository } from './cases.repository';
import { CreateCaseDto } from './dto/create-case.dto';

describe('CasesRepository', () => {
  let repository: CasesRepository;
  let mockDb: any;
  let mockTrx: any;

  beforeEach(() => {
    mockTrx = {
      updateTable: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      executeTakeFirst: jest.fn(),
      insertInto: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returningAll: jest.fn().mockReturnThis(),
      executeTakeFirstOrThrow: jest.fn(),
      execute: jest.fn(),
      selectFrom: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
    };

    mockDb = {
      transaction: jest.fn().mockReturnValue({
        execute: jest.fn().mockImplementation((callback) => callback(mockTrx)),
      }),
    };

    repository = new CasesRepository(mockDb);
  });

  it('should execute case creation within a transaction and return formatted case', async () => {
    const workspaceId = 'a0000000-0000-0000-0000-000000000001';
    const creatorId = 'a1111111-1111-1111-1111-111111111111';
    const dto: CreateCaseDto = {
      title: 'Database connection issue',
      description: 'Slow queries',
      priority: CasePriority.MEDIUM,
    };

    // Mock counter increment
    mockTrx.executeTakeFirst
      .mockResolvedValueOnce({ case_counter: 7 }) // updateTable workspaces
      .mockResolvedValueOnce({ display_name: 'Alice Smith' }); // selectFrom workspace_members

    // Mock case insertion
    mockTrx.executeTakeFirstOrThrow.mockResolvedValueOnce({
      id: 'case-uuid-777',
      workspace_id: workspaceId,
      reference: 7,
      title: 'Database connection issue',
      description: 'Slow queries',
      priority: CasePriority.MEDIUM,
      status: CaseStatus.OPEN,
      creator_id: creatorId,
      assignee_id: null,
      resolution_note: null,
      created_at: '2026-08-14T00:00:00.000Z',
      updated_at: '2026-08-14T00:00:00.000Z',
    });

    const result = await repository.createCase(workspaceId, creatorId, dto);

    expect(mockDb.transaction).toHaveBeenCalled();
    expect(mockTrx.updateTable).toHaveBeenCalledWith('workspaces');
    expect(mockTrx.insertInto).toHaveBeenCalledWith('cases');
    expect(mockTrx.insertInto).toHaveBeenCalledWith('case_events');
    expect(result).toEqual({
      id: 'case-uuid-777',
      reference: 7,
      formattedReference: 'CASE-0007',
      title: 'Database connection issue',
      description: 'Slow queries',
      priority: CasePriority.MEDIUM,
      status: CaseStatus.OPEN,
      workspaceId,
      creatorId,
      creatorDisplayName: 'Alice Smith',
      assigneeId: null,
      assigneeDisplayName: null,
      resolutionNote: null,
      createdAt: '2026-08-14T00:00:00.000Z',
      updatedAt: '2026-08-14T00:00:00.000Z',
    });
  });
});
