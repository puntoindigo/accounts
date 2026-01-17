'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import FaceRecognitionAutoCapture from '@/components/biometric/FaceRecognitionAutoCapture';
import FaceRegistrationPicker from '@/components/biometric/FaceRegistrationPicker';
import { useSearchParams } from 'next/navigation';

interface Person {
  id: string;
  email: string;
  nombre: string;
  empresa: string;
  faceDescriptor: number[] | null;
  faceImageUrl: string | null;
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

interface RfidCard {
  id: string;
  personId: string;
  uid: string;
  active: boolean;
  createdAt: string;
}

const faceDistance = (a: number[], b: number[]) => {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};

const isSameFace = (a: number[], b: number[], threshold = 0.45) =>
  faceDistance(a, b) < threshold;

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
  const [loginMethod, setLoginMethod] = useState<'google' | 'face' | 'rfid'>('google');
  const [rfidUid, setRfidUid] = useState('');
  const [rfidLoading, setRfidLoading] = useState(false);
  const [rfidMessage, setRfidMessage] = useState<string | null>(null);
  const [rfidAvailable, setRfidAvailable] = useState<boolean | null>(null);
  const rfidInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const error = searchParams?.get('error');
    if (error === 'AccessDenied') {
      setAuthMessage('Acceso denegado. Verificá que tu cuenta esté autorizada.');
    }
  }, [searchParams, setAuthMessage]);

  useEffect(() => {
    rfidInputRef.current?.focus();
    fetch('/api/rfid/status', { cache: 'no-store' })
      .then(response => response.json())
      .then(data => setRfidAvailable(Boolean(data?.available)))
      .catch(() => setRfidAvailable(false));
  }, []);

  const handleRfidLogin = async () => {
    if (!rfidUid.trim()) {
      setRfidMessage('Ingresá un UID válido.');
      return;
    }
    setRfidLoading(true);
    setRfidMessage(null);
    try {
      const result = await signIn('rfid', {
        uid: rfidUid.trim(),
        redirect: false
      });
      if (result?.error) {
        setRfidMessage('UID no válido o tarjeta inactiva.');
      }
    } catch {
      setRfidMessage('Error al validar la tarjeta.');
    } finally {
      setRfidLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900">Accounts</h1>
          <p className="text-sm text-gray-500">Identidad Biométrica</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          type="button"
              onClick={() => setLoginMethod('google')}
              className={`flex-1 py-3 text-sm font-medium transition ${
                loginMethod === 'google'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Google
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('face')}
              className={`flex-1 py-3 text-sm font-medium transition ${
                loginMethod === 'face'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Facial
        </button>
            <button
              type="button"
              onClick={() => setLoginMethod('rfid')}
              className={`flex-1 py-3 text-sm font-medium transition ${
                loginMethod === 'rfid'
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              RFID
            </button>
        </div>

          <div className="pt-4">
            {loginMethod === 'google' && (
              <button
                type="button"
                onClick={() => signIn('google')}
                className="w-full flex items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar con Google
              </button>
            )}

            {loginMethod === 'face' && (
              <div className="space-y-4">
          <FaceRecognitionAutoCapture
            onDescriptorCaptured={onFaceLogin}
                  defaultExpanded={true}
                  title=""
                  description=""
                  actionLabel=""
                  noticeLabel="Verificando identidad..."
            autoCaptureDisabled={faceLoginLocked}
          />
              </div>
            )}

            {loginMethod === 'rfid' && (
              <div className="space-y-3">
                <input
                  ref={rfidInputRef}
                  value={rfidUid}
                  onChange={(e) => setRfidUid(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleRfidLogin();
                    }
                  }}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="UID de tarjeta"
                  disabled={rfidAvailable === false}
                />
                <button
                  type="button"
                  onClick={handleRfidLogin}
                  disabled={rfidLoading || rfidAvailable === false}
                  className="w-full rounded-lg bg-gray-900 text-white px-4 py-3 text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {rfidLoading ? 'Validando...' : 'Validar con RFID'}
                </button>
                {rfidAvailable === false && (
                  <p className="text-xs text-gray-500 text-center">
                    No hay tarjetas RFID registradas.
                  </p>
                )}
                {rfidMessage && (
                  <p className="text-xs text-red-600 text-center">{rfidMessage}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {authMessage && (
          <p className="text-xs text-red-600 text-center">{authMessage}</p>
        )}

        <p className="text-xs text-center text-gray-400">
          © 2026 Punto Indigo
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const { data: session, status } = useSession();
  const [isLocalhost, setIsLocalhost] = useState(false);
  
  useEffect(() => {
    // Detectar si estamos en localhost
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      setIsLocalhost(hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1');
    }
  }, []);

  // Bypass para localhost: simular sesión autenticada
  const mockLocalhostSession = useMemo(() => {
    if (isLocalhost && status !== 'authenticated') {
      return {
        user: {
          name: 'Localhost User',
          email: 'localhost@accounts.local',
          image: null
        },
        provider: 'localhost',
        empresa: 'Localhost',
        isAdmin: true,
        personId: null
      };
    }
    return null;
  }, [isLocalhost, status]);

  const effectiveSession = session || mockLocalhostSession;
  const effectiveStatus = isLocalhost && !session ? 'authenticated' : status;

  const PERSONS_PAGE_SIZE = 10;
  const ACTIVITY_PAGE_SIZE = 10;
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({ gmailUser: '', nombre: '', empresa: '' });
  const [showCreatePerson, setShowCreatePerson] = useState(false);
  const [createPersonStep, setCreatePersonStep] = useState<'data' | 'face' | 'rfid' | 'complete'>('data');
  const [newPersonId, setNewPersonId] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [showDeletePersonConfirm, setShowDeletePersonConfirm] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<FaceMatchResult | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [lastFailedFaceDescriptor, setLastFailedFaceDescriptor] = useState<number[] | null>(null);
  const [loginEvents, setLoginEvents] = useState<LoginEvent[]>([]);
  const [loginLoading, setLoginLoading] = useState(false);
  const [activityFilter, setActivityFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [faceMode, setFaceMode] = useState<'register' | 'verify'>('verify');
  const [showPersons, setShowPersons] = useState(true);
  const [showActivity, setShowActivity] = useState(false);
  const [showSessionActions, setShowSessionActions] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showRegisterCapture, setShowRegisterCapture] = useState(true);
  const [rfidCards, setRfidCards] = useState<RfidCard[]>([]);
  const [rfidUid, setRfidUid] = useState('');
  const [rfidMessage, setRfidMessage] = useState<string | null>(null);
  const [rfidLoading, setRfidLoading] = useState(false);
  const [rfidDeleteCard, setRfidDeleteCard] = useState<RfidCard | null>(null);
  const [personsVisibleCount, setPersonsVisibleCount] = useState(PERSONS_PAGE_SIZE);
  const [activityVisibleCount, setActivityVisibleCount] = useState(ACTIVITY_PAGE_SIZE);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentView, setCurrentView] = useState<'persons' | 'activity'>('persons');

  const selectedPerson = useMemo(
    () => persons.find(person => person.id === selectedPersonId) || null,
    [persons, selectedPersonId]
  );
  const personsById = useMemo(() => {
    const map = new Map<string, Person>();
    persons.forEach(person => {
      map.set(person.id, person);
    });
    return map;
  }, [persons]);
  const personsByEmail = useMemo(() => {
    const map = new Map<string, Person>();
    persons.forEach(person => {
      map.set(person.email.toLowerCase(), person);
    });
    return map;
  }, [persons]);
  const currentUserEmail = (effectiveSession?.user?.email || '').toLowerCase().trim();
  const currentPerson = useMemo(
    () => persons.find(person => person.email.toLowerCase() === currentUserEmail) || null,
    [persons, currentUserEmail]
  );
  const isAdmin = Boolean((effectiveSession as any)?.isAdmin);

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
    if (effectiveStatus === 'authenticated') {
      loadPersons();
      loadLoginEvents();
    }
  }, [loadPersons, loadLoginEvents, effectiveStatus]);

  useEffect(() => {
    if (effectiveStatus === 'authenticated') {
      loadLoginEvents();
    }
  }, [activityFilter, loadLoginEvents, effectiveStatus]);

  useEffect(() => {
    if (!selectedPersonId && !showActivity) {
      setShowPersons(true);
    }
  }, [selectedPersonId, showActivity]);

  useEffect(() => {
    setPersonsVisibleCount(prev => Math.min(Math.max(prev, PERSONS_PAGE_SIZE), persons.length || PERSONS_PAGE_SIZE));
  }, [persons.length]);

  useEffect(() => {
    setActivityVisibleCount(prev => Math.min(Math.max(prev, ACTIVITY_PAGE_SIZE), loginEvents.length || ACTIVITY_PAGE_SIZE));
  }, [loginEvents.length]);

  const handleCreatePerson = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setRegisterMessage(null);

    try {
      if (editingPerson) {
        // Modo edición
        const response = await fetch(`/api/employees/${editingPerson.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `${formData.gmailUser}@gmail.com`,
            nombre: formData.nombre,
            empresa: formData.empresa
          })
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data?.error || 'No se pudo actualizar la persona.');
        }
        const data = await response.json();
        if (data?.person) {
          setPersons(prev => prev.map(person => (person.id === data.person.id ? data.person : person)));
          setSelectedPersonId(data.person.id);
          setShowCreatePerson(false);
          setCreatePersonStep('data');
          setEditingPerson(null);
          setFormData({ gmailUser: '', nombre: '', empresa: '' });
        }
      } else {
        // Modo creación
        const response = await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `${formData.gmailUser}@gmail.com`,
            nombre: formData.nombre,
            empresa: formData.empresa
          })
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data?.error || 'No se pudo crear la persona.');
        }

        const data = await response.json();
        if (data?.person?.id) {
          setNewPersonId(data.person.id);
          setSelectedPersonId(data.person.id);
          setCreatePersonStep('face');
          await loadPersons();
        }
      }
    } catch (error: any) {
      setRegisterMessage(error?.message || `Error al ${editingPerson ? 'actualizar' : 'crear'} la persona.`);
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePerson = async (personId: string) => {
    try {
      const response = await fetch(`/api/employees/${personId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'No se pudo eliminar la persona.');
      }
      await loadPersons();
      setSelectedPersonId(null);
      setShowDeletePersonConfirm(false);
    } catch (error: any) {
      setRegisterMessage(error?.message || 'Error al eliminar la persona.');
    }
  };

  const handleRegisterFaceWithImage = async (descriptor: number[], imageUrl: string) => {
    if (!selectedPerson) {
      setRegisterMessage('Selecciona una persona antes de registrar el rostro.');
      return;
    }

    setRegisterMessage(null);
    const response = await fetch('/api/face/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId: selectedPerson.id, descriptor, imageUrl })
    });
    const data = await response.json();
    if (!response.ok) {
      setRegisterMessage('No se pudo registrar el rostro. Reintentá en unos segundos.');
      return;
    }

    setRegisterMessage(null);
    if (data?.person) {
      setPersons(prev => prev.map(person => (person.id === data.person.id ? data.person : person)));
      setSelectedPersonId(data.person.id);
    }
    setShowRegisterCapture(false);
  };

  const handleRemoveFace = async () => {
    if (!selectedPerson) return;
    const response = await fetch('/api/face/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId: selectedPerson.id })
    });
    if (response.ok) {
    const data = await response.json();
      if (data?.person) {
        setPersons(prev => prev.map(person => (person.id === data.person.id ? data.person : person)));
    }
    }
  };

  const handleVerifyFace = async (descriptor: number[]) => {
    if (lastFailedFaceDescriptor && isSameFace(descriptor, lastFailedFaceDescriptor)) {
      return;
    }

    setVerifyMessage(null);
    const response = await fetch('/api/face/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descriptor })
    });
    const data = await response.json();
    if (!response.ok || !data?.match) {
      setLastFailedFaceDescriptor(descriptor);
      setVerifyMessage('No se encontró una persona coincidente.');
      return;
    }

    setLastFailedFaceDescriptor(null);
    setVerificationResult({
      id: data.person.id,
      email: data.person.email,
      nombre: data.person.nombre,
      empresa: data.person.empresa,
      distance: data.distance,
      confidence: data.confidence
    });
    setVerifyMessage(`Coincidencia encontrada: ${data.person.nombre}`);
  };

  const handleFaceLogin = async (descriptor: number[]) => {
    setAuthMessage(null);
    const response = await fetch('/api/face/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descriptor })
    });
    const data = await response.json();
    if (!response.ok || !data?.match) {
      setAuthMessage('No se encontró una persona coincidente.');
      return;
    }

    const result = await signIn('face', {
      descriptor: JSON.stringify(descriptor),
      redirect: false
    });
    if (result?.error) {
      setAuthMessage('No se pudo iniciar sesión. Verificá que tu cuenta esté activa.');
    }
  };

  const handleUpdatePerson = async (id: string, updates: Partial<Person>) => {
    const response = await fetch(`/api/employees/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (response.ok) {
      const data = await response.json();
      if (data?.person) {
        setPersons(prev => prev.map(person => (person.id === data.person.id ? data.person : person)));
      }
    }
  };

  const loadRfidCards = useCallback(async (personId: string) => {
    try {
      const response = await fetch(`/api/rfid/person/${personId}`, { cache: 'no-store' });
      const data = await response.json();
      setRfidCards(Array.isArray(data.cards) ? data.cards : []);
    } catch {
      setRfidCards([]);
    }
  }, []);

  useEffect(() => {
    if (selectedPerson) {
      loadRfidCards(selectedPerson.id);
    } else {
      setRfidCards([]);
    }
  }, [selectedPerson, loadRfidCards]);

  const handleAssociateRfid = async () => {
    if (!selectedPerson || !rfidUid.trim()) {
      setRfidMessage('Ingresá un UID válido.');
      return;
    }
    setRfidLoading(true);
    setRfidMessage(null);
    try {
      const response = await fetch('/api/rfid/associate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personId: selectedPerson.id, uid: rfidUid.trim() })
    });
    const data = await response.json();
    if (!response.ok) {
        setRfidMessage(data?.error || 'No se pudo asociar la tarjeta.');
      return;
    }
      setRfidUid('');
      await loadRfidCards(selectedPerson.id);
    } catch {
      setRfidMessage('No se pudo asociar la tarjeta.');
    } finally {
      setRfidLoading(false);
    }
  };

  const handleToggleRfid = async (cardId: string, active: boolean) => {
    setRfidLoading(true);
    try {
      const response = await fetch(`/api/rfid/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active })
      });
      if (response.ok && selectedPerson) {
        await loadRfidCards(selectedPerson.id);
      }
    } catch {
      setRfidMessage('No se pudo actualizar la tarjeta.');
    } finally {
      setRfidLoading(false);
    }
  };

  const handleDeleteRfid = async (cardId: string) => {
    if (!selectedPerson) return;
    setRfidLoading(true);
    try {
      const response = await fetch(`/api/rfid/${cardId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (!response.ok || !data?.deleted) {
        setRfidMessage(data?.error || 'No se pudo eliminar la tarjeta.');
        return;
      }
      setRfidDeleteCard(null);
      await loadRfidCards(selectedPerson.id);
    } catch {
      setRfidMessage('No se pudo eliminar la tarjeta.');
    } finally {
      setRfidLoading(false);
    }
  };

  if (effectiveStatus === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (effectiveStatus !== 'authenticated') {
    return (
      <Suspense
        fallback={(
          <div className="min-h-screen bg-white flex items-center justify-center">
            <p className="text-sm text-gray-500">Cargando acceso...</p>
          </div>
        )}
      >
        <LoginGate
          onFaceLogin={handleFaceLogin}
          authMessage={authMessage}
          faceLoginLocked={false}
          setAuthMessage={setAuthMessage}
        />
      </Suspense>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 flex flex-col transition-all duration-200`}>
        {/* Logo/Brand */}
        <div className="h-16 flex items-center px-4 border-b border-gray-200">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold text-sm">A</span>
          </div>
              <div>
                <h1 className="text-sm font-semibold text-gray-900">Accounts</h1>
                <p className="text-xs text-gray-500">Identidad Biométrica</p>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center mx-auto">
              <span className="text-white font-semibold text-sm">A</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              setCurrentView('persons');
              setSelectedPersonId(null);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
              currentView === 'persons'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            {!sidebarCollapsed && <span>Personas</span>}
          </button>
          <button
            type="button"
            onClick={() => {
              setCurrentView('activity');
              setShowActivity(true);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
              currentView === 'activity'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {!sidebarCollapsed && <span>Actividad</span>}
          </button>
          {isAdmin && (
            <Link
              href="/documentacion"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {!sidebarCollapsed && <span>Documentación</span>}
            </Link>
          )}
        </nav>

        {/* User Profile */}
        <div className="border-t border-gray-200 p-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSessionActions(prev => !prev)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition"
            >
              {currentPerson?.faceImageUrl ? (
                <img
                  src={currentPerson.faceImageUrl}
                  alt={effectiveSession?.user?.name || 'Perfil'}
                  className="w-8 h-8 rounded-full flex-shrink-0"
                  style={{ objectFit: 'cover', aspectRatio: '1/1', width: '32px', height: '32px' }}
                />
              ) : effectiveSession?.user?.image ? (
                <img
                  src={effectiveSession.user.image}
                  alt={effectiveSession.user.name || 'Perfil'}
                  className="w-8 h-8 rounded-full flex-shrink-0"
                  style={{ objectFit: 'cover', aspectRatio: '1/1', width: '32px', height: '32px' }}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0" style={{ aspectRatio: '1/1' }}>
                  <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}
              {!sidebarCollapsed && (
                <div className="flex-1 text-left">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {effectiveSession?.user?.name || effectiveSession?.user?.email || 'Usuario'}
                  </p>
                  {isAdmin && (
                    <p className="text-[10px] text-gray-500">Admin</p>
                  )}
                  {isLocalhost && !session && (
                    <p className="text-[10px] text-orange-500">Localhost</p>
                )}
              </div>
              )}
            </button>
            {showSessionActions && (
              <div className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden z-50">
              <button
                type="button"
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setShowSessionActions(false)}
              >
                  Configuración
              </button>
                {isAdmin && (
                  <Link
                    href="/documentacion"
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setShowSessionActions(false)}
                  >
                    Documentación
                  </Link>
                )}
                <div className="border-t border-gray-200" />
              <button
                type="button"
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between"
                  onClick={() => {
                    setShowSessionActions(false);
                    setShowLogoutConfirm(true);
                  }}
                >
                  <span>Salir</span>
                  <span className="text-xs text-gray-400">(S)</span>
              </button>
              </div>
            )}
          </div>
        </div>

        {/* Collapse Button */}
        <div className="border-t border-gray-200 p-2">
              <button
                type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition"
              >
            <svg className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
              </button>
            </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {currentView === 'persons' ? 'Personas' : 'Actividad'}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {currentView === 'persons' 
                ? 'Gestiona las personas registradas en el sistema'
                : 'Historial de eventos de autenticación'}
            </p>
                  </div>
          {currentView === 'persons' && (
                <button
              type="button"
              onClick={() => setShowCreatePerson(prev => !prev)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva persona
                </button>
          )}
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {currentView === 'persons' ? (
            <div className="max-w-6xl mx-auto space-y-6">

              {/* Persons List */}
          {showPersons && (
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="p-4 border-b border-gray-200">
                    <h2 className="text-base font-semibold text-gray-900">Personas registradas</h2>
                  </div>
                  <div className="p-4">
              {loading ? (
                      <p className="text-sm text-gray-500">Cargando personas...</p>
              ) : error ? (
                <p className="text-sm text-red-600">{error}</p>
              ) : persons.length === 0 ? (
                      <p className="text-sm text-gray-500">No hay personas registradas.</p>
              ) : (
                <div className="space-y-2">
                  {persons.slice(0, personsVisibleCount).map(person => (
                    <div
                      key={person.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                              // Si ya está seleccionada, deseleccionar
                              if (selectedPersonId === person.id) {
                                setSelectedPersonId(null);
                              } else {
                        setSelectedPersonId(person.id);
                              }
                        setRegisterMessage(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedPersonId(person.id);
                          setRegisterMessage(null);
                        }
                      }}
                            className={`w-full text-left rounded-lg border px-4 py-3 cursor-pointer transition ${
                        selectedPersonId === person.id
                                ? 'border-gray-900 bg-gray-50'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            } ${person.active ? '' : 'opacity-60'}`}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                            {person.faceImageUrl ? (
                              <img
                                src={person.faceImageUrl}
                                alt={`Rostro de ${person.nombre}`}
                                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                </svg>
                              </div>
                            )}
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900 truncate">{person.nombre}</div>
                                  <div className="text-xs text-gray-500 truncate">{person.empresa}</div>
                                  <div className="text-xs text-gray-400 truncate">{person.email}</div>
                                  {!person.faceDescriptor?.length && (
                                    <div className="text-xs text-gray-400 mt-1">Sin rostro registrado</div>
                                  )}
                            </div>
                          </div>
                              <div className="relative group">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleUpdatePerson(person.id, { active: !person.active });
                            }}
                                  className={`inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-full border flex-shrink-0 cursor-pointer ${
                              person.active
                                      ? 'border-green-200 bg-green-50 text-green-700'
                                      : 'border-gray-300 bg-gray-100 text-gray-500'
                            }`}
                                  title={person.active ? 'Desactivar' : 'Reactivar'}
                          >
                                  <span className={`inline-block h-2 w-2 rounded-full ${person.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                                  {person.active ? 'Activo' : 'Inactivo'}
                          </button>
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                  {person.active ? 'Desactivar' : 'Reactivar'}
                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                    <div className="border-4 border-transparent border-t-gray-900"></div>
                        </div>
                                </div>
                              </div>
                      </div>
                    </div>
                  ))}
                  {personsVisibleCount < persons.length && (
                    <button
                      type="button"
                      onClick={() => setPersonsVisibleCount(prev => Math.min(prev + PERSONS_PAGE_SIZE, persons.length))}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                    >
                      Cargar más
                    </button>
                  )}
                </div>
              )}
                  </div>
          </div>
          )}

              {/* Selected Person Details */}
              {selectedPerson && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Facial Identity */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-semibold text-gray-900">Identidad facial</h2>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${faceMode === 'verify' ? 'text-gray-900' : 'text-gray-400'}`}>
                  Verificar
                </span>
                <button
                  type="button"
                  onClick={() => setFaceMode(faceMode === 'verify' ? 'register' : 'verify')}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                            faceMode === 'register' ? 'bg-gray-900' : 'bg-gray-300'
                  }`}
                >
                  <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                              faceMode === 'register' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                        <span className={`text-xs font-medium ${faceMode === 'register' ? 'text-gray-900' : 'text-gray-400'}`}>
                  Registrar
                </span>
              </div>
            </div>

            {faceMode === 'register' ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                      {selectedPerson.faceImageUrl ? (
                        <img
                          src={selectedPerson.faceImageUrl}
                          alt={`Rostro de ${selectedPerson.nombre}`}
                              className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                        </div>
                      )}
                      <div>
                            <p className="text-sm font-medium text-gray-900">{selectedPerson.nombre}</p>
                            <p className="text-xs text-gray-500">{selectedPerson.email}</p>
                      </div>
                    </div>
                {showRegisterCapture && (
                  <FaceRegistrationPicker
                    onRegister={handleRegisterFaceWithImage}
                    onRemove={handleRemoveFace}
                    hasSavedFace={!!selectedPerson.faceDescriptor}
                  />
                )}
                {registerMessage && (
                          <p className="text-sm text-gray-600">{registerMessage}</p>
                )}
              </div>
            ) : (
                      <div className="space-y-4">
                <FaceRecognitionAutoCapture
                  onDescriptorCaptured={handleVerifyFace}
                  defaultExpanded={false}
                          title=""
                          description=""
                          actionLabel=""
                  noticeLabel="Verificando identidad..."
                  autoCaptureDisabled={!!verificationResult}
                />
                {verifyMessage && (
                          <p className="text-sm text-gray-600">{verifyMessage}</p>
                )}
                {verificationResult && (
                          <div className="relative rounded-lg border border-green-200 bg-green-50 p-4">
                    <button
                      type="button"
                      onClick={() => {
                        setVerificationResult(null);
                        setVerifyMessage(null);
                      }}
                              className="absolute top-2 right-2 h-6 w-6 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center hover:bg-green-200"
                    >
                      ✕
                    </button>
                            <p className="font-medium text-gray-900">{verificationResult.nombre}</p>
                            <p className="text-sm text-gray-600">
                      {verificationResult.email} · {verificationResult.empresa}
                    </p>
                            <p className="text-xs text-gray-500 mt-1">
                      Confianza: {verificationResult.confidence}% (distancia {verificationResult.distance.toFixed(3)})
                    </p>
                  </div>
                )}
              </div>
            )}
                  </div>

                  {/* RFID */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-semibold text-gray-900">RFID</h2>
                      <span className="text-xs text-gray-500">
                        {rfidCards.length} tarjetas
                      </span>
                    </div>
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          value={rfidUid}
                          onChange={(event) => setRfidUid(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              handleAssociateRfid();
                            }
                          }}
                          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent min-w-0"
                          placeholder="UID de tarjeta RFID"
                        />
                        <button
                          type="button"
                          onClick={handleAssociateRfid}
                          disabled={rfidLoading}
                          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap sm:w-auto w-full"
                        >
                          Asociar
                        </button>
                      </div>
                      {rfidMessage && (
                        <p className="text-xs text-gray-600">{rfidMessage}</p>
                      )}
                      <div className="space-y-2">
                        {rfidLoading ? (
                          <p className="text-sm text-gray-500">Cargando tarjetas...</p>
                        ) : rfidCards.length === 0 ? (
                          <p className="text-sm text-gray-500">Sin tarjetas vinculadas.</p>
                        ) : (
                          rfidCards.map(card => (
                            <div
                              key={card.id}
                              className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
                            >
                              <div>
                                <p className="text-sm font-medium text-gray-900">UID {card.uid}</p>
                                <p className="text-xs text-gray-500">
                                  {new Date(card.createdAt).toLocaleDateString('es-AR')}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
              <button
                type="button"
                                  onClick={() => handleToggleRfid(card.id, !card.active)}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                    card.active ? 'bg-gray-900' : 'bg-gray-300'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                                      card.active ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                  />
              </button>
                                {!card.active && (
                                  <button
                                    type="button"
                                    onClick={() => setRfidDeleteCard(card)}
                                    className="text-xs text-red-600 hover:text-red-700 cursor-pointer"
                                  >
                                    Eliminar
                                  </button>
                                )}
            </div>
          </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Opciones */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-base font-semibold text-gray-900 mb-4">Opciones</h2>
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPerson(selectedPerson);
                          setFormData({
                            gmailUser: selectedPerson.email.replace('@gmail.com', ''),
                            nombre: selectedPerson.nombre,
                            empresa: selectedPerson.empresa
                          });
                          setShowCreatePerson(true);
                          setCreatePersonStep('data');
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar datos
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeletePersonConfirm(true)}
                        className="w-full flex items-center gap-3 px-4 py-2 rounded-lg border border-red-300 text-sm font-medium text-red-700 hover:bg-red-50 transition"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Eliminar persona
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleUpdatePerson(selectedPerson.id, { active: !selectedPerson.active });
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg border text-sm font-medium transition ${
                          selectedPerson.active
                            ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50'
                            : 'border-green-300 text-green-700 hover:bg-green-50'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={selectedPerson.active ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
                        </svg>
                        {selectedPerson.active ? 'Suspender acceso' : 'Activar acceso'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!selectedPerson && !showCreatePerson && (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <p className="text-sm text-gray-500">Selecciona una persona para gestionar su identidad</p>
                </div>
              )}
            </div>
          ) : (
            /* Activity View */
            <div className="max-w-6xl mx-auto">
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-900">Histórico de actividad</h2>
                  <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActivityFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        activityFilter === 'all'
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setActivityFilter('success')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        activityFilter === 'success'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                >
                  Exitosos
                </button>
                <button
                  type="button"
                  onClick={() => setActivityFilter('failed')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        activityFilter === 'failed'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                >
                  Fallidos
                </button>
              </div>
                </div>
                <div className="p-4">
              {loginLoading ? (
                    <p className="text-sm text-gray-500">Cargando actividad...</p>
              ) : loginEvents.length === 0 ? (
                    <p className="text-sm text-gray-500">Sin registros todavía.</p>
              ) : (
                <div className="space-y-2">
                  {loginEvents.slice(0, activityVisibleCount).map(event => (
                    <div
                      key={event.id}
                          className="flex items-center justify-between gap-4 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              event.status === 'success'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                            {event.status === 'success' ? 'Éxito' : 'Fallido'}
                          </span>
                            <span className="text-xs text-gray-500 font-mono">{event.provider.toUpperCase()}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {(() => {
                                  const person =
                                    (event.personId && personsById.get(event.personId)) ||
                                    (event.email && personsByEmail.get(event.email.toLowerCase()));
                                  if (person) {
                                    return `${person.nombre} · ${person.empresa}`;
                                  }
                                  return event.email || 'Sin email';
                                })()}
                              </p>
                              <p className="text-xs text-gray-500">
                                {event.ip || 'IP desconocida'} · {(() => {
                                  const safeDecode = (value: string | null) => {
                                    if (!value) return null;
                                    try {
                                      return decodeURIComponent(value.replace(/\+/g, ' '));
                                    } catch {
                                      return value;
                                    }
                                  };
                                  const city = safeDecode(event.city) || 'Ciudad desconocida';
                                  const country = safeDecode(event.country);
                                  return `${city}${country ? ` (${country})` : ''}`;
                                })()}
                        </p>
                      </div>
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
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
                  {activityVisibleCount < loginEvents.length && (
                    <button
                      type="button"
                      onClick={() => setActivityVisibleCount(prev => Math.min(prev + ACTIVITY_PAGE_SIZE, loginEvents.length))}
                          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                    >
                      Cargar más
                    </button>
                  )}
                </div>
              )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Confirmar salida</h3>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="h-8 w-8 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center"
              >
                ✕
              </button>
      </div>
            <p className="text-sm text-gray-600 mb-6">
              ¿Querés cerrar la sesión en Accounts?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => signOut()}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {rfidDeleteCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Eliminar tarjeta RFID</h3>
              <button
                type="button"
                onClick={() => setRfidDeleteCard(null)}
                className="h-8 w-8 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              ¿Querés eliminar la tarjeta UID {rfidDeleteCard.uid}? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRfidDeleteCard(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteRfid(rfidDeleteCard.id)}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Person Modal */}
      {showCreatePerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
              <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{editingPerson ? 'Editar persona' : 'Crear nueva persona'}</h3>
                {!editingPerson && (
                  <p className="text-xs text-gray-500 mt-1">
                    Paso {createPersonStep === 'data' ? '1' : createPersonStep === 'face' ? '2' : '3'} de 3
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreatePerson(false);
                  setCreatePersonStep('data');
                  setNewPersonId(null);
                  setFormData({ gmailUser: '', nombre: '', empresa: '' });
                }}
                className="h-8 w-8 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {createPersonStep === 'data' && (
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleCreatePerson(e); }}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Gmail</label>
                  <div className="flex items-center rounded-lg border border-gray-300 px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-gray-900 focus-within:border-transparent bg-white">
                    <input
                      value={formData.gmailUser}
                      onChange={(event) => {
                        const raw = event.target.value || '';
                        const localPart = raw.replace(/\s+/g, '').replace(/@/g, '').trim();
                        setFormData(prev => ({ ...prev, gmailUser: localPart }));
                      }}
                      className="flex-1 outline-none bg-transparent"
                      type="text"
                      placeholder="usuario"
                    />
                    <span className="text-gray-400">@gmail.com</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre</label>
                  <input
                    value={formData.nombre}
                    onChange={(event) => setFormData(prev => ({ ...prev, nombre: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Empresa</label>
                  <input
                    value={formData.empresa}
                    onChange={(event) => setFormData(prev => ({ ...prev, empresa: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                {registerMessage && (
                  <p className="text-sm text-red-600">{registerMessage}</p>
                )}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreatePerson(false);
                      setCreatePersonStep('data');
                      setFormData({ gmailUser: '', nombre: '', empresa: '' });
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {creating ? (editingPerson ? 'Guardando...' : 'Creando...') : (editingPerson ? 'Guardar' : 'Siguiente')}
                  </button>
                </div>
              </form>
            )}

            {createPersonStep === 'face' && newPersonId && selectedPerson && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">Registrar identidad facial (opcional)</p>
                  <p className="text-xs text-gray-500">Active la cámara para registrar su rostro</p>
                </div>
                <FaceRegistrationPicker
                  onRegister={async (descriptor, imageUrl) => {
                    await handleRegisterFaceWithImage(descriptor, imageUrl);
                    setCreatePersonStep('rfid');
                  }}
                  onRemove={handleRemoveFace}
                  hasSavedFace={!!selectedPerson.faceDescriptor}
                />
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCancelConfirm(true)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreatePersonStep('rfid')}
                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
                  >
                    Omitir
                  </button>
                  {selectedPerson.faceDescriptor && (
                    <button
                      type="button"
                      onClick={() => setCreatePersonStep('rfid')}
                      className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
                    >
                      Siguiente
                    </button>
                  )}
                </div>
              </div>
            )}

            {createPersonStep === 'rfid' && newPersonId && selectedPerson && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Asociar tarjeta RFID (opcional)</p>
                <div className="flex gap-2">
                  <input
                    value={rfidUid}
                    onChange={(event) => setRfidUid(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleAssociateRfid();
                      }
                    }}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="UID de tarjeta RFID"
                  />
                  <button
                    type="button"
                    onClick={handleAssociateRfid}
                    disabled={rfidLoading}
                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Asociar
                  </button>
                </div>
                {rfidMessage && (
                  <p className="text-xs text-gray-600">{rfidMessage}</p>
                )}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreatePerson(false);
                      setCreatePersonStep('data');
                      setNewPersonId(null);
                      setFormData({ gmailUser: '', nombre: '', empresa: '' });
                      setRfidUid('');
                    }}
                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
                  >
                    Finalizar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cancel Confirm Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Confirmar cancelación</h3>
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="h-8 w-8 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              ¿Querés cancelar? Los cambios no guardados se perderán.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
              >
                Continuar editando
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreatePerson(false);
                  setCreatePersonStep('data');
                  setNewPersonId(null);
                  setFormData({ gmailUser: '', nombre: '', empresa: '' });
                  setRfidUid('');
                  setEditingPerson(null);
                  setShowCancelConfirm(false);
                }}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Person Confirm Modal */}
      {showDeletePersonConfirm && selectedPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Eliminar persona</h3>
              <button
                type="button"
                onClick={() => setShowDeletePersonConfirm(false)}
                className="h-8 w-8 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              ¿Querés eliminar a <strong>{selectedPerson.nombre}</strong>? Esta acción no se puede deshacer y se eliminarán todos los datos asociados (identidad facial, tarjetas RFID, etc.).
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeletePersonConfirm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeletePerson(selectedPerson.id)}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirm Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Confirmar cancelación</h3>
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="h-8 w-8 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              ¿Querés cancelar? Los cambios no guardados se perderán.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
              >
                Continuar editando
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreatePerson(false);
                  setCreatePersonStep('data');
                  setNewPersonId(null);
                  setFormData({ gmailUser: '', nombre: '', empresa: '' });
                  setRfidUid('');
                  setEditingPerson(null);
                  setShowCancelConfirm(false);
                }}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Person Confirm Modal */}
      {showDeletePersonConfirm && selectedPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Eliminar persona</h3>
              <button
                type="button"
                onClick={() => setShowDeletePersonConfirm(false)}
                className="h-8 w-8 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              ¿Querés eliminar a <strong>{selectedPerson.nombre}</strong>? Esta acción no se puede deshacer y se eliminarán todos los datos asociados (identidad facial, tarjetas RFID, etc.).
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeletePersonConfirm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeletePerson(selectedPerson.id)}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
