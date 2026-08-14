import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import { Pool } from 'pg';

export const INTEGRATION_WORKSPACE_ID =
  'c0000000-0000-0000-0000-000000000003';
export const WORKSPACE_A_ID = 'a0000000-0000-0000-0000-000000000001';
export const WORKSPACE_B_CASE_ID =
  'b0000000-0000-0000-0000-000000000099';

export const INTEGRATION_ACCOUNTS = {
  agentOne: 'integration-agent-one@signaldesk.test',
  agentTwo: 'integration-agent-two@signaldesk.test',
  manager: 'integration-manager@signaldesk.test',
  noWorkspace: 'orphan@signaldesk.test',
  alice: 'alice@acme.com',
} as const;

const SEEDED_PASSWORD = 'Password123!';

export interface IntegrationConfig {
  apiUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  databaseUrl: string;
}

export interface RealSession {
  accessToken: string;
  claims: Record<string, unknown>;
}

export interface HttpResult<T> {
  status: number;
  body: T;
}

function readEnvironmentFile(): Record<string, string> {
  const filePath = path.resolve(__dirname, '../../../../.env');
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce<Record<string, string>>((values, line) => {
      const match = line.match(/^\s*([^#=]+)=(.*)$/);
      if (match) {
        values[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '');
      }
      return values;
    }, {});
}

function configuredValue(
  environment: Record<string, string>,
  ...names: string[]
): string | undefined {
  return names
    .map((name) => process.env[name] || environment[name])
    .find(Boolean);
}

export function getIntegrationConfig(): IntegrationConfig {
  const environment = readEnvironmentFile();
  const supabaseAnonKey = configuredValue(
    environment,
    'SUPABASE_ANON_KEY',
    'VITE_SUPABASE_ANON_KEY',
  );

  if (!supabaseAnonKey) {
    throw new Error(
      'Missing SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY. Copy the local Supabase anon key into .env before running integration tests.',
    );
  }

  return {
    apiUrl:
      configuredValue(environment, 'API_URL', 'VITE_API_URL') ||
      'http://127.0.0.1:3000',
    supabaseUrl:
      configuredValue(environment, 'SUPABASE_URL', 'VITE_SUPABASE_URL') ||
      'http://127.0.0.1:54321',
    supabaseAnonKey,
    databaseUrl:
      configuredValue(environment, 'DATABASE_URL') ||
      'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  };
}

export function decodeJwtPayload(token: string): Record<string, unknown> {
  const payload = token.split('.')[1];
  if (!payload) {
    throw new Error('Supabase Auth returned an invalid access token');
  }

  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

export async function requestJson<T>(
  baseUrl: string,
  requestPath: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<HttpResult<T>> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(new URL(requestPath, baseUrl), {
    ...options,
    headers,
  });
  const text = await response.text();

  return {
    status: response.status,
    body: text ? (JSON.parse(text) as T) : (undefined as T),
  };
}

export async function authenticateSeededAccount(
  config: IntegrationConfig,
  email: string,
): Promise<RealSession> {
  const response = await requestJson<{ access_token?: string; msg?: string }>(
    config.supabaseUrl,
    '/auth/v1/token?grant_type=password',
    {
      method: 'POST',
      headers: { apikey: config.supabaseAnonKey },
      body: JSON.stringify({ email, password: SEEDED_PASSWORD }),
    },
  );

  if (response.status !== 200 || !response.body.access_token) {
    throw new Error(
      `Supabase Auth login failed for ${email}: HTTP ${response.status} ${response.body.msg || ''}`,
    );
  }

  return {
    accessToken: response.body.access_token,
    claims: decodeJwtPayload(response.body.access_token),
  };
}

export class IntegrationDatabase {
  private readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, connectionTimeoutMillis: 2_000 });
  }

  async assertAvailable(): Promise<void> {
    await this.pool.query('select 1');
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async workspaceCounter(workspaceId: string): Promise<number> {
    const result = await this.pool.query<{ case_counter: string }>(
      'select case_counter from public.workspaces where id = $1',
      [workspaceId],
    );
    if (!result.rows[0]) {
      throw new Error(`Integration Workspace ${workspaceId} is missing. Run supabase db reset.`);
    }
    return Number(result.rows[0].case_counter);
  }

  async deleteCases(caseIds: string[]): Promise<void> {
    if (caseIds.length === 0) {
      return;
    }
    await this.pool.query('delete from public.cases where id = any($1::uuid[])', [
      caseIds,
    ]);
  }

  async caseState(caseId: string): Promise<{
    status: string;
    assignee_id: string | null;
    resolution_note: string | null;
  }> {
    const result = await this.pool.query(
      'select status, assignee_id, resolution_note from public.cases where id = $1',
      [caseId],
    );
    if (!result.rows[0]) {
      throw new Error(`Case ${caseId} was not persisted`);
    }
    return result.rows[0];
  }

  async caseEvents(caseId: string): Promise<Array<{ event_type: string; actor_id: string }>> {
    const result = await this.pool.query(
      'select event_type, actor_id from public.case_events where case_id = $1 order by created_at',
      [caseId],
    );
    return result.rows;
  }

  async installResolvedEventFailureTrigger(
    caseTitle: string,
  ): Promise<ResolvedEventFailureTrigger> {
    const suffix = randomUUID().replace(/-/g, '');
    const functionName = `signaldesk_integration_fail_resolved_event_${suffix}`;
    const triggerName = `signaldesk_integration_fail_resolved_event_${suffix}`;
    await this.pool.query(`
      create function public.${functionName}()
      returns trigger
      language plpgsql
      as $$
      begin
        if new.event_type = 'resolved' and exists (
          select 1 from public.cases
          where id = new.case_id and title = ${quoteLiteral(caseTitle)}
        ) then
          raise exception 'SignalDesk integration test forces Case Event failure';
        end if;
        return new;
      end;
      $$;
    `);
    await this.pool.query(`
      create trigger ${triggerName}
      before insert on public.case_events
      for each row execute function public.${functionName}()
    `);
    return { functionName, triggerName };
  }

  async removeResolvedEventFailureTrigger(
    trigger: ResolvedEventFailureTrigger,
  ): Promise<void> {
    await this.pool.query(
      `drop trigger if exists ${trigger.triggerName} on public.case_events`,
    );
    await this.pool.query(
      `drop function if exists public.${trigger.functionName}()`,
    );
  }

  async withAuthenticatedTransaction<T>(
    claims: Record<string, unknown>,
    work: (client: import('pg').PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query('set local role authenticated');
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify(claims),
      ]);
      return await work(client);
    } finally {
      await client.query('rollback').catch(() => undefined);
      client.release();
    }
  }
}

export class FixtureTracker {
  private readonly caseIds: string[] = [];
  private failureTrigger?: ResolvedEventFailureTrigger;

  constructor(private readonly database: IntegrationDatabase) {}

  async prepareWorkspace(workspaceId: string): Promise<void> {
    await this.database.workspaceCounter(workspaceId);
  }

  trackCase(caseId: string): void {
    this.caseIds.push(caseId);
  }

  title(label: string): string {
    return `integration-${label}-${randomUUID()}`;
  }

  async installResolvedEventFailureTrigger(caseTitle: string): Promise<void> {
    this.failureTrigger = await this.database.installResolvedEventFailureTrigger(
      caseTitle,
    );
  }

  async cleanup(): Promise<void> {
    if (this.failureTrigger) {
      await this.database.removeResolvedEventFailureTrigger(this.failureTrigger);
    }
    await this.database.deleteCases(this.caseIds);
  }
}

interface ResolvedEventFailureTrigger {
  functionName: string;
  triggerName: string;
}

export interface SseConnection {
  nextEvent: Promise<{ type: string; caseId: string }>;
  close: () => void;
}

export async function openSseConnection(
  apiUrl: string,
  accessToken: string,
): Promise<SseConnection> {
  const streamUrl = new URL('/events/stream', apiUrl);
  streamUrl.searchParams.set('token', accessToken);

  return new Promise<SseConnection>((resolve, reject) => {
    let responseOpened = false;
    let rejectEvent: ((reason?: unknown) => void) | undefined;
    let eventSettled = false;
    let timeout: NodeJS.Timeout | undefined;
    const fail = (reason: Error) => {
      if (!responseOpened) {
        reject(reason);
      } else if (!eventSettled) {
        eventSettled = true;
        rejectEvent?.(reason);
      }
    };
    const request = http.get(streamUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`SSE connection failed with HTTP ${response.statusCode}`));
        request.destroy();
        return;
      }

      responseOpened = true;

      let buffer = '';
      let resolveEvent: (event: { type: string; caseId: string }) => void;
      const nextEvent = new Promise<{ type: string; caseId: string }>((eventResolve, eventReject) => {
        resolveEvent = (event) => {
          if (!eventSettled) {
            eventSettled = true;
            clearTimeout(timeout);
            eventResolve(event);
          }
        };
        rejectEvent = eventReject;
      });
      timeout = setTimeout(() => {
        const reason = new Error('Timed out waiting for an SSE event');
        fail(reason);
        request.destroy(reason);
      }, 5_000);

      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        buffer += chunk;
        const frames = buffer.split('\n\n');
        buffer = frames.pop() || '';
        for (const frame of frames) {
          const dataLine = frame.split('\n').find((line) => line.startsWith('data:'));
          if (dataLine) {
            resolveEvent(JSON.parse(dataLine.slice('data:'.length).trim()));
            request.destroy();
            return;
          }
        }
      });
      response.on('error', (error) => fail(error));
      response.on('end', () => fail(new Error('SSE stream ended before an event arrived')));

      resolve({
        nextEvent,
        close: () => {
          clearTimeout(timeout);
          fail(new Error('SSE connection closed before an event arrived'));
          request.destroy();
        },
      });
    });
    request.setTimeout(5_000, () => {
      const reason = new Error('Timed out opening the SSE connection');
      fail(reason);
      request.destroy(reason);
    });
    request.on('error', (error) => fail(error));
  });
}

function quoteLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}
