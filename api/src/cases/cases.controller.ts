import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CaseDto, PaginatedCasesDto } from '@signaldesk/shared';
import { CasesService } from './cases.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { ListCasesQueryDto } from './dto/list-cases-query.dto';
import { ResolveCaseDto } from './dto/resolve-case.dto';
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

  @Get()
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: ListCasesQueryDto,
  ): Promise<PaginatedCasesDto> {
    return this.casesService.findAll(user.workspaceId, user.userId, query);
  }

  @Get(':id')
  async findById(
    @CurrentUser() user: AuthUser,
    @Param('id') caseId: string,
  ): Promise<CaseDto> {
    return this.casesService.findById(user.workspaceId, caseId);
  }

  @Post(':id/claim')
  @HttpCode(HttpStatus.OK)
  async claimCase(
    @CurrentUser() user: AuthUser,
    @Param('id') caseId: string,
  ): Promise<CaseDto> {
    return this.casesService.claimCase(user.workspaceId, caseId, user.userId);
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  async resolveCase(
    @CurrentUser() user: AuthUser,
    @Param('id') caseId: string,
    @Body() resolveDto: ResolveCaseDto,
  ): Promise<CaseDto> {
    return this.casesService.resolveCase(
      user.workspaceId,
      caseId,
      user.userId,
      user.role,
      resolveDto,
    );
  }
}
