import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CaseDto } from '@signaldesk/shared';
import { CasesRepository } from './cases.repository';
import { CreateCaseDto } from './dto/create-case.dto';

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
}
