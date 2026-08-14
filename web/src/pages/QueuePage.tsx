import React, { useState } from 'react';
import { Header } from '../components/Header';
import { QueueFilters } from '../components/QueueFilters';
import { QueueTable } from '../components/QueueTable';
import { CasesFilters, useInfiniteCases } from '../hooks/useCases';
import { CaseDto } from '@signaldesk/shared';
import { Inbox } from 'lucide-react';

interface QueuePageProps {
  onSelectCase?: (caseItem: CaseDto) => void;
  selectedCaseId?: string | null;
}

export const QueuePage: React.FC<QueuePageProps> = ({
  onSelectCase,
  selectedCaseId,
}) => {
  const [filters, setFilters] = useState<CasesFilters>({
    status: 'all',
    priority: 'all',
    mine: false,
  });

  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteCases(filters);

  // Flatten paginated pages
  const cases: CaseDto[] =
    data?.pages.flatMap((page) => page.data) || [];

  return (
    <div className="app-layout">
      <Header />

      <main className="main-content">
        <div className="content-container">
          <div className="page-header">
            <div className="page-title-group">
              <div className="page-icon">
                <Inbox size={22} />
              </div>
              <div>
                <h1 className="page-title">Operational Case Queue</h1>
                <p className="page-subtitle">
                  Real-time triage and resolution queue
                </p>
              </div>
            </div>
          </div>

          <QueueFilters filters={filters} onChange={setFilters} />

          {isError && (
            <div className="error-banner">
              <span>
                Failed to load cases: {(error as any)?.error?.message || 'Error'}
              </span>
            </div>
          )}

          <QueueTable
            cases={cases}
            isLoading={isLoading}
            hasNextPage={!!hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onFetchNextPage={() => fetchNextPage()}
            onSelectCase={onSelectCase}
            selectedCaseId={selectedCaseId}
          />
        </div>
      </main>
    </div>
  );
};
