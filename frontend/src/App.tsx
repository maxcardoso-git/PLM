import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TenantProvider } from './context/TenantContext';
import { Layout } from './components/layout';
import { DashboardPage, PipelinesPage, PipelineKanbanPage } from './pages';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="pipelines" element={<PipelinesPage />} />
              <Route path="pipelines/:pipelineId" element={<PipelineKanbanPage />} />
              <Route path="forms" element={<div className="p-4">Forms Page - Coming Soon</div>} />
              <Route path="settings" element={<div className="p-4">Settings Page - Coming Soon</div>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TenantProvider>
    </QueryClientProvider>
  );
}

export default App;
