'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import FaceRecognitionAutoCapture from '@/components/biometric/FaceRecognitionAutoCapture';

const faceDistance = (a: number[], b: number[]) => {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};

// Usar el mismo threshold que el backend (0.6)
// Importar desde utils para mantener consistencia
const FACE_MATCH_THRESHOLD = 0.6;
const isSameFace = (a: number[], b: number[], threshold = FACE_MATCH_THRESHOLD) =>
  faceDistance(a, b) < threshold;

function EmbedStartContent() {
  const { status } = useSession();
  const searchParams = useSearchParams();
  const origin = useMemo(
    () => searchParams.get('origin') || window.location.origin,
    [searchParams]
  );
  const selectedMethod = useMemo(() => searchParams.get('method') || 'google', [searchParams]);
  const showGoogle = selectedMethod !== 'face' && selectedMethod !== 'rfid';
  const showFace = selectedMethod !== 'google' && selectedMethod !== 'rfid';
  const showRfid = false; // RFID deshabilitado temporalmente // selectedMethod === 'rfid';
  const [clearingSession, setClearingSession] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [lastFailedFaceDescriptor, setLastFailedFaceDescriptor] = useState<number[] | null>(null);
  const [loginInitiated, setLoginInitiated] = useState(false);
  const [needsFreshLogin, setNeedsFreshLogin] = useState(true);
  // RFID deshabilitado temporalmente
  // const [rfidUid, setRfidUid] = useState('');
  // const [rfidLoading, setRfidLoading] = useState(false);
  // const rfidInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'authenticated' && needsFreshLogin && !loginInitiated) {
      setClearingSession(true);
      setNotice('Reiniciando sesión para validar tu identidad...');
      signOut({ redirect: false }).finally(() => {
        setClearingSession(false);
        setNotice(null);
        setNeedsFreshLogin(false);
      });
    }
  }, [needsFreshLogin, loginInitiated, status]);

  // RFID deshabilitado temporalmente
  // useEffect(() => {
  //   if (showRfid) {
  //     rfidInputRef.current?.focus();
  //   }
  // }, [showRfid]);

  const handleFaceLogin = async (descriptor: number[]) => {
    if (lastFailedFaceDescriptor && isSameFace(descriptor, lastFailedFaceDescriptor)) {
      return;
    }
    setAuthMessage(null);
    setLoginInitiated(true);
    setNeedsFreshLogin(false);
    const result = await signIn('face', {
      redirect: false,
      descriptor: JSON.stringify(descriptor)
    });

    if (!result?.ok) {
      // Mensaje más específico basado en el error
      const errorMsg = result?.error || 'unknown';
      if (errorMsg.includes('no_match') || errorMsg.includes('not_found')) {
        setAuthMessage('Rostro no reconocido. Verificá que tengas un rostro registrado o usá Google.');
      } else {
        setAuthMessage('No autorizado por reconocimiento facial. Reintentá con Google.');
      }
      setLastFailedFaceDescriptor(descriptor);
      return;
    }

    setLastFailedFaceDescriptor(null);
    window.location.href = `/embed/callback?origin=${encodeURIComponent(origin)}`;
  };

  // RFID deshabilitado temporalmente
  // const handleRfidLogin = async () => {
  //   const normalized = rfidUid.trim().replace(/\s+/g, '');
  //   if (!normalized) {
  //     setAuthMessage('Ingresá un UID válido.');
  //     return;
  //   }
  //   setAuthMessage(null);
  //   setLoginInitiated(true);
  //   setNeedsFreshLogin(false);
  //   setRfidLoading(true);
  //   const result = await signIn('rfid', {
  //     redirect: false,
  //     uid: normalized
  //   });
  //   setRfidLoading(false);
  //   if (!result?.ok) {
  //     setAuthMessage('No autorizado por RFID. Verificá la tarjeta.');
  //     return;
  //   }
  //   window.location.href = `/embed/callback?origin=${encodeURIComponent(origin)}`;
  // };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-400">Accounts</p>
          <h1 className="text-2xl font-semibold text-slate-900">Acceso seguro</h1>
          <p className="text-sm text-slate-500">Ingresá para continuar en Recibos</p>
        </div>

        {notice && (
          <p className="text-xs text-slate-500 text-center">{notice}</p>
        )}

        {showGoogle && (
          <button
            type="button"
            className="w-full rounded-lg border border-slate-200 bg-white text-slate-700 py-2 text-sm font-medium shadow-sm hover:bg-slate-50 flex items-center justify-center gap-2"
            disabled={clearingSession}
            onClick={() =>
              (() => {
                setLoginInitiated(true);
                setNeedsFreshLogin(false);
                signIn('google', {
                  callbackUrl: `/embed/callback?origin=${encodeURIComponent(origin)}`
                });
              })()
            }
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M24 9.5c3.44 0 6.5 1.18 8.92 3.12l6.66-6.66C35.54 2.36 30.08 0 24 0 14.62 0 6.54 5.38 2.54 13.22l7.76 6.02C12.1 13.02 17.6 9.5 24 9.5z"
              />
              <path
                fill="#34A853"
                d="M46.98 24.56c0-1.58-.14-3.1-.4-4.56H24v9.1h12.98c-.56 2.98-2.24 5.5-4.76 7.2l7.32 5.66c4.28-3.94 6.44-9.74 6.44-17.4z"
              />
              <path
                fill="#4A90E2"
                d="M10.3 28.86a14.5 14.5 0 0 1 0-9.72l-7.76-6.02A23.96 23.96 0 0 0 0 24c0 3.9.94 7.58 2.54 10.88l7.76-6.02z"
              />
              <path
                fill="#FBBC05"
                d="M24 48c6.48 0 11.92-2.14 15.88-5.8l-7.32-5.66c-2.02 1.36-4.6 2.16-8.56 2.16-6.4 0-11.9-3.52-13.7-9.74l-7.76 6.02C6.54 42.62 14.62 48 24 48z"
              />
            </svg>
            Acceder con Google
          </button>
        )}

        {showGoogle && showFace && (
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex-1 border-t border-slate-200" />
            o
            <span className="flex-1 border-t border-slate-200" />
          </div>
        )}

        {showFace && (
          <div className="rounded-lg border border-slate-200 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Reconocimiento facial</h2>
            <FaceRecognitionAutoCapture
              onDescriptorCaptured={handleFaceLogin}
              defaultExpanded={selectedMethod === 'face'}
              title="Login biométrico"
              description="Captura tu rostro para iniciar sesión."
              actionLabel="Iniciar sesión"
              noticeLabel="Intentando iniciar sesión..."
              autoCaptureDisabled={clearingSession}
            />
          </div>
        )}

        {/* RFID deshabilitado temporalmente */}
        {/* {showRfid && (
          <div className="rounded-lg border border-slate-200 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Tarjeta RFID</h2>
            <p className="text-xs text-slate-500">
              Acercá la tarjeta al lector o escribí el UID.
            </p>
            <input
              value={rfidUid}
              onChange={(event) => setRfidUid(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleRfidLogin();
                }
              }}
              ref={rfidInputRef}
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm font-mono"
              placeholder="UID de tarjeta"
            />
            <button
              type="button"
              disabled={rfidLoading || clearingSession}
              onClick={handleRfidLogin}
              className="w-full rounded bg-slate-900 text-white py-2 text-sm disabled:opacity-60"
            >
              {rfidLoading ? 'Validando...' : 'Validar con RFID'}
            </button>
          </div>
        )} */}

        {authMessage && (
          <p className="text-xs text-red-600 text-center">{authMessage}</p>
        )}

        <div className="text-center">
          <a
            href="/"
            className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-4"
          >
            Ir a Accounts
          </a>
        </div>
      </div>
    </div>
  );
}

export default function EmbedStartPage() {
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
      <EmbedStartContent />
    </Suspense>
  );
}
