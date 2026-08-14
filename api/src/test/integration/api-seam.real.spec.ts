import { CasePriority, CaseStatus, ErrorCode } from '@signaldesk/shared';
import {
  authenticateSeededAccount,
  FixtureTracker,
  getIntegrationConfig,
  INTEGRATION_ACCOUNTS,
  INTEGRATION_WORKSPACE_ID,
  IntegrationConfig,
  IntegrationDatabase,
  openSseConnection,
  RealSession,
  requestJson,
  WORKSPACE_B_CASE_ID,
} from './real-supabase';

interface CaseResponse {
  id: string;
  reference: number;
  status: CaseStatus;
  assigneeId: string | null;
  resolutionNote: string | null;
}

interface PaginatedCaseResponse {
  data: CaseResponse[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface ErrorResponse {
  error: { code: string };
}

describe('Integration Tests: real NestJS HTTP seam (Tests 1–6, 9)', () => {
  let config: IntegrationConfig;
  let database: IntegrationDatabase;
  let fixtures: FixtureTracker;
  let agentOne: RealSession;
  let agentTwo: RealSession;
  let manager: RealSession;
  let noWorkspace: RealSession;
  let alice: RealSession;

  const createCase = async (session: RealSession, title: string) => {
    const response = await requestJson<CaseResponse>(
      config.apiUrl,
      '/cases',
      {
        method: 'POST',
        body: JSON.stringify({ title, priority: CasePriority.HIGH }),
      },
      session.accessToken,
    );
    expect(response.status).toBe(201);
    fixtures.trackCase(response.body.id);
    return response.body;
  };

  const claimCase = (session: RealSession, caseId: string) =>
    requestJson<CaseResponse | ErrorResponse>(
      config.apiUrl,
      `/cases/${caseId}/claim`,
      { method: 'POST' },
      session.accessToken,
    );

  const resolveCase = (session: RealSession, caseId: string, resolutionNote: string) =>
    requestJson<CaseResponse | ErrorResponse>(
      config.apiUrl,
      `/cases/${caseId}/resolve`,
      { method: 'POST', body: JSON.stringify({ resolutionNote }) },
      session.accessToken,
    );

  beforeAll(async () => {
    config = getIntegrationConfig();
    database = new IntegrationDatabase(config.databaseUrl);
    await database.assertAvailable();
    [agentOne, agentTwo, manager, noWorkspace, alice] = await Promise.all([
      authenticateSeededAccount(config, INTEGRATION_ACCOUNTS.agentOne),
      authenticateSeededAccount(config, INTEGRATION_ACCOUNTS.agentTwo),
      authenticateSeededAccount(config, INTEGRATION_ACCOUNTS.manager),
      authenticateSeededAccount(config, INTEGRATION_ACCOUNTS.noWorkspace),
      authenticateSeededAccount(config, INTEGRATION_ACCOUNTS.alice),
    ]);

    expect(agentOne.claims).toMatchObject({
      role: 'authenticated',
      workspace_id: INTEGRATION_WORKSPACE_ID,
      workspace_role: 'agent',
    });
    expect(manager.claims).toMatchObject({ workspace_role: 'manager' });
    expect(noWorkspace.claims).not.toHaveProperty('workspace_id');

    const preflight = await requestJson<{ data: CaseResponse[] }>(
      config.apiUrl,
      '/cases?limit=20',
      { method: 'GET' },
      alice.accessToken,
    );
    if (preflight.status !== 200 || preflight.body.data.length === 0) {
      throw new Error(
        `Seeded Case Queue preflight failed: expected Alice to receive at least one Case, received HTTP ${preflight.status} with ${preflight.body.data?.length ?? 0} Cases`,
      );
    }
  });

  beforeEach(() => {
    fixtures = new FixtureTracker(database);
  });

  afterEach(async () => {
    await fixtures?.cleanup();
  });

  afterAll(async () => {
    await database.close();
  });

  it('Test 1: allows exactly one Claim winner and persists one claimed Case Event', async () => {
    await fixtures.prepareWorkspace(INTEGRATION_WORKSPACE_ID);
    const created = await createCase(agentOne, fixtures.title('claim-race'));

    const [first, second] = await Promise.all([
      claimCase(agentOne, created.id),
      claimCase(agentTwo, created.id),
    ]);

    expect([first.status, second.status].sort()).toEqual([200, 409]);
    const winner = first.status === 200 ? (first.body as CaseResponse) : (second.body as CaseResponse);
    const loser = first.status === 409 ? (first.body as ErrorResponse) : (second.body as ErrorResponse);
    expect(loser.error.code).toBe(ErrorCode.CLAIM_CONFLICT);

    const persisted = await database.caseState(created.id);
    expect(persisted).toMatchObject({
      status: CaseStatus.ASSIGNED,
      assignee_id: winner.assigneeId,
    });
    const events = await database.caseEvents(created.id);
    expect(events.filter((event) => event.event_type === 'claimed')).toHaveLength(1);
  });

  it('Test 2: rolls back resolution when the real Case Event insert fails', async () => {
    await fixtures.prepareWorkspace(INTEGRATION_WORKSPACE_ID);
    const title = fixtures.title('resolve-atomicity');
    const created = await createCase(agentOne, title);
    const claim = await claimCase(agentOne, created.id);
    expect(claim.status).toBe(200);

    await fixtures.installResolvedEventFailureTrigger(title);
    const resolution = await resolveCase(manager, created.id, 'Trigger must roll back this resolution');
    expect(resolution.status).toBe(500);

    const persisted = await database.caseState(created.id);
    expect(persisted).toMatchObject({
      status: CaseStatus.ASSIGNED,
      assignee_id: expect.any(String),
      resolution_note: null,
    });
    const events = await database.caseEvents(created.id);
    expect(events.filter((event) => event.event_type === 'resolved')).toHaveLength(0);
  });

  it('Test 3: keeps a Workspace B Case invisible to a Workspace A Agent', async () => {
    const get = await requestJson<CaseResponse | ErrorResponse>(
      config.apiUrl,
      `/cases/${WORKSPACE_B_CASE_ID}`,
      { method: 'GET' },
      alice.accessToken,
    );
    const claim = await claimCase(alice, WORKSPACE_B_CASE_ID);
    const resolve = await resolveCase(alice, WORKSPACE_B_CASE_ID, 'Cross-Workspace attempt');

    for (const response of [get, claim, resolve]) {
      expect(response.status).toBe(404);
      expect((response.body as ErrorResponse).error.code).toBe(
        ErrorCode.CASE_NOT_FOUND,
      );
    }
  });

  it('Test 4: creates distinct sequential References under real concurrent requests', async () => {
    await fixtures.prepareWorkspace(INTEGRATION_WORKSPACE_ID);
    const counterBefore = await database.workspaceCounter(INTEGRATION_WORKSPACE_ID);

    const [first, second] = await Promise.all([
      createCase(agentOne, fixtures.title('reference-one')),
      createCase(agentOne, fixtures.title('reference-two')),
    ]);

    expect([first.reference, second.reference].sort((a, b) => a - b)).toEqual([
      counterBefore + 1,
      counterBefore + 2,
    ]);
  });

  it('Test 5: rejects an authenticated account without a Workspace membership', async () => {
    const response = await requestJson<ErrorResponse>(
      config.apiUrl,
      '/me',
      { method: 'GET' },
      noWorkspace.accessToken,
    );

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe(ErrorCode.NO_WORKSPACE);
  });

  it('Test 6: enforces resolve authorization, validation, and Case state transitions', async () => {
    await fixtures.prepareWorkspace(INTEGRATION_WORKSPACE_ID);
    const assigned = await createCase(agentOne, fixtures.title('resolve-authorization'));
    expect((await claimCase(agentOne, assigned.id)).status).toBe(200);

    const forbidden = await resolveCase(agentTwo, assigned.id, 'Another Agent cannot resolve');
    expect(forbidden.status).toBe(403);
    expect((forbidden.body as ErrorResponse).error.code).toBe(ErrorCode.FORBIDDEN);

    const emptyNote = await resolveCase(agentOne, assigned.id, '');
    expect(emptyNote.status).toBe(400);
    expect((emptyNote.body as ErrorResponse).error.code).toBe(ErrorCode.VALIDATION_ERROR);

    const missingNote = await requestJson<ErrorResponse>(
      config.apiUrl,
      `/cases/${assigned.id}/resolve`,
      { method: 'POST', body: JSON.stringify({}) },
      agentOne.accessToken,
    );
    expect(missingNote.status).toBe(400);
    expect(missingNote.body.error.code).toBe(ErrorCode.VALIDATION_ERROR);

    const managerResolution = await resolveCase(manager, assigned.id, 'Manager override');
    expect(managerResolution.status).toBe(200);
    expect((managerResolution.body as CaseResponse).status).toBe(CaseStatus.RESOLVED);

    const resolvedAgain = await resolveCase(manager, assigned.id, 'Second resolution');
    expect(resolvedAgain.status).toBe(400);

    const open = await createCase(agentOne, fixtures.title('resolve-open'));
    const openResolution = await resolveCase(manager, open.id, 'Cannot resolve an open Case');
    expect(openResolution.status).toBe(400);
    expect((openResolution.body as ErrorResponse).error.code).toBe(
      ErrorCode.INVALID_STATE_TRANSITION,
    );
  });

  it('Test 7: returns every Case once when following server-issued cursors', async () => {
    const caseIds = new Set<string>();
    let cursor: string | null = null;
    let pageCount = 0;

    do {
      const query = cursor
        ? `/cases?limit=2&cursor=${encodeURIComponent(cursor)}`
        : '/cases?limit=2';
      const page = await requestJson<PaginatedCaseResponse>(
        config.apiUrl,
        query,
        { method: 'GET' },
        alice.accessToken,
      );

      expect(page.status).toBe(200);
      expect(page.body.data).not.toHaveLength(0);
      for (const caseItem of page.body.data) {
        expect(caseIds.has(caseItem.id)).toBe(false);
        caseIds.add(caseItem.id);
      }

      cursor = page.body.nextCursor;
      pageCount += 1;
      expect(pageCount).toBeLessThan(100);
    } while (cursor);

    expect(caseIds.size).toBeGreaterThan(2);
  });

  it('Test 9: emits a Case mutation through the authenticated HTTP SSE stream', async () => {
    await fixtures.prepareWorkspace(INTEGRATION_WORKSPACE_ID);
    const connection = await openSseConnection(config.apiUrl, agentTwo.accessToken);
    try {
      const created = await createCase(agentOne, fixtures.title('sse'));
      await expect(connection.nextEvent).resolves.toEqual({
        type: 'case_created',
        caseId: created.id,
      });
    } finally {
      connection.close();
    }
  });
});
