import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TenantProvider } from './context/TenantContext';
import { SettingsProvider } from './context/SettingsContext';
import { Layout } from './components/layout';
import { DashboardPage, PipelineDesignPage, PipelineKanbanPage, PipelineEditorPage, FormsPage, FormViewPage, SettingsPage, TemplatesPage, IntegrationsPage, AuthCallbackPage, GroupsPage, OperatorPipelinesPage } from './pages';

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
              {/* Auth callback route - outside Layout */}
              <Route path="/auth/tah-callback" element={<AuthCallbackPage />} />

              <Route path="/" element={<Layout />}>
                <Route index element={<DashboardPage />} />
                <Route path="pipeline-design" element={<PipelineDesignPage />} />
                <Route path="pipeline-design/:pipelineId" element={<PipelineKanbanPage />} />
                <Route path="pipeline-design/:pipelineId/edit" element={<PipelineEditorPage />} />
                <Route path="forms" element={<FormsPage />} />
                <Route path="forms/:formId" element={<FormViewPage />} />
                <Route path="templates" element={<TemplatesPage />} />
                <Route path="integrations" element={<IntegrationsPage />} />
                <Route path="groups" element={<GroupsPage />} />
                <Route path="pipelines" element={<OperatorPipelinesPage />} />
                <Route path="kanban/:pipelineId" element={<PipelineKanbanPage />} />
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
