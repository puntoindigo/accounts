'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';

function EmbedCallbackContent() {
  const searchParams = useSearchParams();
  const origin = useMemo(() => searchParams.get('origin') || '*', [searchParams]);
  const [status, setStatus] = useState('Validando acceso...');
  const [awaitingAck, setAwaitingAck] = useState(false);

  useEffect(() => {
    let active = true;
    let ackTimeout: ReturnType<typeof setTimeout> | null = null;
    const handleAck = (event: MessageEvent) => {
      if (event.origin !== origin) {
        return;
      }
      if (event.data?.type === 'accounts-ack') {
        setAwaitingAck(false);
        setStatus('Acceso confirmado. Podés volver a la app.');
        if (ackTimeout) {
          clearTimeout(ackTimeout);
        }
        signOut({ redirect: false });
        window.close();
      }
    };

    window.addEventListener('message', handleAck);
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
          setAwaitingAck(true);
          setStatus('Esperando confirmación de la app...');
          ackTimeout = setTimeout(() => {
            setAwaitingAck(false);
            setStatus('No pudimos confirmar en la app. Cerrá y reintentá.');
          }, 4000);
          return;
        }
        setStatus('Acceso validado, pero no detectamos la app. Abrí desde el login.');
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
        const reason = error instanceof Error ? error.message : 'token_error';
        setStatus(`No pudimos validar el acceso (${reason}). Cerrá y reintentá.`);
      }
    };

    run();
    return () => {
      active = false;
      window.removeEventListener('message', handleAck);
      if (ackTimeout) {
        clearTimeout(ackTimeout);
      }
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
