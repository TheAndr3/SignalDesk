import { useState, FC, FormEvent } from 'react';
import {
  CaseEventType,
  CaseDto,
  CaseStatus,
  WorkspaceMemberRole,
} from '@signaldesk/shared';
import {
  X,
  Clock,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Check,
  Lock,
} from 'lucide-react';
import { useCaseDetail } from '../hooks/useCaseDetail';
import { useMe } from '../hooks/useMe';
import { apiFetch } from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

interface CaseDetailPanelProps {
  caseId: string | null;
  onClose: () => void;
}

export const CaseDetailPanel: FC<CaseDetailPanelProps> = ({
  caseId,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const { showSuccess } = useToast();
  const { session } = useAuth();
  const { data: me } = useMe();
  const { data: caseItem, isLoading, isError, error } = useCaseDetail(caseId);

  const [isClaiming, setIsClaiming] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!caseId) return null;

  const handleClaim = async () => {
    setIsClaiming(true);
    setActionError(null);

    try {
      const claimedCase = await apiFetch<CaseDto>(`/cases/${caseId}/claim`, {
        method: 'POST',
      });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({
        queryKey: ['case', session?.user.id, caseId],
      });
      showSuccess(`${claimedCase.formattedReference} claimed successfully.`);
    } catch (err: any) {
      if (err?.error?.code === 'CLAIM_CONFLICT') {
        setActionError('This case was already claimed by another user.');
      } else {
        setActionError(
          err?.error?.message || 'Failed to claim case. Please try again.',
        );
      }
    } finally {
      setIsClaiming(false);
    }
  };

  const handleResolveSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!resolutionNote.trim()) {
      setNoteError('Resolution note is required and cannot be empty.');
      return;
    }

    setIsResolving(true);
    setActionError(null);
    setNoteError(null);

    try {
      await apiFetch(`/cases/${caseId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ resolutionNote: resolutionNote.trim() }),
      });
      setShowResolveForm(false);
      setResolutionNote('');
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({
        queryKey: ['case', session?.user.id, caseId],
      });
    } catch (err: any) {
      setActionError(
        err?.error?.message || 'Failed to resolve case. Please check permissions.',
      );
    } finally {
      setIsResolving(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const isManager = me?.role === WorkspaceMemberRole.MANAGER;
  const isAssignee = me && caseItem && me.userId === caseItem.assigneeId;
  const canResolve = isManager || isAssignee;

  return (
    <div className="slideover-backdrop" onClick={onClose}>
      <div
        className="slideover-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Panel Header */}
        <div className="panel-header">
          <div className="panel-header-title">
            <span className="reference-pill">
              {caseItem?.formattedReference || 'Loading...'}
            </span>
            {caseItem && (
              <>
                <span
                  className={`priority-badge priority-badge-${caseItem.priority}`}
                >
                  {caseItem.priority.toUpperCase()}
                </span>
                <span
                  className={`status-badge status-badge-${caseItem.status}`}
                >
                  {caseItem.status.toUpperCase()}
                </span>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="panel-close-button"
            aria-label="Close panel"
          >
            <X size={20} />
          </button>
        </div>

        {/* Panel Content */}
        <div className="panel-body">
          {isLoading && (
            <div className="panel-loading">
              <div className="skeleton-row" />
              <div className="skeleton-row" />
              <div className="skeleton-row" />
            </div>
          )}

          {isError && (
            <div className="error-banner">
              <AlertCircle size={16} />
              <span>
                {(error as any)?.error?.message || 'Failed to load case details'}
              </span>
            </div>
          )}

          {actionError && (
            <div className="action-error-banner">
              <AlertCircle size={16} />
              <span>{actionError}</span>
            </div>
          )}

          {caseItem && (
            <>
              {/* Main Info */}
              <div className="case-main-section">
                <h2 className="case-detail-title">{caseItem.title}</h2>
                {caseItem.description ? (
                  <p className="case-detail-description">
                    {caseItem.description}
                  </p>
                ) : (
                  <p className="case-detail-no-desc">
                    No description provided.
                  </p>
                )}
              </div>

              {/* Resolution Note Callout if Resolved */}
              {caseItem.status === CaseStatus.RESOLVED &&
                caseItem.resolutionNote && (
                  <div className="resolution-note-callout">
                    <div className="callout-header">
                      <CheckCircle2 size={16} className="callout-icon" />
                      <span>Resolution Note</span>
                    </div>
                    <p className="callout-content">{caseItem.resolutionNote}</p>
                  </div>
                )}

              {/* Metadata Grid */}
              <div className="metadata-grid">
                <div className="metadata-item">
                  <span className="metadata-label">Created By</span>
                  <span className="metadata-value">
                    <User size={13} />
                    {caseItem.creatorDisplayName || 'User'}
                  </span>
                </div>
                <div className="metadata-item">
                  <span className="metadata-label">Assignee</span>
                  <span className="metadata-value">
                    <User size={13} />
                    {caseItem.assigneeDisplayName || 'Unassigned'}
                  </span>
                </div>
                <div className="metadata-item">
                  <span className="metadata-label">Created Date</span>
                  <span className="metadata-value">
                    <Clock size={13} />
                    {formatDateTime(caseItem.createdAt)}
                  </span>
                </div>
                <div className="metadata-item">
                  <span className="metadata-label">Last Updated</span>
                  <span className="metadata-value">
                    <Clock size={13} />
                    {formatDateTime(caseItem.updatedAt)}
                  </span>
                </div>
              </div>

              {/* Actions Section */}
              <div className="case-actions-section">
                {caseItem.status === CaseStatus.OPEN && (
                  <button
                    onClick={handleClaim}
                    disabled={isClaiming}
                    className="action-button action-claim-button"
                  >
                    <ShieldCheck size={16} />
                    <span>{isClaiming ? 'Claiming...' : 'Claim Case'}</span>
                  </button>
                )}

                {caseItem.status === CaseStatus.ASSIGNED && (
                  <>
                    {canResolve ? (
                      !showResolveForm ? (
                        <button
                          onClick={() => setShowResolveForm(true)}
                          className="action-button action-resolve-button"
                        >
                          <CheckCircle2 size={16} />
                          <span>Resolve Case</span>
                        </button>
                      ) : (
                        <form
                          onSubmit={handleResolveSubmit}
                          className="resolve-form"
                        >
                          <label
                            className="form-label"
                            htmlFor="resolution-note"
                          >
                            Resolution Note *
                          </label>
                          <textarea
                            id="resolution-note"
                            required
                            rows={3}
                            value={resolutionNote}
                            onChange={(e) => {
                              setResolutionNote(e.target.value);
                              if (noteError) setNoteError(null);
                            }}
                            className="form-textarea"
                            placeholder="Explain the root cause and steps taken to resolve..."
                          />
                          {noteError && (
                            <span className="form-error">{noteError}</span>
                          )}

                          <div className="resolve-form-actions">
                            <button
                              type="button"
                              onClick={() => {
                                setShowResolveForm(false);
                                setResolutionNote('');
                                setNoteError(null);
                              }}
                              className="button-secondary"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isResolving}
                              className="action-button action-resolve-button"
                            >
                              {isResolving ? 'Resolving...' : 'Confirm Resolution'}
                            </button>
                          </div>
                        </form>
                      )
                    ) : (
                      <div className="permission-notice">
                        <Lock size={14} />
                        <span>
                          Assigned to {caseItem.assigneeDisplayName}. Only the
                          assignee or a manager can resolve this case.
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Timeline Section */}
              <div className="case-timeline-section">
                <h3 className="timeline-heading">Event Timeline</h3>
                <div className="timeline-list">
                  {caseItem.events && caseItem.events.length > 0 ? (
                    caseItem.events.map((evt, idx) => (
                      <div key={evt.id || idx} className="timeline-item">
                        <div className="timeline-dot-wrapper">
                          <div
                            className={`timeline-dot timeline-dot-${evt.eventType}`}
                          >
                            {evt.eventType === CaseEventType.CREATED && (
                              <PlusCircle size={12} />
                            )}
                            {evt.eventType === CaseEventType.CLAIMED && (
                              <ShieldCheck size={12} />
                            )}
                            {evt.eventType === CaseEventType.RESOLVED && (
                              <Check size={12} />
                            )}
                          </div>
                          {idx !== caseItem.events!.length - 1 && (
                            <div className="timeline-line" />
                          )}
                        </div>

                        <div className="timeline-content">
                          <div className="timeline-header">
                            <span className="timeline-actor">
                              {evt.actorDisplayName || 'User'}
                            </span>
                            <span className="timeline-event-type">
                              {evt.eventType.toUpperCase()}
                            </span>
                            <span className="timeline-time">
                              {formatDateTime(evt.createdAt)}
                            </span>
                          </div>

                          {evt.eventType === CaseEventType.RESOLVED &&
                            (evt.payload as any)?.resolution_note && (
                              <p className="timeline-note">
                                &ldquo;{(evt.payload as any).resolution_note}&rdquo;
                              </p>
                            )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="timeline-empty">No events recorded.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
