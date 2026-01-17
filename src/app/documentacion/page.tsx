'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import Layout from '@/components/Layout';

export default function DocumentacionPage() {
  const { data: session, status } = useSession();
  const [collapsedDocs, setCollapsedDocs] = useState<Set<number>>(new Set());

  // Mock session para localhost
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' || 
     window.location.hostname === '::1');
  
  const mockSession = isLocalhost && !session ? {
    user: {
      name: 'Localhost User',
      email: 'localhost@accounts.local',
      image: null
    },
    isAdmin: true
  } : null;

  const effectiveSession = session || mockSession;
  const effectiveStatus = isLocalhost && !session ? 'authenticated' : status;
  const isAdmin = Boolean((effectiveSession as any)?.isAdmin);

  const toggleDoc = (index: number) => {
    setCollapsedDocs(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  if (effectiveStatus === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (effectiveStatus !== 'authenticated' || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Acceso restringido</h1>
          <p className="mt-2 text-sm text-gray-600">
            Esta documentación está disponible solo para administradores.
          </p>
        </div>
      </div>
    );
  }

  const documents = [
    {
      title: 'Puntos a completar (12)',
      items: [
        {
          title: 'Modelo de producto y alcance.',
          description: 'Definir el scope del servicio como reemplazo de login OAuth y validación biométrica.',
          details: [
            'Propuesta: servicio multi-tenant de identidad que ofrece inicio de sesion por Google y/o reconocimiento facial, emite un resultado de autenticacion y consulta permisos en la app cliente antes de finalizar el acceso.',
            'Incluye: configuracion por app, selector de metodos, callback de permisos, registro de eventos y panel de administracion de usuarios/rostros.',
            'Excluye (por ahora): gestion completa de roles dentro de la app cliente y onboarding de usuarios finales fuera del panel principal.'
          ]
        },
        {
          title: 'Flujo de autenticación.',
          description: 'Secuencia completa: Google Account, Face Recognition y fallback.',
          details: [
            'Definir pasos: inicio desde widget, seleccion de metodo, validacion Google (OAuth) o captura facial, y devolucion de token de identidad.',
            'Fallbacks: si falla Face, ofrecer Google; si falla Google, permitir Face (segun politica de la app).',
            'Salida esperada: session valida + resultado de permisos de la app cliente.'
          ]
        },
        {
          title: 'Matriz de permisos.',
          description: 'Cómo se consulta el permiso en la app cliente luego de identificar al usuario.',
          details: [
            'Definir contrato de permisos: roles, scopes o flags por usuario, con versionado por app.',
            'Implementar consulta via callback o API: enviar userId/email + appId y recibir "allow/deny" + atributos de perfil.',
            'Cacheo y expiracion: TTL corto para permisos dinamicos y auditoria de cambios.'
          ]
        },
        {
          title: 'Configuración por app.',
          description: 'Alta de apps, selección de métodos (Google/Face), y whitelist de dominios.',
          details: [
            'Panel para registrar apps con nombre, dominio, entorno y secreto de firma.',
            'Toggle por metodo: habilitar Google, Face o ambos, con reglas de fallback.',
            'Dominios permitidos: whitelist de origenes + callback URLs por ambiente.'
          ]
        },
        {
          title: 'Callback de autorización.',
          description: 'URL de verificación de permisos similar a Google Console (payload, firma y timeout).',
          details: [
            'Definir payload: appId, userId/email, metodo usado, timestamp, nonce y contexto.',
            'Firma HMAC con secreto por app y verificacion en cliente para evitar tampering.',
            'Timeou y reintentos: ventana corta (ej. 3-5s) con fallback a "deny".'
          ]
        },
        {
          title: 'SDK + CDN.',
          description: 'Paquete JS distribuido por CDN con snippet de instalación y versión.',
          details: [
            'SDK embebible con inicializacion sencilla: appId, environment, callbacks.',
            'CDN con versionado semantico y fallback a version estable.',
            'Soporte ESM + UMD para compatibilidad con frameworks y sitios estaticos.'
          ]
        },
        {
          title: 'Snippet de instalación.',
          description: 'Instrucciones tipo Tag Manager para head/body y validación rápida.',
          details: [
            'Script en head para cargar SDK y definir configuracion global.',
            'Script en body para inicializar widget y disparar flujo de login.',
            'Bloque "probar tu sitio": input de URL + status de integracion.'
          ]
        },
        {
          title: 'WordPress plugin.',
          description: 'Definir funcionalidad, configuración y compatibilidad de temas.',
          details: [
            'Plugin con pagina de ajustes: appId, metodo, callback y dominios.',
            'Shortcode o bloque para insertar boton de login en paginas/posts.',
            'Compatibilidad: fallback CSS para temas populares y modo minimal.'
          ]
        },
        {
          title: 'Registro de eventos.',
          description: 'Auditoría de logins, fallos, dispositivos y métricas.',
          details: [
            'Capturar eventos: inicio, exito, fallo, metodo y motivo del fallo.',
            'Metadata: IP, user-agent, geolocalizacion aproximada, appId.',
            'Panel de métricas: tasa de exito, tiempos, conversion por metodo.'
          ]
        },
        {
          title: 'Gestión de identidad.',
          description: 'Alta/baja de usuarios, enrolamiento de rostro y políticas de expiración.',
          details: [
            'ABM de usuarios con estados (activo, suspendido, pendiente).',
            'Enrolamiento facial: captura, reintentos y reemplazo de descriptor.',
            'Politicas: expiracion de sesiones, recaptura facial periodica.'
          ]
        },
        {
          title: 'Seguridad y cumplimiento.',
          description: 'Manejo de datos biométricos, cifrado y retención.',
          details: [
            'Cifrado en transito y en reposo para descriptores faciales y eventos.',
            'Retencion: tiempo de guarda, borrado seguro y trazabilidad de cambios.',
            'Compliance: consentimiento explicito, auditoria y export de datos.'
          ]
        },
        {
          title: 'Entornos y despliegue.',
          description: 'Setup de dev/staging/prod, dominios y llaves por ambiente.',
          details: [
            'Separacion de entornos con llaves y dominios dedicados.',
            'Variables por entorno para Google OAuth, Face y callbacks.',
            'Estrategia de deploy: rollback rapido y versionado de SDK/CDN.'
          ]
        }
      ]
    },
    {
      title: 'Borrador etapa: Registro y vínculo de personas',
      items: [
        {
          title: 'Onboarding guiado.',
          description: 'Paso a paso: datos mínimos, validación de email y aceptación de términos.',
          details: []
        },
        {
          title: 'Registro facial.',
          description: 'Captura inicial, verificación de calidad y guardado del descriptor biométrico.',
          details: []
        },
        {
          title: 'Selección de módulos.',
          description: 'Activar accesos: empleados, recibos, descuentos, nueva empresa en Remitero, remitos y clientes.',
          details: []
        },
        {
          title: 'Identificador único.',
          description: 'Generación del `accountsPersonId` como llave universal de identidad.',
          details: []
        },
        {
          title: 'Vinculación Remitero.',
          description: 'API para asociar `accountsPersonId` con `clienteId` o `empresaId` en Remitero.',
          details: []
        },
        {
          title: 'Validación de vínculo.',
          description: 'Endpoint de consulta: `GET /identity/link?accountsPersonId=...` devuelve asociaciones vigentes.',
          details: []
        },
        {
          title: 'Estados y auditoría.',
          description: 'Estados (pendiente, activo, revocado) + registro de cambios y responsable.',
          details: []
        },
        {
          title: 'Entrega embebible.',
          description: 'Widget de registro integrable similar al login, con callback de éxito y error.',
          details: []
        }
      ]
    }
  ];

  return (
    <Layout currentView="documentacion" headerTitle="Documentación" headerDescription="Documentación técnica del sistema">
      <div className="max-w-4xl mx-auto space-y-6">
        {documents.map((doc, docIndex) => (
          <section key={docIndex} className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{doc.title}</h2>
            <ol className="space-y-3 text-sm text-gray-700 list-decimal pl-5">
              {doc.items.map((item, itemIndex) => {
                const globalIndex = docIndex * 100 + itemIndex;
                const isCollapsed = collapsedDocs.has(globalIndex);
                return (
                  <li key={itemIndex} className="space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <span className="font-semibold">{item.title}</span>
                        <span className="ml-1">{item.description}</span>
                      </div>
                      {item.details.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleDoc(globalIndex)}
                          className="text-gray-400 hover:text-gray-600 transition"
                        >
                          <svg
                            className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {!isCollapsed && item.details.length > 0 && (
                      <div className="mt-2 text-xs text-gray-500 space-y-1 ml-6">
                        {item.details.map((detail, detailIndex) => (
                          <p key={detailIndex}>{detail}</p>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </Layout>
  );
}
