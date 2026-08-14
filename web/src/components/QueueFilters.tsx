import { FC, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { CasePriority, CaseStatus } from '@signaldesk/shared';
import { Filter, SlidersHorizontal, UserCheck, Users, X } from 'lucide-react';
import { CasesFilters } from '../hooks/useCases';

interface QueueFiltersProps {
  filters: CasesFilters;
  onChange: (newFilters: CasesFilters) => void;
}

export const QueueFilters: FC<QueueFiltersProps> = ({
  filters,
  onChange,
}) => {
  const [isMobileDialogOpen, setIsMobileDialogOpen] = useState(false);
  const mobileFilterTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileStatusRef = useRef<HTMLSelectElement>(null);
  const wasMobileDialogOpenRef = useRef(false);
  const handleStatusChange = (status: string) => {
    onChange({
      ...filters,
      status: status as CaseStatus | 'all',
    });
  };

  const handlePriorityChange = (priority: string) => {
    onChange({
      ...filters,
      priority: priority as CasePriority | 'all',
    });
  };

  const handleMineToggle = (mine: boolean) => {
    onChange({
      ...filters,
      mine,
    });
  };

  const activeFilterCount = [filters.status, filters.priority].filter(
    (filter) => filter && filter !== 'all',
  ).length;

  useEffect(() => {
    if (isMobileDialogOpen) {
      wasMobileDialogOpenRef.current = true;
      mobileStatusRef.current?.focus();
      return;
    }
    if (wasMobileDialogOpenRef.current) {
      mobileFilterTriggerRef.current?.focus();
      wasMobileDialogOpenRef.current = false;
    }
  }, [isMobileDialogOpen]);

  const closeMobileDialog = () => setIsMobileDialogOpen(false);

  const trapDialogFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMobileDialog();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), select:not([disabled])',
      ),
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="queue-filters-bar">
      <div className="filters-left">
        {/* Mine / All Segmented Control */}
        <div className="segmented-control">
          <button
            type="button"
            className={`segmented-button ${!filters.mine ? 'active' : ''}`}
            onClick={() => handleMineToggle(false)}
          >
            <Users size={14} />
            <span>All Queue</span>
          </button>
          <button
            type="button"
            className={`segmented-button ${filters.mine ? 'active' : ''}`}
            onClick={() => handleMineToggle(true)}
          >
            <UserCheck size={14} />
            <span>Assigned to Me</span>
          </button>
        </div>

        <button
          ref={mobileFilterTriggerRef}
          type="button"
          className="mobile-filters-trigger"
          onClick={() => setIsMobileDialogOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={isMobileDialogOpen}
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          <span>{activeFilterCount ? `Filters (${activeFilterCount})` : 'Filters'}</span>
        </button>

        <div className="filter-select-wrapper desktop-filter-control">
          <label className="filter-label" htmlFor="status-filter">
            <Filter size={13} />
            Status:
          </label>
          <select
            id="status-filter"
            className="filter-select"
            value={filters.status || 'all'}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value={CaseStatus.OPEN}>Open</option>
            <option value={CaseStatus.ASSIGNED}>Assigned</option>
            <option value={CaseStatus.RESOLVED}>Resolved</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div className="filter-select-wrapper desktop-filter-control">
          <label className="filter-label" htmlFor="priority-filter">
            Priority:
          </label>
          <select
            id="priority-filter"
            className="filter-select"
            value={filters.priority || 'all'}
            onChange={(e) => handlePriorityChange(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value={CasePriority.URGENT}>Urgent</option>
            <option value={CasePriority.HIGH}>High</option>
            <option value={CasePriority.MEDIUM}>Medium</option>
            <option value={CasePriority.LOW}>Low</option>
          </select>
        </div>
      </div>

      {isMobileDialogOpen && (
        <div className="mobile-filters-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeMobileDialog();
        }}>
          <div
            className="mobile-filters-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-filters-title"
            onKeyDown={trapDialogFocus}
          >
            <div className="mobile-filters-header">
              <h2 id="mobile-filters-title">Filters</h2>
              <button type="button" className="panel-close-button" onClick={closeMobileDialog} aria-label="Close filters">
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="mobile-filters-content">
              <div className="form-group">
                <label className="form-label" htmlFor="mobile-status-filter">Status</label>
                <select
                  ref={mobileStatusRef}
                  id="mobile-status-filter"
                  className="form-input"
                  value={filters.status || 'all'}
                  onChange={(e) => handleStatusChange(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value={CaseStatus.OPEN}>Open</option>
                  <option value={CaseStatus.ASSIGNED}>Assigned</option>
                  <option value={CaseStatus.RESOLVED}>Resolved</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="mobile-priority-filter">Priority</label>
                <select
                  id="mobile-priority-filter"
                  className="form-input"
                  value={filters.priority || 'all'}
                  onChange={(e) => handlePriorityChange(e.target.value)}
                >
                  <option value="all">All Priorities</option>
                  <option value={CasePriority.URGENT}>Urgent</option>
                  <option value={CasePriority.HIGH}>High</option>
                  <option value={CasePriority.MEDIUM}>Medium</option>
                  <option value={CasePriority.LOW}>Low</option>
                </select>
              </div>
              <button type="button" className="action-button action-create-button mobile-filters-apply" onClick={closeMobileDialog}>
                Apply filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
