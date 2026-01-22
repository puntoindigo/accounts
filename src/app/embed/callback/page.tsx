'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';

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
          setStatus('Acceso enviado. Cerrando...');
          // Cerrar popup inmediatamente después de enviar el token
          // No esperar ACK para evitar que el popup quede abierto
          // Cerrar sesión y popup en paralelo para mayor velocidad
          Promise.all([
            signOut({ redirect: false }).catch(() => {}),
            new Promise(resolve => setTimeout(resolve, 50))
          ]).then(() => {
            // Intentar cerrar el popup de múltiples formas
            try {
              window.close();
            } catch (e) {
              // Ignorar errores
            }
            // Si después de 200ms el popup sigue abierto, redirigir a about:blank
            setTimeout(() => {
              if (!document.hidden) {
                try {
                  window.location.href = 'about:blank';
                } catch (e) {
                  // Ignorar errores
                }
              }
            }, 200);
          });
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
        setStatus(`Error: ${reason}. Cerrando...`);
        // Cerrar popup automáticamente después de enviar el error
        setTimeout(() => {
          signOut({ redirect: false });
          window.close();
        }, 1500);
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
