import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CaseDto } from '@signaldesk/shared';
import { CasesService } from './cases.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCase(
    @CurrentUser() user: AuthUser,
    @Body() createDto: CreateCaseDto,
  ): Promise<CaseDto> {
    return this.casesService.createCase(
      user.workspaceId,
      user.userId,
      createDto,
    );
  }
}
