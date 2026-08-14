import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { Kysely } from 'kysely';
import {
  CaseDto,
  CaseEventType,
  CaseStatus,
  ErrorCode,
} from '@signaldesk/shared';
import { DATABASE_CONNECTION } from '../database/database.module';
import { Database } from '../database/types';
import { CreateCaseDto } from './dto/create-case.dto';
import { formatCaseReference } from './utils/case-reference.util';

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
}
