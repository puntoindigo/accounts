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
              <div className="mt-2 text-xs text-slate-500 space-y-1">
                <p>
                  Propuesta: servicio multi-tenant de identidad que ofrece inicio de sesion por
                  Google y/o reconocimiento facial, emite un resultado de autenticacion y consulta
                  permisos en la app cliente antes de finalizar el acceso.
                </p>
                <p>
                  Incluye: configuracion por app, selector de metodos, callback de permisos,
                  registro de eventos y panel de administracion de usuarios/rostros.
                </p>
                <p>
                  Excluye (por ahora): gestion completa de roles dentro de la app cliente y
                  onboarding de usuarios finales fuera del panel principal.
                </p>
              </div>
            </li>
            <li>
              <span className="font-semibold">Flujo de autenticación.</span> Secuencia completa:
              Google Account, Face Recognition y fallback.
              <div className="mt-2 text-xs text-slate-500 space-y-1">
                <p>
                  Definir pasos: inicio desde widget, seleccion de metodo, validacion Google
                  (OAuth) o captura facial, y devolucion de token de identidad.
                </p>
                <p>
                  Fallbacks: si falla Face, ofrecer Google; si falla Google, permitir Face
                  (segun politica de la app).
                </p>
                <p>
                  Salida esperada: session valida + resultado de permisos de la app cliente.
                </p>
              </div>
            </li>
            <li>
              <span className="font-semibold">Matriz de permisos.</span> Cómo se consulta el permiso
              en la app cliente luego de identificar al usuario.
              <div className="mt-2 text-xs text-slate-500 space-y-1">
                <p>
                  Definir contrato de permisos: roles, scopes o flags por usuario, con versionado
                  por app.
                </p>
                <p>
                  Implementar consulta via callback o API: enviar userId/email + appId y recibir
                  "allow/deny" + atributos de perfil.
                </p>
                <p>
                  Cacheo y expiracion: TTL corto para permisos dinamicos y auditoria de cambios.
                </p>
              </div>
            </li>
            <li>
              <span className="font-semibold">Configuración por app.</span> Alta de apps, selección
              de métodos (Google/Face), y whitelist de dominios.
              <div className="mt-2 text-xs text-slate-500 space-y-1">
                <p>
                  Panel para registrar apps con nombre, dominio, entorno y secreto de firma.
                </p>
                <p>
                  Toggle por metodo: habilitar Google, Face o ambos, con reglas de fallback.
                </p>
                <p>
                  Dominios permitidos: whitelist de origenes + callback URLs por ambiente.
                </p>
              </div>
            </li>
            <li>
              <span className="font-semibold">Callback de autorización.</span> URL de verificación
              de permisos similar a Google Console (payload, firma y timeout).
              <div className="mt-2 text-xs text-slate-500 space-y-1">
                <p>
                  Definir payload: appId, userId/email, metodo usado, timestamp, nonce y contexto.
                </p>
                <p>
                  Firma HMAC con secreto por app y verificacion en cliente para evitar tampering.
                </p>
                <p>
                  Timeout y reintentos: ventana corta (ej. 3-5s) con fallback a "deny".
                </p>
              </div>
            </li>
            <li>
              <span className="font-semibold">SDK + CDN.</span> Paquete JS distribuido por CDN con
              snippet de instalación y versión.
              <div className="mt-2 text-xs text-slate-500 space-y-1">
                <p>
                  SDK embebible con inicializacion sencilla: appId, environment, callbacks.
                </p>
                <p>
                  CDN con versionado semantico y fallback a version estable.
                </p>
                <p>
                  Soporte ESM + UMD para compatibilidad con frameworks y sitios estaticos.
                </p>
              </div>
            </li>
            <li>
              <span className="font-semibold">Snippet de instalación.</span> Instrucciones tipo
              Tag Manager para head/body y validación rápida.
              <div className="mt-2 text-xs text-slate-500 space-y-1">
                <p>
                  Script en head para cargar SDK y definir configuracion global.
                </p>
                <p>
                  Script en body para inicializar widget y disparar flujo de login.
                </p>
                <p>
                  Bloque "probar tu sitio": input de URL + status de integracion.
                </p>
              </div>
            </li>
            <li>
              <span className="font-semibold">WordPress plugin.</span> Definir funcionalidad,
              configuración y compatibilidad de temas.
              <div className="mt-2 text-xs text-slate-500 space-y-1">
                <p>
                  Plugin con pagina de ajustes: appId, metodo, callback y dominios.
                </p>
                <p>
                  Shortcode o bloque para insertar boton de login en paginas/posts.
                </p>
                <p>
                  Compatibilidad: fallback CSS para temas populares y modo minimal.
                </p>
              </div>
            </li>
            <li>
              <span className="font-semibold">Registro de eventos.</span> Auditoría de logins,
              fallos, dispositivos y métricas.
              <div className="mt-2 text-xs text-slate-500 space-y-1">
                <p>
                  Capturar eventos: inicio, exito, fallo, metodo y motivo del fallo.
                </p>
                <p>
                  Metadata: IP, user-agent, geolocalizacion aproximada, appId.
                </p>
                <p>
                  Panel de métricas: tasa de exito, tiempos, conversion por metodo.
                </p>
              </div>
            </li>
            <li>
              <span className="font-semibold">Gestión de identidad.</span> Alta/baja de usuarios,
              enrolamiento de rostro y políticas de expiración.
              <div className="mt-2 text-xs text-slate-500 space-y-1">
                <p>
                  ABM de usuarios con estados (activo, suspendido, pendiente).
                </p>
                <p>
                  Enrolamiento facial: captura, reintentos y reemplazo de descriptor.
                </p>
                <p>
                  Politicas: expiracion de sesiones, recaptura facial periodica.
                </p>
              </div>
            </li>
            <li>
              <span className="font-semibold">Seguridad y cumplimiento.</span> Manejo de datos
              biométricos, cifrado y retención.
              <div className="mt-2 text-xs text-slate-500 space-y-1">
                <p>
                  Cifrado en transito y en reposo para descriptores faciales y eventos.
                </p>
                <p>
                  Retencion: tiempo de guarda, borrado seguro y trazabilidad de cambios.
                </p>
                <p>
                  Compliance: consentimiento explicito, auditoria y export de datos.
                </p>
              </div>
            </li>
            <li>
              <span className="font-semibold">Entornos y despliegue.</span> Setup de dev/staging/prod,
              dominios y llaves por ambiente.
              <div className="mt-2 text-xs text-slate-500 space-y-1">
                <p>
                  Separacion de entornos con llaves y dominios dedicados.
                </p>
                <p>
                  Variables por entorno para Google OAuth, Face y callbacks.
                </p>
                <p>
                  Estrategia de deploy: rollback rapido y versionado de SDK/CDN.
                </p>
              </div>
            </li>
          </ol>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Borrador etapa: Registro y vínculo de personas</h2>
          <p className="mt-2 text-sm text-slate-600">
            Esquema base para habilitar registro de personas sin cuenta y su vínculo con clientes
            en Remitero.
          </p>
          <ol className="mt-4 space-y-3 text-sm text-slate-700 list-decimal pl-5">
            <li>
              <span className="font-semibold">Onboarding guiado.</span> Paso a paso: datos mínimos,
              validación de email y aceptación de términos.
            </li>
            <li>
              <span className="font-semibold">Registro facial.</span> Captura inicial, verificación
              de calidad y guardado del descriptor biométrico.
            </li>
            <li>
              <span className="font-semibold">Selección de módulos.</span> Activar accesos:
              empleados, recibos, descuentos, nueva empresa en Remitero, remitos y clientes.
            </li>
            <li>
              <span className="font-semibold">Identificador único.</span> Generación del
              `accountsPersonId` como llave universal de identidad.
            </li>
            <li>
              <span className="font-semibold">Vinculación Remitero.</span> API para asociar
              `accountsPersonId` con `clienteId` o `empresaId` en Remitero.
            </li>
            <li>
              <span className="font-semibold">Validación de vínculo.</span> Endpoint de consulta:
              `GET /identity/link?accountsPersonId=...` devuelve asociaciones vigentes.
            </li>
            <li>
              <span className="font-semibold">Estados y auditoría.</span> Estados (pendiente,
              activo, revocado) + registro de cambios y responsable.
            </li>
            <li>
              <span className="font-semibold">Entrega embebible.</span> Widget de registro
              integrable similar al login, con callback de éxito y error.
            </li>
          </ol>
        </section>
      </div>
    </div>
  );
}
