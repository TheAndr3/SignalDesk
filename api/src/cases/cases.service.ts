import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CaseDto, ErrorCode, PaginatedCasesDto } from '@signaldesk/shared';
import { CasesRepository } from './cases.repository';
import { CreateCaseDto } from './dto/create-case.dto';
import { ListCasesQueryDto } from './dto/list-cases-query.dto';

@Injectable()
export class CasesService {
  constructor(
    private readonly casesRepository: CasesRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createCase(
    workspaceId: string,
    creatorId: string,
    dto: CreateCaseDto,
  ): Promise<CaseDto> {
    const createdCase = await this.casesRepository.createCase(
      workspaceId,
      creatorId,
      dto,
    );

    // Emit event after transaction commit for SSE consumers
    this.eventEmitter.emit('case_created', {
      type: 'case_created',
      caseId: createdCase.id,
      workspaceId,
    });

    return createdCase;
  }

  async findAll(
    workspaceId: string,
    currentUserId: string,
    query: ListCasesQueryDto,
  ): Promise<PaginatedCasesDto> {
    return this.casesRepository.findAll(workspaceId, currentUserId, query);
  }

  async findById(workspaceId: string, caseId: string): Promise<CaseDto> {
    const foundCase = await this.casesRepository.findById(workspaceId, caseId);

    if (!foundCase) {
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

    return foundCase;
  }

  async claimCase(
    workspaceId: string,
    caseId: string,
    claimantId: string,
  ): Promise<CaseDto> {
    const claimedCase = await this.casesRepository.claimCase(
      workspaceId,
      caseId,
      claimantId,
    );

    // Emit event after transaction commit for SSE consumers
    this.eventEmitter.emit('case_claimed', {
      type: 'case_claimed',
      caseId: claimedCase.id,
      workspaceId,
    });

    return claimedCase;
  }
}
