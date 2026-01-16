'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function EmbedCallbackContent() {
  const searchParams = useSearchParams();
  const origin = useMemo(() => searchParams.get('origin') || '*', [searchParams]);
  const [status, setStatus] = useState('Validando acceso...');

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const response = await fetch('/api/embed/token', { cache: 'no-store' });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData?.error || 'token_error');
        }
        const data = await response.json();
        if (!active) {
          return;
        }
        if (window.opener) {
          window.opener.postMessage(
            { type: 'accounts-login', token: data.token, user: data.user },
            origin
          );
        }
        setStatus('Acceso validado. Podés volver a la app.');
        setTimeout(() => {
          window.close();
        }, 800);
      } catch (error) {
        if (!active) {
          return;
        }
        if (window.opener) {
          window.opener.postMessage(
            {
              type: 'accounts-error',
              reason: error instanceof Error ? error.message : 'token_error'
            },
            origin
          );
        }
        setStatus('No pudimos validar el acceso. Cerrá esta ventana y reintentá.');
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [origin]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center px-4">
      <div className="rounded-2xl bg-white px-6 py-4 shadow-lg text-sm text-slate-600">
        {status}
      </div>
    </div>
  );
}

export default function EmbedCallbackPage() {
  return (
    <Suspense
      fallback={(
        <div className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center px-4">
          <div className="rounded-2xl bg-white px-6 py-4 shadow-lg text-sm text-slate-600">
            Cargando...
          </div>
        </div>
      )}
    >
      <EmbedCallbackContent />
    </Suspense>
  );
}
