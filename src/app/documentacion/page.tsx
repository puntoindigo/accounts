import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function DocumentacionPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = Boolean((session as any)?.isAdmin);

  if (!session || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h1 className="text-2xl font-semibold">Acceso restringido</h1>
          <p className="mt-2 text-sm text-slate-600">
            Esta documentación está disponible solo para administradores.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-12 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Documento de desarrollo</h1>
          <p className="text-sm text-slate-600">
            Temas clave para completar el producto de identidad que pueda reemplazar login
            OAuth e integrarse en apps y sitios (incluyendo WordPress).
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Puntos a completar (12)</h2>
          <ol className="mt-4 space-y-3 text-sm text-slate-700 list-decimal pl-5">
            <li>
              <span className="font-semibold">Modelo de producto y alcance.</span> Definir el scope
              del servicio como reemplazo de login OAuth y validación biométrica.
            </li>
            <li>
              <span className="font-semibold">Flujo de autenticación.</span> Secuencia completa:
              Google Account, Face Recognition y fallback.
            </li>
            <li>
              <span className="font-semibold">Matriz de permisos.</span> Cómo se consulta el permiso
              en la app cliente luego de identificar al usuario.
            </li>
            <li>
              <span className="font-semibold">Configuración por app.</span> Alta de apps, selección
              de métodos (Google/Face), y whitelist de dominios.
            </li>
            <li>
              <span className="font-semibold">Callback de autorización.</span> URL de verificación
              de permisos similar a Google Console (payload, firma y timeout).
            </li>
            <li>
              <span className="font-semibold">SDK + CDN.</span> Paquete JS distribuido por CDN con
              snippet de instalación y versión.
            </li>
            <li>
              <span className="font-semibold">Snippet de instalación.</span> Instrucciones tipo
              Tag Manager para head/body y validación rápida.
            </li>
            <li>
              <span className="font-semibold">WordPress plugin.</span> Definir funcionalidad,
              configuración y compatibilidad de temas.
            </li>
            <li>
              <span className="font-semibold">Registro de eventos.</span> Auditoría de logins,
              fallos, dispositivos y métricas.
            </li>
            <li>
              <span className="font-semibold">Gestión de identidad.</span> Alta/baja de usuarios,
              enrolamiento de rostro y políticas de expiración.
            </li>
            <li>
              <span className="font-semibold">Seguridad y cumplimiento.</span> Manejo de datos
              biométricos, cifrado y retención.
            </li>
            <li>
              <span className="font-semibold">Entornos y despliegue.</span> Setup de dev/staging/prod,
              dominios y llaves por ambiente.
            </li>
          </ol>
        </section>
      </div>
    </div>
  );
}
