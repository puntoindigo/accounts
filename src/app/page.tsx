'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import FaceRecognitionCapture from '@/components/biometric/FaceRecognitionCapture';
import FaceRecognitionAutoCapture from '@/components/biometric/FaceRecognitionAutoCapture';
import { useSearchParams } from 'next/navigation';

interface Person {
  id: string;
  email: string;
  nombre: string;
  empresa: string;
  faceDescriptor: number[] | null;
  active: boolean;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FaceMatchResult {
  id: string;
  email: string;
  nombre: string;
  empresa: string;
  distance: number;
  confidence: number;
}

interface LoginEvent {
  id: string;
  personId: string | null;
  provider: string;
  status: 'success' | 'failed';
  reason: string | null;
  email?: string | null;
  ip: string | null;
  city: string | null;
  country: string | null;
  userAgent: string | null;
  createdAt: string;
}

function LoginGate({
  onFaceLogin,
  authMessage,
  faceLoginLocked,
  setAuthMessage
}: {
  onFaceLogin: (descriptor: number[]) => void;
  authMessage: string | null;
  faceLoginLocked: boolean;
  setAuthMessage: (value: string | null) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'AccessDenied') {
      setAuthMessage('Acceso denegado. Verificá que tu cuenta esté autorizada.');
    }
  }, [searchParams, setAuthMessage]);

  return (
    <div className="min-h-screen bg-blue-600 text-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">Sistema de Identidad</h1>
          <p className="text-sm text-slate-500">Selecciona un método de acceso</p>
        </div>

        <button
          type="button"
          className="w-full rounded-lg border border-slate-200 bg-white text-slate-700 py-2 text-sm font-medium shadow-sm hover:bg-slate-50 flex items-center justify-center gap-2"
          onClick={() => signIn('google')}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
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

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex-1 border-t border-slate-200" />
          o
          <span className="flex-1 border-t border-slate-200" />
        </div>

        <div className="rounded-lg border border-slate-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Reconocimiento facial</h2>
          <FaceRecognitionAutoCapture
            onDescriptorCaptured={onFaceLogin}
            defaultExpanded={false}
            title="Login biométrico"
            description="Captura tu rostro para iniciar sesión."
            actionLabel="Iniciar sesión"
            noticeLabel="Intentando iniciar sesión..."
            autoCaptureDisabled={faceLoginLocked}
          />
        </div>

        {authMessage && (
          <p className="text-xs text-red-600 text-center">{authMessage}</p>
        )}

        <p className="text-xs text-center text-slate-400">
          © 2026 Desarrollado por Punto Indigo
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const { data: session, status } = useSession();
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({ email: '', nombre: '', empresa: '' });
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<FaceMatchResult | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [faceLoginLocked, setFaceLoginLocked] = useState(false);
  const [loginEvents, setLoginEvents] = useState<LoginEvent[]>([]);
  const [loginLoading, setLoginLoading] = useState(false);
  const [activityFilter, setActivityFilter] = useState<'all' | 'success' | 'failed'>('all');

  const selectedPerson = useMemo(
    () => persons.find(person => person.id === selectedPersonId) || null,
    [persons, selectedPersonId]
  );

  const loadPersons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/employees', { cache: 'no-store' });
      const data = await response.json();
      setPersons(Array.isArray(data.persons) ? data.persons : []);
    } catch {
      setError('No se pudieron cargar las personas.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLoginEvents = useCallback(async () => {
    setLoginLoading(true);
    try {
      const params = activityFilter === 'all' ? '' : `?status=${activityFilter}`;
      const response = await fetch(`/api/logins${params}`, { cache: 'no-store' });
      const data = await response.json();
      setLoginEvents(Array.isArray(data.events) ? data.events : []);
    } catch {
      setLoginEvents([]);
    } finally {
      setLoginLoading(false);
    }
  }, [activityFilter]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadPersons();
      loadLoginEvents();
    }
  }, [loadPersons, loadLoginEvents, status]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadLoginEvents();
    }
  }, [activityFilter, loadLoginEvents, status]);

  const handleCreatePerson = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setRegisterMessage(null);

    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || 'No se pudo crear la persona.');
      }

      setFormData({ email: '', nombre: '', empresa: '' });
      await loadPersons();
    } catch (error: any) {
      setRegisterMessage(error?.message || 'Error al crear la persona.');
    } finally {
      setCreating(false);
    }
  };

  const handleRegisterFace = async (descriptor: number[]) => {
    if (!selectedPerson) {
      setRegisterMessage('Selecciona una persona antes de registrar el rostro.');
      return;
    }

    setRegisterMessage(null);
    const response = await fetch('/api/face/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId: selectedPerson.id, descriptor })
    });
    const data = await response.json();
    if (!response.ok) {
      setRegisterMessage(data?.error || 'No se pudo registrar el rostro.');
      return;
    }

    setRegisterMessage('Rostro registrado correctamente.');
    await loadPersons();
  };

  const handleRemoveFace = async () => {
    if (!selectedPerson) {
      setRegisterMessage('Selecciona una persona antes de eliminar el descriptor.');
      return;
    }

    setRegisterMessage(null);
    const response = await fetch('/api/face/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId: selectedPerson.id })
    });
    const data = await response.json();
    if (!response.ok) {
      setRegisterMessage(data?.error || 'No se pudo eliminar el descriptor.');
      return;
    }

    setRegisterMessage('Descriptor eliminado correctamente.');
    await loadPersons();
  };

  const handleVerifyFace = async (descriptor: number[]) => {
    setVerifyMessage(null);
    setVerificationResult(null);
    const response = await fetch('/api/face/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descriptor })
    });
    const data = await response.json();
    if (!response.ok) {
      setVerifyMessage(data?.error || 'No se pudo verificar el rostro.');
      return;
    }

    if (!data.found) {
      setVerifyMessage('No se encontró una persona coincidente.');
      return;
    }

    setVerificationResult(data.match as FaceMatchResult);
  };

  const handleFaceLogin = async (descriptor: number[]) => {
    if (faceLoginLocked) {
      return;
    }
    setAuthMessage(null);
    const result = await signIn('face', {
      redirect: false,
      descriptor: JSON.stringify(descriptor)
    });

    if (!result?.ok) {
      setAuthMessage('No autorizado por reconocimiento facial. Reintentá con Google.');
      setFaceLoginLocked(true);
    }
  };

  const handleUpdatePerson = async (
    id: string,
    updates: Partial<Pick<Person, 'active' | 'isAdmin'>>
  ) => {
    const response = await fetch(`/api/employees/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const data = await response.json();
    if (!response.ok) {
      setRegisterMessage(data?.error || 'No se pudo actualizar la persona.');
      return;
    }
    setPersons(prev => prev.map(person => (person.id === id ? data.person : person)));
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
        <p className="text-sm text-slate-600">Verificando sesión...</p>
      </div>
    );
  }

  if (status !== 'authenticated') {
    return (
      <Suspense
        fallback={(
          <div className="min-h-screen bg-blue-600 flex items-center justify-center">
            <p className="text-sm text-white">Cargando acceso...</p>
          </div>
        )}
      >
        <LoginGate
          onFaceLogin={handleFaceLogin}
          authMessage={authMessage}
          faceLoginLocked={faceLoginLocked}
          setAuthMessage={setAuthMessage}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-6xl mx-auto px-6 py-12 space-y-10">
        <header className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold">Accounts — Identidad Biométrica</h1>
            <p className="text-sm text-slate-600">
              Este servicio centraliza el registro y verificación de identidad facial.
            </p>
          </div>
          <div className="text-right space-y-2">
            <p className="text-xs text-slate-500">
              Sesión: {session?.user?.name || session?.user?.email || 'Usuario'}
              {(session as any)?.isAdmin ? ' · Admin' : ''}
            </p>
            <button
              type="button"
              onClick={() => signOut()}
              className="rounded border border-slate-200 px-3 py-1 text-xs bg-white hover:bg-slate-50 active:scale-[0.98] transition"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        <section className="grid md:grid-cols-2 gap-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="text-lg font-semibold">Crear persona</h2>
            <form className="space-y-3" onSubmit={handleCreatePerson}>
              <div className="space-y-1">
                <label className="text-sm font-medium">Email Gmail</label>
                <input
                  value={formData.email}
                  onChange={(event) => {
                    const raw = event.target.value || '';
                    const localPart = raw.replace(/@/g, '').replace(/@gmail\.com/gi, '').trim();
                    const normalized = localPart ? `${localPart}@gmail.com` : '';
                    setFormData(prev => ({ ...prev, email: normalized }));
                  }}
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                  type="email"
                  placeholder="@gmail.com"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Nombre</label>
                <input
                  value={formData.nombre}
                  onChange={(event) => setFormData(prev => ({ ...prev, nombre: event.target.value }))}
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Empresa</label>
                <input
                  value={formData.empresa}
                  onChange={(event) => setFormData(prev => ({ ...prev, empresa: event.target.value }))}
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={creating}
                className="w-full rounded bg-slate-900 text-white py-2 text-sm disabled:opacity-60"
              >
                {creating ? 'Creando...' : 'Crear persona'}
              </button>
            </form>
            {registerMessage && (
              <p className="text-sm text-slate-600">{registerMessage}</p>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="text-lg font-semibold">Personas registradas</h2>
            {loading ? (
              <p className="text-sm text-slate-500">Cargando personas...</p>
            ) : error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : persons.length === 0 ? (
              <p className="text-sm text-slate-500">No hay personas registradas.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {persons.map(person => (
                  <div
                    key={person.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedPersonId(person.id);
                      setRegisterMessage(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedPersonId(person.id);
                        setRegisterMessage(null);
                      }
                    }}
                    className={`w-full text-left rounded border px-3 py-2 text-sm cursor-pointer ${
                      selectedPersonId === person.id
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{person.nombre}</span>
                      <span className="text-xs text-slate-500">{person.email}</span>
                    </div>
                    <div className="text-xs text-slate-500">{person.empresa}</div>
                    <div className="text-xs text-slate-500">
                      {person.faceDescriptor?.length ? 'Rostro registrado' : 'Sin rostro registrado'}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className={`px-2 py-1 rounded ${person.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {person.active ? 'Acceso activo' : 'Acceso suspendido'}
                      </span>
                      <span className={`px-2 py-1 rounded ${person.isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                        {person.isAdmin ? 'Admin' : 'Sin admin'}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleUpdatePerson(person.id, { active: !person.active });
                        }}
                        className="rounded border border-slate-200 px-2 py-1 bg-white hover:bg-slate-50 active:scale-[0.98] transition"
                      >
                        {person.active ? 'Suspender acceso' : 'Activar acceso'}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleUpdatePerson(person.id, { isAdmin: !person.isAdmin });
                        }}
                        className="rounded border border-slate-200 px-2 py-1 bg-white hover:bg-slate-50 active:scale-[0.98] transition"
                      >
                        {person.isAdmin ? 'Quitar admin' : 'Hacer admin'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Registrar rostro de la persona</h2>
            {selectedPerson ? (
              <div className="space-y-3">
                <div className="rounded border border-slate-200 bg-white p-4 text-sm">
                  <p className="font-medium">{selectedPerson.nombre}</p>
                  <p className="text-slate-500">{selectedPerson.email}</p>
                  <p className="text-slate-500">{selectedPerson.empresa}</p>
                </div>
                <FaceRecognitionCapture
                  savedDescriptor={selectedPerson.faceDescriptor}
                  onDescriptorCaptured={handleRegisterFace}
                  onDescriptorRemoved={handleRemoveFace}
                  defaultExpanded={false}
                  title="Registro biométrico"
                  description="Captura el rostro para asociarlo a esta persona."
                  actionLabel="Registrar rostro"
                />
                {registerMessage && (
                  <p className="text-sm text-slate-600">{registerMessage}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Selecciona una persona para registrar su rostro.
              </p>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Verificar identidad</h2>
            <FaceRecognitionAutoCapture
              onDescriptorCaptured={handleVerifyFace}
              defaultExpanded={false}
              title="Verificación facial"
              description="Captura un rostro y verifica si existe una persona coincidente."
              actionLabel="Verificar rostro"
              noticeLabel="Verificando identidad..."
            />
            {verifyMessage && (
              <p className="text-sm text-slate-600">{verifyMessage}</p>
            )}
            {verificationResult && (
              <div className="rounded border border-emerald-200 bg-emerald-50 p-4 text-sm">
                <p className="font-medium">{verificationResult.nombre}</p>
                <p className="text-slate-600">
                  {verificationResult.email} · {verificationResult.empresa}
                </p>
                <p className="text-slate-600">
                  Confianza: {verificationResult.confidence}% (distancia {verificationResult.distance.toFixed(3)})
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Histórico de actividad</h2>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setActivityFilter('all')}
                className={`rounded border px-2 py-1 active:scale-[0.98] transition ${activityFilter === 'all' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setActivityFilter('success')}
                className={`rounded border px-2 py-1 active:scale-[0.98] transition ${activityFilter === 'success' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
              >
                Exitosos
              </button>
              <button
                type="button"
                onClick={() => setActivityFilter('failed')}
                className={`rounded border px-2 py-1 active:scale-[0.98] transition ${activityFilter === 'failed' ? 'border-red-600 bg-red-600 text-white' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
              >
                Fallidos
              </button>
              <button
                type="button"
                onClick={loadLoginEvents}
                className="rounded border border-slate-200 px-2 py-1 bg-white hover:bg-slate-50 active:scale-[0.98] transition"
              >
                Actualizar
              </button>
            </div>
          </div>
          {loginLoading ? (
            <p className="text-sm text-slate-500">Cargando actividad...</p>
          ) : loginEvents.length === 0 ? (
            <p className="text-sm text-slate-500">Sin registros todavía.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {loginEvents.map(event => (
                <div
                  key={event.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border border-slate-100 rounded px-3 py-2 text-sm"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${event.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {event.status === 'success' ? 'Éxito' : 'Fallido'}
                      </span>
                      <span className="text-xs text-slate-500">{event.provider.toUpperCase()}</span>
                      {event.reason && (
                        <span className="text-xs text-slate-400">· {event.reason}</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700">
                      {event.email || 'Sin email'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {event.ip || 'IP desconocida'} · {event.city || 'Ciudad desconocida'} {event.country ? `(${event.country})` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(event.createdAt).toLocaleString('es-AR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

