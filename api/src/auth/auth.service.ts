import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { Kysely } from 'kysely';
import { ErrorCode, UserMeDto } from '@signaldesk/shared';
import { DATABASE_CONNECTION } from '../database/database.module';
import { Database } from '../database/types';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: Kysely<Database>,
  ) {}

  async getMe(userId: string, workspaceId: string): Promise<UserMeDto> {
    const member = await this.db
      .selectFrom('workspace_members')
      .innerJoin('workspaces', 'workspaces.id', 'workspace_members.workspace_id')
      .select([
        'workspace_members.user_id as user_id',
        'workspace_members.display_name as display_name',
        'workspace_members.role as role',
        'workspaces.id as workspace_id',
        'workspaces.name as workspace_name',
      ])
      .where('workspace_members.user_id', '=', userId)
      .where('workspace_members.workspace_id', '=', workspaceId)
      .executeTakeFirst();

    if (!member) {
      throw new HttpException(
        {
          error: {
            code: ErrorCode.NO_WORKSPACE,
            message: 'User profile not found in workspace',
            statusCode: HttpStatus.FORBIDDEN,
          },
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return {
      userId: member.user_id,
      displayName: member.display_name,
      role: member.role,
      workspace: {
        id: member.workspace_id,
        name: member.workspace_name,
      },
    };
  }
}
