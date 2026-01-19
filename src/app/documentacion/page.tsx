'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';

interface DocumentContent {
  [key: string]: string | null;
}

export default function DocumentacionPage() {
  const { data: session, status } = useSession();
  const [collapsedDocs, setCollapsedDocs] = useState<Set<number>>(new Set());
  const [docContents, setDocContents] = useState<DocumentContent>({});
  const [loadingDocs, setLoadingDocs] = useState<Set<string>>(new Set());

  // Prevenir indexación por buscadores (meta tags adicionales)
  useEffect(() => {
    // Agregar meta tags para prevenir indexación
    const metaRobots = document.querySelector('meta[name="robots"]');
    if (!metaRobots) {
      const meta = document.createElement('meta');
      meta.name = 'robots';
      meta.content = 'noindex, nofollow, noarchive, nosnippet';
      document.head.appendChild(meta);
    }

    const metaGooglebot = document.querySelector('meta[name="googlebot"]');
    if (!metaGooglebot) {
      const meta = document.createElement('meta');
      meta.name = 'googlebot';
      meta.content = 'noindex, nofollow';
      document.head.appendChild(meta);
    }
  }, []);

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

  const loadMarkdownContent = async (fileName: string) => {
    // Si ya está cargado, no volver a cargar
    if (docContents[fileName] !== undefined) {
      return;
    }

    // Si ya está cargando, esperar
    if (loadingDocs.has(fileName)) {
      return;
    }

    setLoadingDocs(prev => new Set(prev).add(fileName));

    try {
      const response = await fetch(`/api/documentacion/${fileName}`);
      if (response.ok) {
        const data = await response.json();
        setDocContents(prev => ({
          ...prev,
          [fileName]: data.content
        }));
      } else {
        setDocContents(prev => ({
          ...prev,
          [fileName]: null
        }));
      }
    } catch (error) {
      console.error('Error loading markdown:', error);
      setDocContents(prev => ({
        ...prev,
        [fileName]: null
      }));
    } finally {
      setLoadingDocs(prev => {
        const next = new Set(prev);
        next.delete(fileName);
        return next;
      });
    }
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
      title: '🤖 Prompt Completo para IA',
      items: [
        {
          title: 'Prompt completo para desarrollar el sistema desde cero',
          description: 'Documento con todas las especificaciones, requerimientos, arquitectura, funcionalidades y mejoras necesarias para que otra IA pueda desarrollar un sistema completo de validación de identidad biométrica similar a Accounts.',
          markdownFile: 'prompt-completo-ia.md',
          details: [
            '📄 Archivo: prompt-completo-ia.md',
            '📋 Contenido completo:',
            '  • Contexto y objetivo del sistema',
            '  • Stack tecnológico requerido',
            '  • Arquitectura de base de datos (SQL completo)',
            '  • Funcionalidades core detalladas',
            '  • APIs requeridas con especificaciones',
            '  • UI/UX requeridos',
            '  • Integración con sistemas externos',
            '  • Mejoras y optimizaciones',
            '  • Variables de entorno',
            '  • Casos de uso específicos',
            '  • Instrucciones de implementación paso a paso',
            '  • Criterios de éxito',
            '  • Puntos críticos a considerar',
            '',
            '🎯 Este prompt está diseñado para:',
            '  • Otra IA que deba desarrollar el sistema desde cero',
            '  • Desarrolladores que necesiten especificaciones completas',
            '  • Proyectos similares que requieran guía detallada',
            '  • Documentación técnica completa del sistema'
          ]
        }
      ]
    },
    {
      title: '📘 Guía Completa de Desarrollo',
      items: [
        {
          title: 'Documento técnico completo para continuar el desarrollo',
          description: 'Guía profesional dirigida a otra IA o desarrollador para entender, continuar y mejorar el sistema Accounts. Incluye objetivo, arquitectura, funcionalidades, integraciones, caso de uso de caja de proveeduría, y guía de producción.',
          markdownFile: 'guia-completa-desarrollo.md',
          details: [
            '📄 Archivo: guia-completa-desarrollo.md',
            '📋 Contenido:',
            '  • Objetivo y visión del producto',
            '  • Contexto y casos de uso',
            '  • Arquitectura técnica completa',
            '  • Funcionalidades implementadas',
            '  • Integración con Remitero y Recibos',
            '  • Caso de uso: Caja de proveeduría del camping',
            '  • Flujo técnico detallado con código',
            '  • Guía de producción (env vars, deploy, seguridad)',
            '  • Roadmap y mejoras pendientes',
            '  • Información para continuación del desarrollo',
            '',
            '🎯 Este documento está diseñado para:',
            '  • Otra IA que deba continuar el proyecto',
            '  • Desarrolladores nuevos en el equipo',
            '  • Documentación profesional para producción',
            '  • Referencia técnica completa del sistema'
          ]
        }
      ]
    },
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
                      {(item.details?.length > 0 || ('markdownFile' in item && item.markdownFile)) && (
                        <button
                          type="button"
                          onClick={() => {
                            toggleDoc(globalIndex);
                            if (!isCollapsed && 'markdownFile' in item && item.markdownFile) {
                              loadMarkdownContent(item.markdownFile);
                            }
                          }}
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
                    {!isCollapsed && (
                      <div className="mt-2 space-y-3 ml-6">
                        {item.details && item.details.length > 0 && (
                          <div className="text-xs text-gray-500 space-y-1">
                            {item.details.map((detail, detailIndex) => (
                              <p key={detailIndex}>{detail}</p>
                            ))}
                          </div>
                        )}
                        {'markdownFile' in item && item.markdownFile && (
                          <div className="mt-4 border-t border-gray-200 pt-4">
                            {loadingDocs.has(item.markdownFile) && (
                              <div className="text-sm text-gray-500 italic">
                                Cargando contenido...
                              </div>
                            )}
                            {docContents[item.markdownFile] === undefined && !loadingDocs.has(item.markdownFile) && (
                              <button
                                type="button"
                                onClick={() => loadMarkdownContent(item.markdownFile!)}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                              >
                                📖 Cargar contenido completo del archivo
                              </button>
                            )}
                            {docContents[item.markdownFile] !== undefined && docContents[item.markdownFile] !== null && (
                              <div className="mt-2">
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                  <pre className="whitespace-pre-wrap font-mono text-xs text-gray-800 overflow-x-auto max-h-[600px] overflow-y-auto">
                                    {docContents[item.markdownFile]}
                                  </pre>
                                </div>
                                <div className="mt-2 text-xs text-gray-500">
                                  📄 Contenido de {item.markdownFile}
                                </div>
                              </div>
                            )}
                            {docContents[item.markdownFile] === null && !loadingDocs.has(item.markdownFile) && (
                              <div className="text-sm text-red-500">
                                ❌ Error al cargar el archivo
                              </div>
                            )}
                          </div>
                        )}
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
