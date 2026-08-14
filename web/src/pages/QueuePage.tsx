import { useState, useEffect, FC } from 'react';
import { Header } from '../components/Header';
import { QueueFilters } from '../components/QueueFilters';
import { QueueTable } from '../components/QueueTable';
import { CaseDetailPanel } from '../components/CaseDetailPanel';
import { CasesFilters, useInfiniteCases } from '../hooks/useCases';
import { useRealtimeEvents } from '../hooks/useRealtimeEvents';
import { CaseDto } from '@signaldesk/shared';
import { Inbox } from 'lucide-react';

export const QueuePage: FC = () => {
  // Subscribe to real-time Server-Sent Events
  useRealtimeEvents();

  const [filters, setFilters] = useState<CasesFilters>({
    status: 'all',
    priority: 'all',
    mine: false,
  });

  const [activeCaseId, setActiveCaseId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('case');
  });

  // Sync activeCaseId with URL query parameter (?case=<uuid>)
  useEffect(() => {
    const url = new URL(window.location.href);
    if (activeCaseId) {
      url.searchParams.set('case', activeCaseId);
    } else {
      url.searchParams.delete('case');
    }
    window.history.pushState(null, '', url.toString());
  }, [activeCaseId]);

  // Handle popstate (browser back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveCaseId(params.get('case'));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteCases(filters);

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
            onSelectCase={(caseItem) => setActiveCaseId(caseItem.id)}
            selectedCaseId={activeCaseId}
          />
        </div>
      </main>

      {activeCaseId && (
        <CaseDetailPanel
          caseId={activeCaseId}
          onClose={() => setActiveCaseId(null)}
        />
      )}
    </div>
  );
};
