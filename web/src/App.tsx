import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CaseStatus, CasePriority } from '@signaldesk/shared';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ marginBottom: '24px', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>SignalDesk</h1>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>
            Multi-Tenant Internal Case Queue (Scaffold Ready)
          </p>
        </header>

        <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>System Status</h2>
          <p style={{ color: '#94a3b8', marginBottom: '8px' }}>
            Monorepo scaffold initialized with React, Vite, NestJS, and shared types.
          </p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <span style={{ padding: '4px 8px', backgroundColor: '#3b82f6', borderRadius: '4px', fontSize: '12px' }}>
              Status: {CaseStatus.OPEN}
            </span>
            <span style={{ padding: '4px 8px', backgroundColor: '#ef4444', borderRadius: '4px', fontSize: '12px' }}>
              Priority: {CasePriority.URGENT}
            </span>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
}

export default App;
