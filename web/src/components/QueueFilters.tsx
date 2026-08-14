import { FC } from 'react';
import { CasePriority, CaseStatus } from '@signaldesk/shared';
import { Filter, UserCheck, Users } from 'lucide-react';
import { CasesFilters } from '../hooks/useCases';

interface QueueFiltersProps {
  filters: CasesFilters;
  onChange: (newFilters: CasesFilters) => void;
}

export const QueueFilters: FC<QueueFiltersProps> = ({
  filters,
  onChange,
}) => {
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

        {/* Status Filter */}
        <div className="filter-select-wrapper">
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
        <div className="filter-select-wrapper">
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
    </div>
  );
};
