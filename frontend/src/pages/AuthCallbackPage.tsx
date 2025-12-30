import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const processCallback = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setError('Token não encontrado na URL');
        setProcessing(false);
        return;
      }

      try {
        // Send token to backend for validation
        const response = await fetch(`/api/v1/auth/tah-callback?token=${encodeURIComponent(token)}`, {
          method: 'GET',
          credentials: 'include',
          redirect: 'manual', // Don't follow redirects automatically
        });

        // Backend will try to redirect, but we handle it here
        if (response.type === 'opaqueredirect' || response.status === 0) {
          // Redirect happened, reload to get authenticated state
          window.location.href = '/';
          return;
        }

        if (response.ok || response.redirected) {
          // Success - redirect to home
          window.location.href = '/';
          return;
        }

        // Try to get error message
        const data = await response.json().catch(() => ({}));
        setError(data.message || 'Falha na autenticação');
        setProcessing(false);
      } catch (err) {
        console.error('Auth callback error:', err);
        // If fetch failed but cookies might have been set, try reloading
        window.location.href = '/?auth=success';
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800">Processando autenticação...</h2>
          <p className="text-gray-500 mt-2">Aguarde enquanto validamos sua sessão</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800">Erro na Autenticação</h2>
          <p className="text-gray-500 mt-2">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  return null;
}
