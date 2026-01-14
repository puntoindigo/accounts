'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import FaceRecognitionCapture from '@/components/biometric/FaceRecognitionCapture';

interface Employee {
  id: string;
  legajo: string;
  nombre: string;
  empresa: string;
  faceDescriptor: number[] | null;
  createdAt: string;
  updatedAt: string;
}

interface FaceMatchResult {
  id: string;
  legajo: string;
  nombre: string;
  empresa: string;
  distance: number;
  confidence: number;
}

interface LoginEvent {
  id: string;
  provider: string;
  userId: string;
  name: string;
  email?: string | null;
  timestamp: string;
}

interface AuthConfig {
  allowedGoogleEmails: string[];
  allowedFaceLegajos: string[];
  allowedFaceEmployeeIds: string[];
}

export default function Home() {
  const { data: session, status } = useSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({ legajo: '', nombre: '', empresa: '' });
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<FaceMatchResult | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [faceLoginLocked, setFaceLoginLocked] = useState(false);
  const [loginEvents, setLoginEvents] = useState<LoginEvent[]>([]);
  const [loginLoading, setLoginLoading] = useState(false);
  const [authConfig, setAuthConfig] = useState<AuthConfig>({
    allowedGoogleEmails: [],
    allowedFaceLegajos: [],
    allowedFaceEmployeeIds: []
  });
  const [authConfigSaving, setAuthConfigSaving] = useState(false);
  const [authConfigMessage, setAuthConfigMessage] = useState<string | null>(null);
  const [authConfigForm, setAuthConfigForm] = useState({
    allowedGoogleEmails: '',
    allowedFaceLegajos: '',
    allowedFaceEmployeeIds: ''
  });

  const selectedEmployee = useMemo(
    () => employees.find(emp => emp.id === selectedEmployeeId) || null,
    [employees, selectedEmployeeId]
  );

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/employees', { cache: 'no-store' });
      const data = await response.json();
      setEmployees(Array.isArray(data.employees) ? data.employees : []);
    } catch {
      setError('No se pudieron cargar los empleados.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLoginEvents = useCallback(async () => {
    setLoginLoading(true);
    try {
      const response = await fetch('/api/logins', { cache: 'no-store' });
      const data = await response.json();
      setLoginEvents(Array.isArray(data.events) ? data.events : []);
    } catch {
      setLoginEvents([]);
    } finally {
      setLoginLoading(false);
    }
  }, []);

  const loadAuthConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/auth-config', { cache: 'no-store' });
      const data = await response.json();
      if (response.ok && data?.config) {
        setAuthConfig(data.config as AuthConfig);
        setAuthConfigForm({
          allowedGoogleEmails: (data.config.allowedGoogleEmails || []).join(', '),
          allowedFaceLegajos: (data.config.allowedFaceLegajos || []).join(', '),
          allowedFaceEmployeeIds: (data.config.allowedFaceEmployeeIds || []).join(', ')
        });
      }
    } catch {
      setAuthConfigMessage('No se pudo cargar la configuración de acceso.');
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      loadEmployees();
      loadLoginEvents();
      loadAuthConfig();
    }
  }, [loadEmployees, loadLoginEvents, loadAuthConfig, status]);

  const handleCreateEmployee = async (event: React.FormEvent) => {
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
        throw new Error(data?.error || 'No se pudo crear el empleado.');
      }

      setFormData({ legajo: '', nombre: '', empresa: '' });
      await loadEmployees();
    } catch (error: any) {
      setRegisterMessage(error?.message || 'Error al crear el empleado.');
    } finally {
      setCreating(false);
    }
  };

  const handleRegisterFace = async (descriptor: number[]) => {
    if (!selectedEmployee) {
      setRegisterMessage('Selecciona un empleado antes de registrar el rostro.');
      return;
    }

    setRegisterMessage(null);
    const response = await fetch('/api/face/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: selectedEmployee.id, descriptor })
    });
    const data = await response.json();
    if (!response.ok) {
      setRegisterMessage(data?.error || 'No se pudo registrar el rostro.');
      return;
    }

    setRegisterMessage('Rostro registrado correctamente.');
    await loadEmployees();
  };

  const handleRemoveFace = async () => {
    if (!selectedEmployee) {
      setRegisterMessage('Selecciona un empleado antes de eliminar el descriptor.');
      return;
    }

    setRegisterMessage(null);
    const response = await fetch('/api/face/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: selectedEmployee.id })
    });
    const data = await response.json();
    if (!response.ok) {
      setRegisterMessage(data?.error || 'No se pudo eliminar el descriptor.');
      return;
    }

    setRegisterMessage('Descriptor eliminado correctamente.');
    await loadEmployees();
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
      setVerifyMessage('No se encontró un empleado coincidente.');
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

  const handleSaveAuthConfig = async () => {
    setAuthConfigSaving(true);
    setAuthConfigMessage(null);
    const payload = {
      allowedGoogleEmails: authConfigForm.allowedGoogleEmails
        .split(',')
        .map(value => value.trim().toLowerCase())
        .filter(Boolean),
      allowedFaceLegajos: authConfigForm.allowedFaceLegajos
        .split(',')
        .map(value => value.trim())
        .filter(Boolean),
      allowedFaceEmployeeIds: authConfigForm.allowedFaceEmployeeIds
        .split(',')
        .map(value => value.trim())
        .filter(Boolean)
    };

    try {
      const response = await fetch('/api/auth-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        setAuthConfigMessage(data?.error || 'No se pudo guardar la configuración.');
      } else {
        setAuthConfig(data.config as AuthConfig);
        setAuthConfigMessage('Configuración actualizada.');
      }
    } catch {
      setAuthConfigMessage('No se pudo guardar la configuración.');
    } finally {
      setAuthConfigSaving(false);
    }
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
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center">
        <div className="w-full max-w-3xl mx-auto px-6 py-12 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-semibold">Accounts — Acceso</h1>
            <p className="text-sm text-slate-600">
              Iniciá sesión con Google o reconocimiento facial para acceder.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
              <h2 className="text-lg font-semibold">Cuenta Google</h2>
              <p className="text-sm text-slate-600">
                Solo cuentas autorizadas podrán ingresar.
              </p>
              <button
                type="button"
                className="w-full rounded bg-slate-900 text-white py-2 text-sm"
                onClick={() => signIn('google')}
              >
                Iniciar sesión con Google
              </button>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
              <h2 className="text-lg font-semibold">Reconocimiento facial</h2>
              <FaceRecognitionCapture
                onDescriptorCaptured={handleFaceLogin}
                defaultExpanded={false}
                title="Login biométrico"
                description="Captura tu rostro para iniciar sesión."
                actionLabel="Iniciar sesión"
                autoCaptureOnDetect={true}
                autoCaptureDisabled={faceLoginLocked}
                autoCaptureNoticeLabel="Intentando iniciar sesión..."
              />
            </div>
          </div>

          {authMessage && (
            <p className="text-sm text-red-600 text-center">{authMessage}</p>
          )}
        </div>
      </div>
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
            </p>
            <button
              type="button"
              onClick={() => signOut()}
              className="rounded border border-slate-200 px-3 py-1 text-xs"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        <section className="grid md:grid-cols-2 gap-6">
          <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="text-lg font-semibold">Crear empleado</h2>
            <form className="space-y-3" onSubmit={handleCreateEmployee}>
              <div className="space-y-1">
                <label className="text-sm font-medium">Legajo</label>
                <input
                  value={formData.legajo}
                  onChange={(event) => setFormData(prev => ({ ...prev, legajo: event.target.value }))}
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
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
                {creating ? 'Creando...' : 'Crear empleado'}
              </button>
            </form>
            {registerMessage && (
              <p className="text-sm text-slate-600">{registerMessage}</p>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="text-lg font-semibold">Empleados registrados</h2>
            {loading ? (
              <p className="text-sm text-slate-500">Cargando empleados...</p>
            ) : error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : employees.length === 0 ? (
              <p className="text-sm text-slate-500">No hay empleados registrados.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {employees.map(employee => (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => {
                      setSelectedEmployeeId(employee.id);
                      setRegisterMessage(null);
                    }}
                    className={`w-full text-left rounded border px-3 py-2 text-sm ${
                      selectedEmployeeId === employee.id
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{employee.nombre}</span>
                      <span className="text-xs text-slate-500">{employee.legajo}</span>
                    </div>
                    <div className="text-xs text-slate-500">{employee.empresa}</div>
                    <div className="text-xs text-slate-500">
                      {employee.faceDescriptor?.length ? 'Rostro registrado' : 'Sin rostro registrado'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Registrar rostro del empleado</h2>
            {selectedEmployee ? (
              <div className="space-y-3">
                <div className="rounded border border-slate-200 bg-white p-4 text-sm">
                  <p className="font-medium">{selectedEmployee.nombre}</p>
                  <p className="text-slate-500">
                    {selectedEmployee.legajo} · {selectedEmployee.empresa}
                  </p>
                </div>
                <FaceRecognitionCapture
                  savedDescriptor={selectedEmployee.faceDescriptor}
                  onDescriptorCaptured={handleRegisterFace}
                  onDescriptorRemoved={handleRemoveFace}
                  defaultExpanded={false}
                  title="Registro biométrico"
                  description="Captura el rostro para asociarlo a este empleado."
                  actionLabel="Registrar rostro"
                />
                {registerMessage && (
                  <p className="text-sm text-slate-600">{registerMessage}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Selecciona un empleado para registrar su rostro.
              </p>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Verificar identidad</h2>
            <FaceRecognitionCapture
              onDescriptorCaptured={handleVerifyFace}
              defaultExpanded={false}
              title="Verificación facial"
              description="Captura un rostro y verifica si existe un empleado coincidente."
              actionLabel="Verificar rostro"
            />
            {verifyMessage && (
              <p className="text-sm text-slate-600">{verifyMessage}</p>
            )}
            {verificationResult && (
              <div className="rounded border border-emerald-200 bg-emerald-50 p-4 text-sm">
                <p className="font-medium">{verificationResult.nombre}</p>
                <p className="text-slate-600">
                  {verificationResult.legajo} · {verificationResult.empresa}
                </p>
                <p className="text-slate-600">
                  Confianza: {verificationResult.confidence}% (distancia {verificationResult.distance.toFixed(3)})
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Últimos logins</h2>
            <button
              type="button"
              onClick={loadLoginEvents}
              className="text-xs text-slate-500"
            >
              Actualizar
            </button>
          </div>
          {loginLoading ? (
            <p className="text-sm text-slate-500">Cargando logins...</p>
          ) : loginEvents.length === 0 ? (
            <p className="text-sm text-slate-500">Sin registros todavía.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {loginEvents.map(event => (
                <div
                  key={event.id}
                  className="flex items-center justify-between border border-slate-100 rounded px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{event.name}</p>
                    <p className="text-xs text-slate-500">
                      {event.provider.toUpperCase()} · {event.email || event.userId}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(event.timestamp).toLocaleString('es-AR', {
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

        <section className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Accesos autorizados</h2>
            <span className="text-xs text-slate-500">
              Listas vacías permiten acceso libre
            </span>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Google (emails)</label>
              <textarea
                value={authConfigForm.allowedGoogleEmails}
                onChange={(event) => setAuthConfigForm(prev => ({ ...prev, allowedGoogleEmails: event.target.value }))}
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm min-h-[96px]"
                placeholder="email1@dominio.com, email2@dominio.com"
              />
              <p className="text-xs text-slate-500">
                Separá con coma. Se comparan en minúsculas.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rostro (legajos)</label>
              <textarea
                value={authConfigForm.allowedFaceLegajos}
                onChange={(event) => setAuthConfigForm(prev => ({ ...prev, allowedFaceLegajos: event.target.value }))}
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm min-h-[96px]"
                placeholder="123, 456, 789"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Rostro (IDs internos)</label>
            <textarea
              value={authConfigForm.allowedFaceEmployeeIds}
              onChange={(event) => setAuthConfigForm(prev => ({ ...prev, allowedFaceEmployeeIds: event.target.value }))}
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm min-h-[72px]"
              placeholder="uuid1, uuid2"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveAuthConfig}
              disabled={authConfigSaving}
              className="rounded bg-slate-900 text-white px-4 py-2 text-sm disabled:opacity-60"
            >
              {authConfigSaving ? 'Guardando...' : 'Guardar accesos'}
            </button>
            {authConfigMessage && (
              <span className="text-sm text-slate-600">{authConfigMessage}</span>
            )}
          </div>
          <div className="text-xs text-slate-500">
            Google autorizados: {authConfig.allowedGoogleEmails.length} · Rostro por legajo: {authConfig.allowedFaceLegajos.length} · Rostro por ID: {authConfig.allowedFaceEmployeeIds.length}
          </div>
        </section>
      </div>
    </div>
  );
}
