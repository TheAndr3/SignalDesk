import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { QueuePage } from './pages/QueuePage';
import { CaseDto } from '@signaldesk/shared';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30, // 30 seconds
    },
  },
});

function AppRouter() {
  const { session, loading } = useAuth();
  const [selectedCase, setSelectedCase] = useState<CaseDto | null>(null);

  if (loading) {
    return (
      <div className="app-loading-screen">
        <div className="loading-spinner" />
        <p className="loading-text">Loading SignalDesk...</p>
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <QueuePage
      selectedCaseId={selectedCase?.id}
      onSelectCase={(caseItem) => setSelectedCase(caseItem)}
    />
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
