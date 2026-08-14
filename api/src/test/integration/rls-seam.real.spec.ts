import {
  authenticateSeededAccount,
  getIntegrationConfig,
  INTEGRATION_ACCOUNTS,
  IntegrationConfig,
  IntegrationDatabase,
  RealSession,
  WORKSPACE_A_ID,
  WORKSPACE_B_CASE_ID,
} from './real-supabase';

describe('Integration Tests: real PostgreSQL RLS seam (Tests 7–8)', () => {
  let config: IntegrationConfig;
  let database: IntegrationDatabase;
  let alice: RealSession;

  beforeAll(async () => {
    config = getIntegrationConfig();
    database = new IntegrationDatabase(config.databaseUrl);
    await database.assertAvailable();
    alice = await authenticateSeededAccount(config, INTEGRATION_ACCOUNTS.alice);
    expect(alice.claims).toMatchObject({
      role: 'authenticated',
      workspace_id: WORKSPACE_A_ID,
    });
  });

  afterAll(async () => {
    await database.close();
  });

  const expectWriteDenied = async (statement: string, values: unknown[] = []) => {
    await expect(
      database.withAuthenticatedTransaction(alice.claims, async (client) =>
        client.query(statement, values),
      ),
    ).rejects.toMatchObject({ code: '42501' });
  };

  it('Test 7: denies INSERT, UPDATE, and DELETE on Cases to the authenticated role', async () => {
    await expectWriteDenied(
      `insert into public.cases (workspace_id, reference, title, priority, status, creator_id)
       values ($1, 999999, 'Direct Case write', 'urgent', 'open', $2)`,
      [WORKSPACE_A_ID, alice.claims.sub],
    );
    await expectWriteDenied(
      "update public.cases set status = 'resolved' where workspace_id = $1",
      [WORKSPACE_A_ID],
    );
    await expectWriteDenied('delete from public.cases where workspace_id = $1', [
      WORKSPACE_A_ID,
    ]);
  });

  it('Test 7: denies INSERT, UPDATE, and DELETE on Case Events to the authenticated role', async () => {
    await expectWriteDenied(
      `insert into public.case_events (case_id, workspace_id, event_type, actor_id)
       values ($1, $2, 'claimed', $3)`,
      [WORKSPACE_B_CASE_ID, WORKSPACE_A_ID, alice.claims.sub],
    );
    await expectWriteDenied(
      "update public.case_events set event_type = 'resolved' where workspace_id = $1",
      [WORKSPACE_A_ID],
    );
    await expectWriteDenied('delete from public.case_events where workspace_id = $1', [
      WORKSPACE_A_ID,
    ]);
  });

  it('Test 8: hides a Workspace B Case and its Case Events from Workspace A', async () => {
    await database.withAuthenticatedTransaction(alice.claims, async (client) => {
      const caseResult = await client.query(
        'select id from public.cases where id = $1',
        [WORKSPACE_B_CASE_ID],
      );
      const eventResult = await client.query(
        'select id from public.case_events where case_id = $1',
        [WORKSPACE_B_CASE_ID],
      );
      expect(caseResult.rows).toHaveLength(0);
      expect(eventResult.rows).toHaveLength(0);
    });
  });

  it('Test 8: permits Workspace A to read its own Cases through RLS', async () => {
    await database.withAuthenticatedTransaction(alice.claims, async (client) => {
      const result = await client.query(
        'select id from public.cases where workspace_id = $1 limit 1',
        [WORKSPACE_A_ID],
      );
      expect(result.rows).toHaveLength(1);
    });
  });
});
