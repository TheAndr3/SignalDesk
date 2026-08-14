import {
  Injectable,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ErrorCode } from '@signaldesk/shared';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err) {
      throw err;
    }

    if (!user) {
      throw new HttpException(
        {
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message:
              info?.message ||
              'Unauthorized: A valid Bearer token is required to access this resource',
            statusCode: HttpStatus.UNAUTHORIZED,
          },
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    return user;
  }
}
