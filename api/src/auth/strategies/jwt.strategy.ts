import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ErrorCode, WorkspaceMemberRole } from '@signaldesk/shared';
import { SupabaseJwtPayload } from '../interfaces/jwt-payload.interface';
import { AuthUser } from '../interfaces/auth-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'SUPABASE_JWT_SECRET',
        'super-secret-jwt-token-with-at-least-32-characters-long',
      ),
    });
  }

  async validate(payload: SupabaseJwtPayload): Promise<AuthUser> {
    if (!payload.sub) {
      throw new HttpException(
        {
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Invalid token: missing subject claim',
            statusCode: HttpStatus.UNAUTHORIZED,
          },
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!payload.workspace_id) {
      throw new HttpException(
        {
          error: {
            code: ErrorCode.NO_WORKSPACE,
            message: 'Authenticated user does not belong to any workspace',
            statusCode: HttpStatus.FORBIDDEN,
          },
        },
        HttpStatus.FORBIDDEN,
      );
    }

    const rawRole = (payload.role as string)?.toLowerCase();
    const role =
      rawRole === WorkspaceMemberRole.MANAGER
        ? WorkspaceMemberRole.MANAGER
        : WorkspaceMemberRole.AGENT;

    return {
      userId: payload.sub,
      workspaceId: payload.workspace_id,
      role,
      email: payload.email,
      displayName: payload.display_name || payload.email || 'User',
    };
  }
}
