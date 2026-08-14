import { HttpException, HttpStatus } from '@nestjs/common';
import { CasePriority, CaseStatus, ErrorCode } from '@signaldesk/shared';
import { CasesRepository } from './cases.repository';
import { CreateCaseDto } from './dto/create-case.dto';
import { ListCasesQueryDto } from './dto/list-cases-query.dto';

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
      selectFrom: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      execute: jest.fn(),
      executeTakeFirst: jest.fn(),
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

    mockTrx.executeTakeFirst
      .mockResolvedValueOnce({ case_counter: 7 })
      .mockResolvedValueOnce({ display_name: 'Alice Smith' });

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
    expect(result.formattedReference).toBe('CASE-0007');
    expect(result.title).toBe('Database connection issue');
  });

  it('should claim case successfully via atomic UPDATE and record claimed event', async () => {
    const workspaceId = 'a0000000-0000-0000-0000-000000000001';
    const caseId = 'case-uuid-1';
    const claimantId = 'a2222222-2222-2222-2222-222222222222';

    // 1. Atomic UPDATE returns updated case
    mockTrx.executeTakeFirst
      .mockResolvedValueOnce({
        id: caseId,
        reference: 1,
        title: 'Open Case',
        description: null,
        priority: CasePriority.HIGH,
        status: CaseStatus.ASSIGNED,
        workspace_id: workspaceId,
        creator_id: 'a1111111-1111-1111-1111-111111111111',
        assignee_id: claimantId,
        resolution_note: null,
        created_at: '2026-08-14T00:00:00.000Z',
        updated_at: '2026-08-14T01:00:00.000Z',
      })
      .mockResolvedValueOnce({ display_name: 'Alice Smith' }) // creator
      .mockResolvedValueOnce({ display_name: 'Bob Jones' }); // assignee

    const result = await repository.claimCase(workspaceId, caseId, claimantId);

    expect(mockTrx.updateTable).toHaveBeenCalledWith('cases');
    expect(mockTrx.insertInto).toHaveBeenCalledWith('case_events');
    expect(result.status).toBe(CaseStatus.ASSIGNED);
    expect(result.assigneeId).toBe(claimantId);
    expect(result.assigneeDisplayName).toBe('Bob Jones');
  });

  it('should throw 409 CLAIM_CONFLICT if case is already assigned or resolved', async () => {
    const workspaceId = 'a0000000-0000-0000-0000-000000000001';
    const caseId = 'case-uuid-1';
    const claimantId = 'a2222222-2222-2222-2222-222222222222';

    // 1. Atomic UPDATE returns undefined (0 rows affected)
    mockTrx.executeTakeFirst
      .mockResolvedValueOnce(undefined) // updateTable returned 0 rows
      .mockResolvedValueOnce({
        id: caseId,
        status: CaseStatus.ASSIGNED,
        assignee_id: 'someone-else',
      }); // existingCase lookup

    try {
      await repository.claimCase(workspaceId, caseId, claimantId);
      fail('Should have thrown HttpException');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      const httpErr = err as HttpException;
      expect(httpErr.getStatus()).toBe(HttpStatus.CONFLICT);
      const res = httpErr.getResponse() as any;
      expect(res.error.code).toBe(ErrorCode.CLAIM_CONFLICT);
    }
  });

  it('should throw 404 CASE_NOT_FOUND in claimCase if case does not exist in workspace', async () => {
    const workspaceId = 'a0000000-0000-0000-0000-000000000001';
    const caseId = 'case-uuid-1';
    const claimantId = 'a2222222-2222-2222-2222-222222222222';

    // 1. Atomic UPDATE returns undefined
    // 2. Select existingCase returns undefined
    mockTrx.executeTakeFirst
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    try {
      await repository.claimCase(workspaceId, caseId, claimantId);
      fail('Should have thrown HttpException');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      const httpErr = err as HttpException;
      expect(httpErr.getStatus()).toBe(HttpStatus.NOT_FOUND);
      const res = httpErr.getResponse() as any;
      expect(res.error.code).toBe(ErrorCode.CASE_NOT_FOUND);
    }
  });

  it('should query cases with filters in findAll and return paginated data', async () => {
    const workspaceId = 'a0000000-0000-0000-0000-000000000001';
    const currentUserId = 'a1111111-1111-1111-1111-111111111111';
    const query: ListCasesQueryDto = {
      status: CaseStatus.OPEN,
      priority: CasePriority.URGENT,
      mine: true,
      limit: 10,
    };

    mockDb.execute.mockResolvedValueOnce([
      {
        id: 'case-uuid-1',
        reference: 1,
        title: 'Urgent open case',
        description: null,
        priority: CasePriority.URGENT,
        status: CaseStatus.OPEN,
        workspace_id: workspaceId,
        creator_id: currentUserId,
        creator_display_name: 'Alice Smith',
        assignee_id: currentUserId,
        assignee_display_name: 'Alice Smith',
        resolution_note: null,
        created_at: '2026-08-14T00:00:00.000Z',
        updated_at: '2026-08-14T00:00:00.000Z',
      },
    ]);

    const result = await repository.findAll(workspaceId, currentUserId, query);

    expect(mockDb.selectFrom).toHaveBeenCalledWith('cases');
    expect(mockDb.where).toHaveBeenCalledWith('cases.workspace_id', '=', workspaceId);
    expect(mockDb.where).toHaveBeenCalledWith('cases.status', '=', CaseStatus.OPEN);
    expect(mockDb.where).toHaveBeenCalledWith('cases.priority', '=', CasePriority.URGENT);
    expect(mockDb.where).toHaveBeenCalledWith('cases.assignee_id', '=', currentUserId);
    expect(result.data.length).toBe(1);
    expect(result.data[0].formattedReference).toBe('CASE-0001');
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('should find single case and its events by ID in findById', async () => {
    const workspaceId = 'a0000000-0000-0000-0000-000000000001';
    const caseId = 'case-uuid-1';

    mockDb.executeTakeFirst.mockResolvedValueOnce({
      id: caseId,
      reference: 1,
      title: 'Resolved case',
      description: null,
      priority: CasePriority.HIGH,
      status: CaseStatus.RESOLVED,
      workspace_id: workspaceId,
      creator_id: 'a1111111-1111-1111-1111-111111111111',
      creator_display_name: 'Alice Smith',
      assignee_id: 'a1111111-1111-1111-1111-111111111111',
      assignee_display_name: 'Alice Smith',
      resolution_note: 'Fixed the issue',
      created_at: '2026-08-14T00:00:00.000Z',
      updated_at: '2026-08-14T01:00:00.000Z',
    });

    mockDb.execute.mockResolvedValueOnce([
      {
        id: 'event-1',
        case_id: caseId,
        workspace_id: workspaceId,
        event_type: 'created',
        actor_id: 'a1111111-1111-1111-1111-111111111111',
        actor_display_name: 'Alice Smith',
        payload: {},
        created_at: '2026-08-14T00:00:00.000Z',
      },
    ]);

    const result = await repository.findById(workspaceId, caseId);

    expect(result).not.toBeNull();
    expect(result?.id).toBe(caseId);
    expect(result?.events?.length).toBe(1);
    expect(result?.events?.[0].eventType).toBe('created');
  });

  it('should return null when case is not found in workspace', async () => {
    mockDb.executeTakeFirst.mockResolvedValueOnce(undefined);

    const result = await repository.findById('wrong-ws', 'case-uuid-1');
    expect(result).toBeNull();
  });
});
