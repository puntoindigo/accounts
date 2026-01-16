'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function EmbedCallbackPage() {
  const searchParams = useSearchParams();
  const origin = useMemo(() => searchParams.get('origin') || '*', [searchParams]);
  const [status, setStatus] = useState('Validando acceso...');

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const response = await fetch('/api/embed/token', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('token_error');
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
      } catch {
        if (!active) {
          return;
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
