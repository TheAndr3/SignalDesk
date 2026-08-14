import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkspaceMemberRole } from '@signaldesk/shared';
import { EventsController } from './events.controller';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

describe('EventsController (SSE)', () => {
  let controller: EventsController;
  let eventEmitter: EventEmitter2;

  const mockUserWorkspaceA: AuthUser = {
    userId: 'user-uuid-1',
    workspaceId: 'workspace-a-uuid',
    role: WorkspaceMemberRole.AGENT,
    displayName: 'Alice',
  };

  beforeEach(() => {
    eventEmitter = new EventEmitter2();
    controller = new EventsController(eventEmitter);
  });

  it('should forward events matching the user workspace and ignore events from other workspaces', (done) => {
    const receivedEvents: any[] = [];

    const stream$ = controller.streamEvents(mockUserWorkspaceA);

    const subscription = stream$.subscribe({
      next: (event) => {
        receivedEvents.push(event);
      },
    });

    // Emit event in Workspace A (should be received)
    eventEmitter.emit('case_created', {
      type: 'case_created',
      caseId: 'case-1',
      workspaceId: 'workspace-a-uuid',
    });

    // Emit event in Workspace B (should be ignored)
    eventEmitter.emit('case_created', {
      type: 'case_created',
      caseId: 'case-2',
      workspaceId: 'workspace-b-uuid',
    });

    // Emit case_claimed in Workspace A (should be received)
    eventEmitter.emit('case_claimed', {
      type: 'case_claimed',
      caseId: 'case-1',
      workspaceId: 'workspace-a-uuid',
    });

    // Emit case_resolved in Workspace A (should be received)
    eventEmitter.emit('case_resolved', {
      type: 'case_resolved',
      caseId: 'case-1',
      workspaceId: 'workspace-a-uuid',
    });

    setTimeout(() => {
      expect(receivedEvents.length).toBe(3);
      expect(receivedEvents[0]).toEqual({
        data: {
          type: 'case_created',
          caseId: 'case-1',
        },
      });
      expect(receivedEvents[1]).toEqual({
        data: {
          type: 'case_claimed',
          caseId: 'case-1',
        },
      });
      expect(receivedEvents[2]).toEqual({
        data: {
          type: 'case_resolved',
          caseId: 'case-1',
        },
      });

      subscription.unsubscribe();
      done();
    }, 50);
  });

  it('should clean up event listeners when the subscriber unsubscribes', () => {
    const stream$ = controller.streamEvents(mockUserWorkspaceA);
    const subscription = stream$.subscribe();

    expect(eventEmitter.listenerCount('case_created')).toBeGreaterThan(0);
    expect(eventEmitter.listenerCount('case_claimed')).toBeGreaterThan(0);
    expect(eventEmitter.listenerCount('case_resolved')).toBeGreaterThan(0);

    subscription.unsubscribe();

    expect(eventEmitter.listenerCount('case_created')).toBe(0);
    expect(eventEmitter.listenerCount('case_claimed')).toBe(0);
    expect(eventEmitter.listenerCount('case_resolved')).toBe(0);
  });
});
