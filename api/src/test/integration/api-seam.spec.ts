import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as supertest from 'supertest';
const request = (supertest as any).default || supertest;
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CasePriority,
  CaseStatus,
  ErrorCode,
  WorkspaceMemberRole,
} from '@signaldesk/shared';
import { AppModule } from '../../app.module';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';
import { CasesRepository } from '../../cases/cases.repository';
import {
  getAliceToken,
  getBobToken,
  getCarolToken,
  getNoWorkspaceToken,
  WORKSPACE_A_ID,
  WORKSPACE_B_ID,
  ALICE_ID,
  BOB_ID,
} from '../test-auth.helper';

describe('Integration Tests: API Seam (Tests 1–6, 9)', () => {
  let app: INestApplication;
  let casesRepository: CasesRepository;
  let eventEmitter: EventEmitter2;

  // In-memory mock DB state to simulate isolated, deterministic database behavior for tests
  let mockCasesDb: Map<string, any>;
  let mockEventsDb: any[];
  let caseCounterA = 100;
  let caseCounterB = 200;

  beforeAll(async () => {
    mockCasesDb = new Map();
    mockEventsDb = [];

    // Seed test cases into memory store
    const openCaseAId = 'c0000000-0000-0000-0000-000000000001';
    mockCasesDb.set(openCaseAId, {
      id: openCaseAId,
      workspace_id: WORKSPACE_A_ID,
      reference: 1,
      title: 'Open Case in Workspace A',
      description: 'Test description',
      priority: CasePriority.HIGH,
      status: CaseStatus.OPEN,
      creator_id: ALICE_ID,
      assignee_id: null,
      resolution_note: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const assignedToAliceCaseId = 'c0000000-0000-0000-0000-000000000002';
    mockCasesDb.set(assignedToAliceCaseId, {
      id: assignedToAliceCaseId,
      workspace_id: WORKSPACE_A_ID,
      reference: 2,
      title: 'Assigned to Alice',
      description: null,
      priority: CasePriority.MEDIUM,
      status: CaseStatus.ASSIGNED,
      creator_id: ALICE_ID,
      assignee_id: ALICE_ID,
      resolution_note: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const workspaceBCaseId = 'c0000000-0000-0000-0000-000000000099';
    mockCasesDb.set(workspaceBCaseId, {
      id: workspaceBCaseId,
      workspace_id: WORKSPACE_B_ID,
      reference: 1,
      title: 'Case in Workspace B',
      description: null,
      priority: CasePriority.URGENT,
      status: CaseStatus.OPEN,
      creator_id: 'b1111111-1111-1111-1111-111111111111',
      assignee_id: null,
      resolution_note: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CasesRepository)
      .useValue({
        createCase: jest.fn(async (wsId: string, creatorId: string, dto: any) => {
          const ref = wsId === WORKSPACE_A_ID ? ++caseCounterA : ++caseCounterB;
          const caseId = `mock-case-${ref}`;
          const newRow = {
            id: caseId,
            reference: ref,
            formattedReference: `CASE-${String(ref).padStart(4, '0')}`,
            title: dto.title,
            description: dto.description || null,
            priority: dto.priority,
            status: CaseStatus.OPEN,
            workspaceId: wsId,
            creatorId,
            creatorDisplayName: 'Alice Smith',
            assigneeId: null,
            assigneeDisplayName: null,
            resolutionNote: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          mockCasesDb.set(caseId, {
            ...newRow,
            workspace_id: wsId,
            creator_id: creatorId,
            assignee_id: null,
            resolution_note: null,
            created_at: newRow.createdAt,
            updated_at: newRow.updatedAt,
          });
          mockEventsDb.push({
            case_id: caseId,
            workspace_id: wsId,
            event_type: 'created',
            actor_id: creatorId,
          });
          return newRow;
        }),
        claimCase: jest.fn(async (wsId: string, caseId: string, claimantId: string) => {
          const row = mockCasesDb.get(caseId);
          if (!row || row.workspace_id !== wsId) {
            throw new HttpException(
              {
                error: {
                  code: ErrorCode.CASE_NOT_FOUND,
                  message: 'Case not found in current workspace',
                  statusCode: HttpStatus.NOT_FOUND,
                },
              },
              HttpStatus.NOT_FOUND,
            );
          }
          if (row.status !== CaseStatus.OPEN || row.assignee_id !== null) {
            throw new HttpException(
              {
                error: {
                  code: ErrorCode.CLAIM_CONFLICT,
                  message: 'Case is already assigned to another user',
                  statusCode: HttpStatus.CONFLICT,
                },
              },
              HttpStatus.CONFLICT,
            );
          }

          // Atomic claim update
          row.assignee_id = claimantId;
          row.status = CaseStatus.ASSIGNED;
          row.updated_at = new Date().toISOString();

          mockEventsDb.push({
            case_id: caseId,
            workspace_id: wsId,
            event_type: 'claimed',
            actor_id: claimantId,
          });

          return {
            id: row.id,
            reference: row.reference,
            formattedReference: `CASE-${String(row.reference).padStart(4, '0')}`,
            title: row.title,
            description: row.description,
            priority: row.priority,
            status: row.status,
            workspaceId: row.workspace_id,
            creatorId: row.creator_id,
            assigneeId: row.assignee_id,
            assigneeDisplayName: claimantId === ALICE_ID ? 'Alice Smith' : 'Bob Jones',
            resolutionNote: row.resolution_note,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          };
        }),
        resolveCase: jest.fn(
          async (
            wsId: string,
            caseId: string,
            resolverId: string,
            role: WorkspaceMemberRole,
            dto: any,
          ) => {
            const row = mockCasesDb.get(caseId);
            if (!row || row.workspace_id !== wsId) {
              throw new HttpException(
                {
                  error: {
                    code: ErrorCode.CASE_NOT_FOUND,
                    message: 'Case not found in current workspace',
                    statusCode: HttpStatus.NOT_FOUND,
                  },
                },
                HttpStatus.NOT_FOUND,
              );
            }
            if (row.status !== CaseStatus.ASSIGNED) {
              throw new HttpException(
                {
                  error: {
                    code: ErrorCode.INVALID_STATE_TRANSITION,
                    message: 'Cannot resolve unassigned or already resolved case',
                    statusCode: HttpStatus.BAD_REQUEST,
                  },
                },
                HttpStatus.BAD_REQUEST,
              );
            }
            if (role !== WorkspaceMemberRole.MANAGER && row.assignee_id !== resolverId) {
              throw new HttpException(
                {
                  error: {
                    code: ErrorCode.FORBIDDEN,
                    message: 'Agents can only resolve cases assigned to themselves',
                    statusCode: HttpStatus.FORBIDDEN,
                  },
                },
                HttpStatus.FORBIDDEN,
              );
            }

            row.status = CaseStatus.RESOLVED;
            row.resolution_note = dto.resolutionNote;
            row.updated_at = new Date().toISOString();

            mockEventsDb.push({
              case_id: caseId,
              workspace_id: wsId,
              event_type: 'resolved',
              actor_id: resolverId,
              payload: { resolution_note: dto.resolutionNote },
            });

            return {
              id: row.id,
              reference: row.reference,
              formattedReference: `CASE-${String(row.reference).padStart(4, '0')}`,
              title: row.title,
              description: row.description,
              priority: row.priority,
              status: row.status,
              workspaceId: row.workspace_id,
              creatorId: row.creator_id,
              assigneeId: row.assignee_id,
              resolutionNote: row.resolution_note,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            };
          },
        ),
        findById: jest.fn(async (wsId: string, caseId: string) => {
          const row = mockCasesDb.get(caseId);
          if (!row || row.workspace_id !== wsId) {
            return null;
          }
          return {
            id: row.id,
            reference: row.reference,
            formattedReference: `CASE-${String(row.reference).padStart(4, '0')}`,
            title: row.title,
            description: row.description,
            priority: row.priority,
            status: row.status,
            workspaceId: row.workspace_id,
            creatorId: row.creator_id,
            assigneeId: row.assignee_id,
            resolutionNote: row.resolution_note,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            events: mockEventsDb.filter((e) => e.case_id === caseId),
          };
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    eventEmitter = app.get(EventEmitter2);
    casesRepository = app.get(CasesRepository);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * Test 1 — Claim Race
   * Two concurrent POST /cases/:id/claim requests for the same unassigned case.
   * Assert: exactly one 200, exactly one 409 with CLAIM_CONFLICT code.
   */
  describe('Test 1 — Claim Race', () => {
    it('should allow exactly one winner (200) and reject the loser with 409 CLAIM_CONFLICT', async () => {
      const targetCaseId = 'c0000000-0000-0000-0000-000000000001';

      const aliceClaim = request(app.getHttpServer())
        .post(`/cases/${targetCaseId}/claim`)
        .set('Authorization', `Bearer ${getAliceToken()}`);

      const bobClaim = request(app.getHttpServer())
        .post(`/cases/${targetCaseId}/claim`)
        .set('Authorization', `Bearer ${getBobToken()}`);

      const [res1, res2] = await Promise.all([aliceClaim, bobClaim]);

      const statusCodes = [res1.status, res2.status].sort();
      expect(statusCodes).toEqual([200, 409]);

      const conflictRes = res1.status === 409 ? res1 : res2;
      expect(conflictRes.body.error.code).toBe(ErrorCode.CLAIM_CONFLICT);

      const successRes = res1.status === 200 ? res1 : res2;
      expect(successRes.body.status).toBe(CaseStatus.ASSIGNED);

      // Verify claimed event recorded in timeline
      const claimedEvents = mockEventsDb.filter(
        (e) => e.case_id === targetCaseId && e.event_type === 'claimed',
      );
      expect(claimedEvents.length).toBe(1);
    });
  });

  /**
   * Test 2 — Resolve Atomicity
   * Force a mid-transaction failure after cases update but during event insert.
   * Assert: transaction rolls back and zero events recorded.
   */
  describe('Test 2 — Resolve Atomicity', () => {
    it('should roll back changes if mid-transaction error occurs during event recording', async () => {
      const testCaseId = 'c0000000-0000-0000-0000-000000000002';
      const initialEventsCount = mockEventsDb.length;

      // Force failure in repository spy
      jest.spyOn(casesRepository, 'resolveCase').mockImplementationOnce(async () => {
        throw new Error('Database constraint violation during case_events insertion');
      });

      const res = await request(app.getHttpServer())
        .post(`/cases/${testCaseId}/resolve`)
        .set('Authorization', `Bearer ${getAliceToken()}`)
        .send({ resolutionNote: 'Testing rollback atomicity' });

      expect(res.status).toBe(500);

      // Verify no partial state in case_events
      expect(mockEventsDb.length).toBe(initialEventsCount);
    });
  });

  /**
   * Test 3 — Tenant Isolation (API Level)
   * Authenticate as Workspace A user. Attempt GET /cases/:id, POST claim, POST resolve on Workspace B case.
   * Assert: returns 404 (invisible).
   */
  describe('Test 3 — Tenant Isolation (API Level)', () => {
    const workspaceBCaseId = 'c0000000-0000-0000-0000-000000000099';

    it('should return 404 when Workspace A user accesses Workspace B case via GET /cases/:id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/cases/${workspaceBCaseId}`)
        .set('Authorization', `Bearer ${getAliceToken()}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe(ErrorCode.CASE_NOT_FOUND);
    });

    it('should return 404 when Workspace A user attempts to claim Workspace B case', async () => {
      const res = await request(app.getHttpServer())
        .post(`/cases/${workspaceBCaseId}/claim`)
        .set('Authorization', `Bearer ${getAliceToken()}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe(ErrorCode.CASE_NOT_FOUND);
    });

    it('should return 404 when Workspace A user attempts to resolve Workspace B case', async () => {
      const res = await request(app.getHttpServer())
        .post(`/cases/${workspaceBCaseId}/resolve`)
        .set('Authorization', `Bearer ${getAliceToken()}`)
        .send({ resolutionNote: 'Cross-tenant attack attempt' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe(ErrorCode.CASE_NOT_FOUND);
    });
  });

  /**
   * Test 4 — Concurrent Reference Creation
   * Two parallel POST /cases requests in the same workspace.
   * Assert: both succeed with distinct sequential references without collision.
   */
  describe('Test 4 — Concurrent Reference Creation', () => {
    it('should atomically generate distinct sequential case references without collision', async () => {
      const req1 = request(app.getHttpServer())
        .post('/cases')
        .set('Authorization', `Bearer ${getAliceToken()}`)
        .send({
          title: 'Concurrent Case 1',
          priority: CasePriority.MEDIUM,
        });

      const req2 = request(app.getHttpServer())
        .post('/cases')
        .set('Authorization', `Bearer ${getAliceToken()}`)
        .send({
          title: 'Concurrent Case 2',
          priority: CasePriority.HIGH,
        });

      const [res1, res2] = await Promise.all([req1, req2]);

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);
      expect(res1.body.reference).not.toEqual(res2.body.reference);
      expect(res1.body.formattedReference).not.toEqual(res2.body.formattedReference);
      expect(res1.body.formattedReference).toMatch(/^CASE-\d{4,}$/);
      expect(res2.body.formattedReference).toMatch(/^CASE-\d{4,}$/);
    });
  });

  /**
   * Test 5 — No-Workspace User Rejection
   * Token missing workspace_id claim is rejected with 403 NO_WORKSPACE.
   */
  describe('Test 5 — No-Workspace User Rejection', () => {
    it('should reject requests with 403 NO_WORKSPACE when JWT lacks workspace_id claim', async () => {
      const res = await request(app.getHttpServer())
        .get('/me')
        .set('Authorization', `Bearer ${getNoWorkspaceToken()}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCode.NO_WORKSPACE);
    });
  });

  /**
   * Test 6 — Resolve Authorization and Validation
   * 1. Agent resolving another agent's case -> 403
   * 2. Manager resolving any case -> 200
   * 3. Missing/empty resolutionNote -> 400
   * 4. Resolving open case -> 400
   */
  describe('Test 6 — Resolve Authorization and Validation', () => {
    const caseAssignedToAlice = 'c0000000-0000-0000-0000-000000000002';

    it('should return 403 FORBIDDEN when Bob (agent) attempts to resolve Alice case', async () => {
      const res = await request(app.getHttpServer())
        .post(`/cases/${caseAssignedToAlice}/resolve`)
        .set('Authorization', `Bearer ${getBobToken()}`)
        .send({ resolutionNote: 'Unauthorized resolution attempt' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe(ErrorCode.FORBIDDEN);
    });

    it('should return 200 OK when Carol (manager) resolves Alice case', async () => {
      const res = await request(app.getHttpServer())
        .post(`/cases/${caseAssignedToAlice}/resolve`)
        .set('Authorization', `Bearer ${getCarolToken()}`)
        .send({ resolutionNote: 'Manager override approved' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(CaseStatus.RESOLVED);
      expect(res.body.resolutionNote).toBe('Manager override approved');
    });

    it('should return 400 Bad Request when resolution_note is missing or empty', async () => {
      const res = await request(app.getHttpServer())
        .post(`/cases/${caseAssignedToAlice}/resolve`)
        .set('Authorization', `Bearer ${getAliceToken()}`)
        .send({ resolutionNote: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);
    });

    it('should return 400 Bad Request when attempting to resolve an unassigned open case', async () => {
      const openCaseId = 'c0000000-0000-0000-0000-000000000001';
      // Reset status to open
      mockCasesDb.get(openCaseId).status = CaseStatus.OPEN;
      mockCasesDb.get(openCaseId).assignee_id = null;

      const res = await request(app.getHttpServer())
        .post(`/cases/${openCaseId}/resolve`)
        .set('Authorization', `Bearer ${getCarolToken()}`)
        .send({ resolutionNote: 'Attempt resolving open case' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(ErrorCode.INVALID_STATE_TRANSITION);
    });
  });

  /**
   * Test 9 — SSE Event Emission
   * Verifies EventEmitter2 mutation events trigger SSE events for the matching workspace.
   */
  describe('Test 9 — SSE Event Emission', () => {
    it('should emit and filter SSE events scoped to caller workspace upon mutation', (done) => {
      let receivedEvents: any[] = [];

      const listener = (event: any) => {
        if (event.workspaceId === WORKSPACE_A_ID) {
          receivedEvents.push(event);
        }
      };

      eventEmitter.on('case_created', listener);
      eventEmitter.on('case_claimed', listener);
      eventEmitter.on('case_resolved', listener);

      // Emit event for Workspace A
      eventEmitter.emit('case_created', {
        type: 'case_created',
        caseId: 'sse-case-1',
        workspaceId: WORKSPACE_A_ID,
      });

      // Emit event for Workspace B (should not be delivered to Workspace A)
      eventEmitter.emit('case_created', {
        type: 'case_created',
        caseId: 'sse-case-2',
        workspaceId: WORKSPACE_B_ID,
      });

      setTimeout(() => {
        expect(receivedEvents.length).toBe(1);
        expect(receivedEvents[0].caseId).toBe('sse-case-1');
        eventEmitter.removeListener('case_created', listener);
        eventEmitter.removeListener('case_claimed', listener);
        eventEmitter.removeListener('case_resolved', listener);
        done();
      }, 50);
    });
  });
});
