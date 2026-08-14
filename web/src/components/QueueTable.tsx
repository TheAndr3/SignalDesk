import { FC } from 'react';
import { CaseDto, CasePriority, CaseStatus } from '@signaldesk/shared';
import { Clock, User } from 'lucide-react';

interface QueueTableProps {
  cases: CaseDto[];
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onFetchNextPage: () => void;
  onSelectCase?: (caseItem: CaseDto) => void;
  selectedCaseId?: string | null;
}

export const QueueTable: FC<QueueTableProps> = ({
  cases,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onFetchNextPage,
  onSelectCase,
  selectedCaseId,
}) => {
  if (isLoading && cases.length === 0) {
    return (
      <div className="table-loading-container">
        <div className="skeleton-row" />
        <div className="skeleton-row" />
        <div className="skeleton-row" />
        <div className="skeleton-row" />
        <div className="skeleton-row" />
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="empty-state-container">
        <div className="empty-state-card">
          <p className="empty-state-title">No cases found</p>
          <p className="empty-state-description">
            There are no cases matching the selected filter criteria.
          </p>
        </div>
      </div>
    );
  }

  const formatTimestamp = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const getPriorityClass = (priority: CasePriority) => {
    switch (priority) {
      case CasePriority.URGENT:
        return 'priority-badge-urgent';
      case CasePriority.HIGH:
        return 'priority-badge-high';
      case CasePriority.MEDIUM:
        return 'priority-badge-medium';
      case CasePriority.LOW:
        return 'priority-badge-low';
      default:
        return '';
    }
  };

  const getStatusClass = (status: CaseStatus) => {
    switch (status) {
      case CaseStatus.OPEN:
        return 'status-badge-open';
      case CaseStatus.ASSIGNED:
        return 'status-badge-assigned';
      case CaseStatus.RESOLVED:
        return 'status-badge-resolved';
      default:
        return '';
    }
  };

  return (
    <div className="queue-table-wrapper">
      <div className="mobile-case-list" aria-label="Cases">
        {cases.map((c) => {
          const isSelected = selectedCaseId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              className={`mobile-case-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectCase?.(c)}
              aria-label={`Open ${c.formattedReference}: ${c.title}`}
            >
              <span className="mobile-case-card-topline">
                <span className="reference-pill">{c.formattedReference}</span>
                <span className={`status-badge ${getStatusClass(c.status)}`}>
                  {c.status.toUpperCase()}
                </span>
              </span>
              <span className="mobile-case-title">{c.title}</span>
              <span className="mobile-case-card-meta">
                <span className={`priority-badge ${getPriorityClass(c.priority)}`}>
                  {c.priority.toUpperCase()}
                </span>
                <span className="mobile-case-assignee">
                  <User size={13} aria-hidden="true" />
                  {c.assigneeDisplayName || 'Unassigned'}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <table className="queue-table">
        <thead>
          <tr>
            <th style={{ width: '120px' }}>Reference</th>
            <th>Title</th>
            <th style={{ width: '110px' }}>Priority</th>
            <th style={{ width: '120px' }}>Status</th>
            <th style={{ width: '160px' }}>Assignee</th>
            <th style={{ width: '150px' }}>Created</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => {
            const isSelected = selectedCaseId === c.id;
            return (
              <tr
                key={c.id}
                onClick={() => onSelectCase?.(c)}
                className={`table-row ${isSelected ? 'row-selected' : ''}`}
              >
                <td>
                  <span className="reference-pill">{c.formattedReference}</span>
                </td>
                <td>
                  <div className="case-title-cell">
                    <span className="case-title-text">{c.title}</span>
                    {c.description && (
                      <span className="case-desc-preview">{c.description}</span>
                    )}
                  </div>
                </td>
                <td>
                  <span
                    className={`priority-badge ${getPriorityClass(c.priority)}`}
                  >
                    {c.priority.toUpperCase()}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${getStatusClass(c.status)}`}>
                    {c.status.toUpperCase()}
                  </span>
                </td>
                <td>
                  <div className="assignee-cell">
                    <User size={13} className="assignee-icon" />
                    <span
                      className={
                        c.assigneeDisplayName
                          ? 'assignee-name'
                          : 'assignee-unassigned'
                      }
                    >
                      {c.assigneeDisplayName || 'Unassigned'}
                    </span>
                  </div>
                </td>
                <td>
                  <div className="timestamp-cell">
                    <Clock size={13} className="timestamp-icon" />
                    <span>{formatTimestamp(c.createdAt)}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {hasNextPage && (
        <div className="load-more-wrapper">
          <button
            onClick={() => onFetchNextPage()}
            disabled={isFetchingNextPage}
            className="load-more-button"
          >
            {isFetchingNextPage ? 'Loading more cases...' : 'Load More Cases'}
          </button>
        </div>
      )}
    </div>
  );
};
