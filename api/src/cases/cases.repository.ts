import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import {
  CaseDto,
  CaseEventDto,
  CaseEventType,
  CasePriority,
  CaseStatus,
  ErrorCode,
  PaginatedCasesDto,
} from '@signaldesk/shared';
import { DATABASE_CONNECTION } from '../database/database.module';
import { Database } from '../database/types';
import { CreateCaseDto } from './dto/create-case.dto';
import { ListCasesQueryDto } from './dto/list-cases-query.dto';
import { formatCaseReference } from './utils/case-reference.util';
import { decodeCursor, encodeCursor } from './utils/cursor.util';

@Injectable()
export class CasesRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Kysely<Database>,
  ) {}

  /**
   * Creates a new case within the specified workspace.
   * Atomically increments the workspace's case_counter within a transaction to guarantee
   * unique, gapless, sequential references (e.g. CASE-0001, CASE-0002) without collisions.
   */
  async createCase(
    workspaceId: string,
    creatorId: string,
    data: CreateCaseDto,
  ): Promise<CaseDto> {
    return this.db.transaction().execute(async (trx) => {
      // 1. Atomically increment workspace case_counter with row lock
      const updatedWorkspace = await trx
        .updateTable('workspaces')
        .set((eb) => ({
          case_counter: eb('case_counter', '+', 1),
          updated_at: new Date().toISOString(),
        }))
        .where('id', '=', workspaceId)
        .returning(['case_counter'])
        .executeTakeFirst();

      if (!updatedWorkspace) {
        throw new HttpException(
          {
            error: {
              code: ErrorCode.FORBIDDEN,
              message: 'Target workspace does not exist',
              statusCode: HttpStatus.FORBIDDEN,
            },
          },
          HttpStatus.FORBIDDEN,
        );
      }

      const nextReference = Number(updatedWorkspace.case_counter);

      // 2. Insert case record
      const newCase = await trx
        .insertInto('cases')
        .values({
          workspace_id: workspaceId,
          reference: nextReference,
          title: data.title.trim(),
          description: data.description ? data.description.trim() : null,
          priority: data.priority,
          status: CaseStatus.OPEN,
          creator_id: creatorId,
          assignee_id: null,
          resolution_note: null,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      // 3. Insert created case_event
      await trx
        .insertInto('case_events')
        .values({
          case_id: newCase.id,
          workspace_id: workspaceId,
          event_type: CaseEventType.CREATED,
          actor_id: creatorId,
          payload: {
            title: newCase.title,
            priority: newCase.priority,
            reference: newCase.reference,
          },
        })
        .execute();

      // 4. Fetch creator display name
      const creator = await trx
        .selectFrom('workspace_members')
        .select(['display_name'])
        .where('user_id', '=', creatorId)
        .where('workspace_id', '=', workspaceId)
        .executeTakeFirst();

      return {
        id: newCase.id,
        reference: newCase.reference,
        formattedReference: formatCaseReference(newCase.reference),
        title: newCase.title,
        description: newCase.description,
        priority: newCase.priority,
        status: newCase.status as CaseStatus,
        workspaceId: newCase.workspace_id,
        creatorId: newCase.creator_id,
        creatorDisplayName: creator?.display_name || 'User',
        assigneeId: newCase.assignee_id,
        assigneeDisplayName: null,
        resolutionNote: newCase.resolution_note,
        createdAt: newCase.created_at,
        updatedAt: newCase.updated_at,
      };
    });
  }

  /**
   * Claims an unassigned case atomically.
   * Atomic conditional UPDATE: WHERE id = $id AND workspace_id = $workspaceId AND status = 'open' AND assignee_id IS NULL.
   * If another user won the race or the case is not open, returns 409 Conflict with CLAIM_CONFLICT code.
   */
  async claimCase(
    workspaceId: string,
    caseId: string,
    claimantId: string,
  ): Promise<CaseDto> {
    return this.db.transaction().execute(async (trx) => {
      // 1. Atomic conditional UPDATE
      const updatedCase = await trx
        .updateTable('cases')
        .set({
          assignee_id: claimantId,
          status: CaseStatus.ASSIGNED,
          updated_at: new Date().toISOString(),
        })
        .where('id', '=', caseId)
        .where('workspace_id', '=', workspaceId)
        .where('status', '=', CaseStatus.OPEN)
        .where('assignee_id', 'is', null)
        .returningAll()
        .executeTakeFirst();

      if (!updatedCase) {
        // Disambiguate failure reason
        const existingCase = await trx
          .selectFrom('cases')
          .select(['id', 'status', 'assignee_id'])
          .where('id', '=', caseId)
          .where('workspace_id', '=', workspaceId)
          .executeTakeFirst();

        if (!existingCase) {
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

        throw new HttpException(
          {
            error: {
              code: ErrorCode.CLAIM_CONFLICT,
              message:
                existingCase.status === CaseStatus.RESOLVED
                  ? 'Case is already resolved and cannot be claimed'
                  : 'Case is already assigned to another user',
              statusCode: HttpStatus.CONFLICT,
            },
          },
          HttpStatus.CONFLICT,
        );
      }

      // 2. Insert claimed event in the same transaction
      await trx
        .insertInto('case_events')
        .values({
          case_id: updatedCase.id,
          workspace_id: workspaceId,
          event_type: CaseEventType.CLAIMED,
          actor_id: claimantId,
          payload: {
            assignee_id: claimantId,
          },
        })
        .execute();

      // 3. Fetch display names
      const [creator, assignee] = await Promise.all([
        trx
          .selectFrom('workspace_members')
          .select(['display_name'])
          .where('user_id', '=', updatedCase.creator_id)
          .where('workspace_id', '=', workspaceId)
          .executeTakeFirst(),
        trx
          .selectFrom('workspace_members')
          .select(['display_name'])
          .where('user_id', '=', claimantId)
          .where('workspace_id', '=', workspaceId)
          .executeTakeFirst(),
      ]);

      return {
        id: updatedCase.id,
        reference: updatedCase.reference,
        formattedReference: formatCaseReference(updatedCase.reference),
        title: updatedCase.title,
        description: updatedCase.description,
        priority: updatedCase.priority as CasePriority,
        status: updatedCase.status as CaseStatus,
        workspaceId: updatedCase.workspace_id,
        creatorId: updatedCase.creator_id,
        creatorDisplayName: creator?.display_name || undefined,
        assigneeId: updatedCase.assignee_id,
        assigneeDisplayName: assignee?.display_name || 'User',
        resolutionNote: updatedCase.resolution_note,
        createdAt: updatedCase.created_at,
        updatedAt: updatedCase.updated_at,
      };
    });
  }

  /**
   * Retrieves a paginated list of cases scoped to the user's workspace.
   * Implements keyset cursor pagination with sort: priority DESC, created_at ASC, id ASC.
   */
  async findAll(
    workspaceId: string,
    currentUserId: string,
    query: ListCasesQueryDto,
  ): Promise<PaginatedCasesDto> {
    const limit = query.limit || 20;

    let dbQuery = this.db
      .selectFrom('cases')
      .leftJoin('workspace_members as creator', (join) =>
        join
          .onRef('creator.user_id', '=', 'cases.creator_id')
          .onRef('creator.workspace_id', '=', 'cases.workspace_id'),
      )
      .leftJoin('workspace_members as assignee', (join) =>
        join
          .onRef('assignee.user_id', '=', 'cases.assignee_id')
          .onRef('assignee.workspace_id', '=', 'cases.workspace_id'),
      )
      .select([
        'cases.id',
        'cases.reference',
        'cases.title',
        'cases.description',
        'cases.priority',
        'cases.status',
        'cases.workspace_id',
        'cases.creator_id',
        'creator.display_name as creator_display_name',
        'cases.assignee_id',
        'assignee.display_name as assignee_display_name',
        'cases.resolution_note',
        'cases.created_at',
        'cases.updated_at',
      ])
      .where('cases.workspace_id', '=', workspaceId);

    // Apply orthogonal filters
    if (query.status) {
      dbQuery = dbQuery.where('cases.status', '=', query.status);
    }

    if (query.priority) {
      dbQuery = dbQuery.where('cases.priority', '=', query.priority);
    }

    if (query.mine) {
      dbQuery = dbQuery.where('cases.assignee_id', '=', currentUserId);
    }

    // Apply Keyset Cursor Pagination
    if (query.cursor) {
      const decoded = decodeCursor(query.cursor);
      if (decoded) {
        dbQuery = dbQuery.where((eb) =>
          eb.or([
            sql<boolean>`cases.priority < ${decoded.priority}::case_priority`,
            eb.and([
              eb('cases.priority', '=', decoded.priority),
              sql<boolean>`cases.created_at > ${decoded.createdAt}::timestamptz`,
            ]),
            eb.and([
              eb('cases.priority', '=', decoded.priority),
              eb('cases.created_at', '=', decoded.createdAt),
              eb('cases.id', '>', decoded.id),
            ]),
          ]),
        );
      }
    }

    // Order by priority DESC, created_at ASC, id ASC
    dbQuery = dbQuery
      .orderBy('cases.priority', 'desc')
      .orderBy('cases.created_at', 'asc')
      .orderBy('cases.id', 'asc')
      .limit(limit + 1);

    const rows = await dbQuery.execute();

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    const data: CaseDto[] = items.map((row) => ({
      id: row.id,
      reference: row.reference,
      formattedReference: formatCaseReference(row.reference),
      title: row.title,
      description: row.description,
      priority: row.priority as CasePriority,
      status: row.status as CaseStatus,
      workspaceId: row.workspace_id,
      creatorId: row.creator_id,
      creatorDisplayName: row.creator_display_name || undefined,
      assigneeId: row.assignee_id,
      assigneeDisplayName: row.assignee_display_name || undefined,
      resolutionNote: row.resolution_note,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1];
      nextCursor = encodeCursor(
        lastItem.priority as CasePriority,
        lastItem.created_at,
        lastItem.id,
      );
    }

    return {
      data,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Retrieves a single case by ID with its chronological event timeline.
   * Returns null if the case does not exist or belongs to another workspace.
   */
  async findById(workspaceId: string, caseId: string): Promise<CaseDto | null> {
    const caseRow = await this.db
      .selectFrom('cases')
      .leftJoin('workspace_members as creator', (join) =>
        join
          .onRef('creator.user_id', '=', 'cases.creator_id')
          .onRef('creator.workspace_id', '=', 'cases.workspace_id'),
      )
      .leftJoin('workspace_members as assignee', (join) =>
        join
          .onRef('assignee.user_id', '=', 'cases.assignee_id')
          .onRef('assignee.workspace_id', '=', 'cases.workspace_id'),
      )
      .select([
        'cases.id',
        'cases.reference',
        'cases.title',
        'cases.description',
        'cases.priority',
        'cases.status',
        'cases.workspace_id',
        'cases.creator_id',
        'creator.display_name as creator_display_name',
        'cases.assignee_id',
        'assignee.display_name as assignee_display_name',
        'cases.resolution_note',
        'cases.created_at',
        'cases.updated_at',
      ])
      .where('cases.id', '=', caseId)
      .where('cases.workspace_id', '=', workspaceId)
      .executeTakeFirst();

    if (!caseRow) {
      return null;
    }

    // Fetch chronological event timeline
    const eventRows = await this.db
      .selectFrom('case_events')
      .leftJoin('workspace_members as actor', (join) =>
        join
          .onRef('actor.user_id', '=', 'case_events.actor_id')
          .onRef('actor.workspace_id', '=', 'case_events.workspace_id'),
      )
      .select([
        'case_events.id',
        'case_events.case_id',
        'case_events.workspace_id',
        'case_events.event_type',
        'case_events.actor_id',
        'actor.display_name as actor_display_name',
        'case_events.payload',
        'case_events.created_at',
      ])
      .where('case_events.case_id', '=', caseId)
      .where('case_events.workspace_id', '=', workspaceId)
      .orderBy('case_events.created_at', 'asc')
      .execute();

    const events: CaseEventDto[] = eventRows.map((e) => ({
      id: e.id,
      caseId: e.case_id,
      workspaceId: e.workspace_id,
      eventType: e.event_type as CaseEventType,
      actorId: e.actor_id,
      actorDisplayName: e.actor_display_name || undefined,
      payload: e.payload,
      createdAt: e.created_at,
    }));

    return {
      id: caseRow.id,
      reference: caseRow.reference,
      formattedReference: formatCaseReference(caseRow.reference),
      title: caseRow.title,
      description: caseRow.description,
      priority: caseRow.priority as CasePriority,
      status: caseRow.status as CaseStatus,
      workspaceId: caseRow.workspace_id,
      creatorId: caseRow.creator_id,
      creatorDisplayName: caseRow.creator_display_name || undefined,
      assigneeId: caseRow.assignee_id,
      assigneeDisplayName: caseRow.assignee_display_name || undefined,
      resolutionNote: caseRow.resolution_note,
      createdAt: caseRow.created_at,
      updatedAt: caseRow.updated_at,
      events,
    };
  }
}
