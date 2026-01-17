'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';

interface LayoutProps {
  children: React.ReactNode;
  currentView?: 'persons' | 'activity' | 'documentacion';
  headerTitle?: string;
  headerDescription?: string;
  headerAction?: React.ReactNode;
}

export default function Layout({
  children,
  currentView = 'persons',
  headerTitle,
  headerDescription,
  headerAction
}: LayoutProps) {
  const { data: session } = useSession();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSessionActions, setShowSessionActions] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
  const isAdmin = Boolean((effectiveSession as any)?.isAdmin);

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
          <Link
            href="/"
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
          </Link>
          <Link
            href="/?view=activity"
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
          </Link>
          {isAdmin && (
            <Link
              href="/documentacion"
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                currentView === 'documentacion'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
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
              {effectiveSession?.user?.image ? (
                <img
                  src={effectiveSession.user.image}
                  alt={effectiveSession.user.name || 'Perfil'}
                  className="w-8 h-8 rounded-full flex-shrink-0"
                  style={{ objectFit: 'cover', aspectRatio: '1/1', width: '32px', height: '32px', minWidth: '32px', minHeight: '32px' }}
                />
              ) : (
                <div className={`${sidebarCollapsed ? 'w-8 h-8' : 'w-8 h-8'} rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0`}>
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
              {headerTitle || (currentView === 'persons' ? 'Personas' : currentView === 'activity' ? 'Actividad' : 'Documentación')}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {headerDescription || 
                (currentView === 'persons' 
                  ? 'Gestiona las personas registradas en el sistema'
                  : currentView === 'activity'
                  ? 'Historial de eventos de autenticación'
                  : 'Documentación técnica del sistema')}
            </p>
          </div>
          {headerAction}
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* Logout Modal */}
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
    </div>
  );
}
