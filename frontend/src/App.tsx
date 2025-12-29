import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TenantProvider } from './context/TenantContext';
import { SettingsProvider } from './context/SettingsContext';
import { Layout } from './components/layout';
import { DashboardPage, PipelinesPage, PipelineKanbanPage, PipelineEditorPage, FormsPage, FormViewPage, SettingsPage } from './pages';

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
      <SettingsProvider>
        <TenantProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<DashboardPage />} />
                <Route path="pipelines" element={<PipelinesPage />} />
                <Route path="pipelines/:pipelineId" element={<PipelineKanbanPage />} />
                <Route path="pipelines/:pipelineId/edit" element={<PipelineEditorPage />} />
                <Route path="forms" element={<FormsPage />} />
                <Route path="forms/:formId" element={<FormViewPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </TenantProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

export default App;
