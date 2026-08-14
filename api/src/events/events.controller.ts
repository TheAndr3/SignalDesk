import { Controller, Sse, MessageEvent } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, fromEvent, merge } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { SSEEventMessage } from '@signaldesk/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

interface DomainMutationEvent {
  type: 'case_created' | 'case_claimed' | 'case_resolved';
  caseId: string;
  workspaceId: string;
}

@Controller('events')
export class EventsController {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  @Sse('stream')
  streamEvents(@CurrentUser() user: AuthUser): Observable<MessageEvent> {
    const created$ = fromEvent<DomainMutationEvent>(
      this.eventEmitter,
      'case_created',
    );
    const claimed$ = fromEvent<DomainMutationEvent>(
      this.eventEmitter,
      'case_claimed',
    );
    const resolved$ = fromEvent<DomainMutationEvent>(
      this.eventEmitter,
      'case_resolved',
    );

    return merge(created$, claimed$, resolved$).pipe(
      // Multi-tenant isolation: strictly filter events by workspaceId matching caller's JWT workspace
      filter((event) => event.workspaceId === user.workspaceId),
      map(
        (event): MessageEvent => ({
          data: {
            type: event.type,
            caseId: event.caseId,
          } as SSEEventMessage,
        }),
      ),
    );
  }
}
