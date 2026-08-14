import { Controller, Get } from '@nestjs/common';
import { UserMeDto } from '@signaldesk/shared';
import { AuthService } from './auth.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from './interfaces/auth-user.interface';

@Controller('me')
export class MeController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  async getMe(@CurrentUser() user: AuthUser): Promise<UserMeDto> {
    return this.authService.getMe(user.userId, user.workspaceId);
  }
}
