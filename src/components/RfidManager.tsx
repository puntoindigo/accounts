'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Type definitions for WebHID API
declare global {
  interface HIDDevice extends EventTarget {
    readonly opened: boolean;
    readonly vendorId: number;
    readonly productId: number;
    readonly productName: string;
    readonly manufacturerName: string;
    readonly collections: HIDCollectionInfo[];

    open(): Promise<void>;
    close(): Promise<void>;
    sendReport(reportId: number, data: ArrayBuffer): Promise<void>;
    sendFeatureReport(reportId: number, data: ArrayBuffer): Promise<void>;
    receiveFeatureReport(reportId: number): Promise<DataView>;
    addEventListener(type: 'inputreport', listener: (event: HIDInputReportEvent) => void): void;
    removeEventListener(type: 'inputreport', listener: (event: HIDInputReportEvent) => void): void;
    addEventListener(type: 'disconnect', listener: () => void): void;
    removeEventListener(type: 'disconnect', listener: () => void): void;
  }

  interface HIDCollectionInfo {
    usage: number;
    usagePage: number;
    inputReports?: HIDReportInfo[];
    outputReports?: HIDReportInfo[];
    featureReports?: HIDReportInfo[];
  }

  interface HIDReportInfo {
    reportId?: number;
    items?: HIDReportItem[];
  }

  interface HIDReportItem {
    usage?: number;
    usagePage?: number;
    reportSize?: number;
    reportCount?: number;
  }

  interface HIDInputReportEvent extends Event {
    readonly device: HIDDevice;
    readonly reportId: number;
    readonly data: DataView;
  }

  interface HIDDeviceRequestOptions {
    filters: HIDDeviceFilter[];
  }

  interface HIDDeviceFilter {
    vendorId?: number;
    productId?: number;
    usagePage?: number;
    usage?: number;
  }

  interface Navigator {
    hid?: {
      requestDevice(options: HIDDeviceRequestOptions): Promise<HIDDevice[]>;
      getDevices(): Promise<HIDDevice[]>;
    };
  }
}

interface RfidCard {
  id: string;
  personId: string;
  uid: string;
  active: boolean;
  createdAt: string;
}

interface RfidManagerProps {
  personId: string | null;
  onCardRead?: (uid: string) => void;
  onCardAssociated?: () => void;
}

// IDs del dispositivo NSCCN Smart Reader
const VENDOR_ID = 0x0416;
const PRODUCT_ID = 0xb030;

export default function RfidManager({ personId, onCardRead, onCardAssociated }: RfidManagerProps) {
  const [mode, setMode] = useState<'read' | 'write'>('read');
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [device, setDevice] = useState<HIDDevice | null>(null);
  const [lastUid, setLastUid] = useState<string>('');
  const [writeId, setWriteId] = useState<string>('');
  const [isWriting, setIsWriting] = useState(false);
  const [readEmpty, setReadEmpty] = useState(false);
  const [rfidUid, setRfidUid] = useState('');
  const [rfidLoading, setRfidLoading] = useState(false);
  const [rfidMessage, setRfidMessage] = useState<string | null>(null);
  const [rfidCards, setRfidCards] = useState<RfidCard[]>([]);
  const [lastReadCard, setLastReadCard] = useState<{ uid: string; timestamp: string } | null>(null);
  const [pollingActive, setPollingActive] = useState(false);
  
  const keyboardInputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPolledTimestampRef = useRef<string>('');
  const keyboardInputValueRef = useRef<string>('');
  const inputReportListenerRef = useRef<((event: HIDInputReportEvent) => void) | null>(null);
  const lastReadTimeRef = useRef<number>(0);
  const lastKeyTimeRef = useRef<number>(0);
  const autoReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const DEBOUNCE_MS = 500;
  const AUTO_READ_DELAY_MS = 150; // Si no hay tecla en 150ms, asumir que terminó de leer

  const isWebHIDAvailable = typeof navigator !== 'undefined' && 'hid' in navigator;

  // Generar ID automático de 12 dígitos
  const generateAutoId = useCallback(() => {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return (timestamp.slice(-9) + random).padStart(12, '0');
  }, []);

  // Cargar tarjetas RFID
  const loadRfidCards = useCallback(async () => {
    if (!personId) return;
    
    try {
      const response = await fetch(`/api/rfid/person/${personId}`);
      const data = await response.json();
      if (data.success) {
        setRfidCards(data.cards || []);
      }
    } catch (error) {
      console.error('Error cargando tarjetas RFID:', error);
    }
  }, [personId]);

  useEffect(() => {
    loadRfidCards();
  }, [loadRfidCards]);

  // Asociar tarjeta
  const handleAssociateRfid = useCallback(async (uid?: string) => {
    const uidToAssociate = uid || rfidUid.trim();
    
    if (!uidToAssociate || !personId) {
      setRfidMessage('UID y persona son requeridos');
      return;
    }

    setRfidLoading(true);
    setRfidMessage(null);

    try {
      const response = await fetch('/api/rfid/associate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personId,
          uid: uidToAssociate
        })
      });

      const data = await response.json();

      if (data.success) {
        setRfidMessage('✅ Tarjeta asociada correctamente');
        setRfidUid('');
        await loadRfidCards();
        if (onCardAssociated) {
          onCardAssociated();
        }
      } else {
        setRfidMessage(data.error || 'Error asociando tarjeta');
      }
    } catch (error) {
      setRfidMessage('Error asociando tarjeta');
    } finally {
      setRfidLoading(false);
    }
  }, [rfidUid, personId, loadRfidCards, onCardAssociated]);

  // Procesar lectura de tarjeta
  const handleCardRead = useCallback((uid: string) => {
    const now = Date.now();
    const normalizedUid = uid.trim().replace(/\s+/g, '').replace(/:/g, '').toUpperCase();

    if (!normalizedUid || normalizedUid.length < 4) {
      return;
    }

    if (normalizedUid === lastUid && (now - lastReadTimeRef.current) < DEBOUNCE_MS) {
      return;
    }

    setLastUid(normalizedUid);
    lastReadTimeRef.current = now;

    if (onCardRead) {
      onCardRead(normalizedUid);
    }

    // Si estamos en modo lectura y hay personId, asociar automáticamente
    if (mode === 'read' && personId) {
      setRfidUid(normalizedUid);
      handleAssociateRfid(normalizedUid);
    }
  }, [lastUid, onCardRead, mode, personId, handleAssociateRfid]);

  // Polling para obtener último UID leído desde el script Node.js
  const pollLastRead = useCallback(async () => {
    try {
      const response = await fetch('/api/rfid/last-read');
      const data = await response.json();
      
      if (data.success && data.card) {
        // Solo procesar si es un UID nuevo (timestamp diferente)
        if (data.card.timestamp !== lastPolledTimestampRef.current) {
          lastPolledTimestampRef.current = data.card.timestamp;
          setLastReadCard(data.card);
          
          // Procesar el UID automáticamente
          if (mode === 'read' && data.card.uid) {
            handleCardRead(data.card.uid);
          }
        }
      }
    } catch (error) {
      // Error silencioso en polling
    }
  }, [mode, handleCardRead]);

  // Iniciar/detener polling cuando está en modo lectura
  useEffect(() => {
    if (mode === 'read' && !pollingActive) {
      setPollingActive(true);
      // Polling cada 1 segundo
      pollingIntervalRef.current = setInterval(pollLastRead, 1000);
    } else if (mode !== 'read' && pollingActive) {
      setPollingActive(false);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [mode, pollingActive, pollLastRead]);

  // Inicializar ID automático cuando cambia a modo escritura
  useEffect(() => {
    if (mode === 'write' && !writeId) {
      setWriteId(generateAutoId());
    }
  }, [mode, writeId, generateAutoId]);

  // Formatear buffer a UID hexadecimal
  const formatUidFromBuffer = useCallback((buffer: DataView, offset: number = 0): string => {
    const bytes: string[] = [];
    const maxBytes = Math.min(buffer.byteLength - offset, 16);
    
    for (let i = offset; i < offset + maxBytes; i++) {
      const byte = buffer.getUint8(i);
      bytes.push(byte.toString(16).padStart(2, '0').toUpperCase());
    }
    
    let trimmedBytes = [...bytes];
    while (trimmedBytes.length > 4 && trimmedBytes[trimmedBytes.length - 1] === '00') {
      trimmedBytes.pop();
    }
    
    if (trimmedBytes.length < 4 && bytes.length >= 4) {
      trimmedBytes = bytes.slice(0, 8);
    }
    
    return trimmedBytes.join('');
  }, []);


  // Manejar eventos de input report (no usado actualmente, pero mantenido por si acaso)
  const handleInputReport = useCallback((event: HIDInputReportEvent) => {
    if (!event.data) return;

    try {
      const buffer = new DataView(event.data.buffer);
      const dataArray = new Uint8Array(event.data.buffer);
      
      let uid = formatUidFromBuffer(buffer, 0);
      
      if (!uid || uid.length < 4) {
        for (let offset = 1; offset <= 3 && offset < buffer.byteLength - 4; offset++) {
          const testUid = formatUidFromBuffer(buffer, offset);
          if (testUid && testUid.length >= 4) {
            uid = testUid;
            break;
          }
        }
      }
      
      if (!uid || uid.length < 4) {
        const allZeros = Array.from(dataArray).every(b => b === 0);
        if (allZeros) {
          setReadEmpty(true);
        }
        return;
      }

      setReadEmpty(false);
      handleCardRead(uid);
    } catch (error) {
      // Error silencioso
    }
  }, [formatUidFromBuffer, handleCardRead]);

  // Conectar dispositivo
  const connectDevice = useCallback(async () => {
    if (!isWebHIDAvailable) {
      setRfidMessage('WebHID no está disponible en este navegador');
      setStatus('error');
      return;
    }

    setStatus('connecting');

    try {
      if (!navigator.hid) {
        throw new Error('WebHID no está disponible en este navegador');
      }

      const devices = await navigator.hid.requestDevice({
        filters: [{ vendorId: VENDOR_ID, productId: PRODUCT_ID }]
      });

      if (devices.length === 0) {
        setRfidMessage('No se seleccionó ningún dispositivo');
        setStatus('disconnected');
        return;
      }

      const selectedDevice = devices[0];

      if (!selectedDevice.opened) {
        await selectedDevice.open();
      }

      if (inputReportListenerRef.current) {
        selectedDevice.removeEventListener('inputreport', inputReportListenerRef.current);
      }

      inputReportListenerRef.current = handleInputReport;
      selectedDevice.addEventListener('inputreport', handleInputReport);
      
      // Intentar enviar comandos de activación
      if (selectedDevice.collections && selectedDevice.collections.length > 0) {
        const collection = selectedDevice.collections[0];
        
        if (collection.outputReports && collection.outputReports.length > 0) {
          for (const outputReport of collection.outputReports) {
            const reportId = outputReport.reportId || 0;
            const activationCommands = [
              new Uint8Array([0x01]),
              new Uint8Array([0x00]),
              new Uint8Array([reportId, 0x01]),
            ];
            
            for (const cmd of activationCommands) {
              try {
                await selectedDevice.sendReport(reportId, cmd.buffer);
              } catch (err) {
                // Ignorar errores
              }
            }
          }
        }
      }

      setDevice(selectedDevice);
      setStatus('connected');
      setRfidMessage(null);
    } catch (error) {
      console.error('Error conectando dispositivo:', error);
      setRfidMessage(`Error conectando: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      setStatus('error');
    }
  }, [isWebHIDAvailable, handleInputReport]);

  // Desconectar dispositivo
  const disconnectDevice = useCallback(async () => {
    if (device) {
      try {
        if (inputReportListenerRef.current) {
          device.removeEventListener('inputreport', inputReportListenerRef.current);
          inputReportListenerRef.current = null;
        }

        if (device.opened) {
          await device.close();
        }

        setDevice(null);
        setStatus('disconnected');
        setLastUid('');
      } catch (error) {
        console.error('Error desconectando dispositivo:', error);
      }
    }
  }, [device]);


  // Escribir en tarjeta
  const writeToCard = useCallback(async () => {
    if (!device || !device.opened || status !== 'connected') {
      setRfidMessage('El dispositivo no está conectado');
      return;
    }

    const idToWrite = writeId.trim() || generateAutoId();
    
    if (idToWrite.length !== 12 || !/^\d+$/.test(idToWrite)) {
      setRfidMessage('El ID debe tener exactamente 12 dígitos numéricos');
      return;
    }

    setIsWriting(true);
    setRfidMessage('⚠️ Asegúrate de tener la tarjeta cerca del lector antes de continuar...');

    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const idBytes: number[] = [];
      for (let i = 0; i < idToWrite.length; i += 2) {
        const twoDigits = idToWrite.slice(i, i + 2);
        idBytes.push(parseInt(twoDigits, 10));
      }

      const writeBuffer = new Uint8Array(idBytes);

      if (device.collections && device.collections.length > 0) {
        const collection = device.collections[0];
        if (collection.outputReports && collection.outputReports.length > 0) {
          const outputReport = collection.outputReports[0];
          const reportId = outputReport.reportId || 0;
          const commandBuffer = new Uint8Array([0x02, ...writeBuffer]);
          
          setRfidMessage('📤 Enviando comando de escritura...');
          
          await device.sendReport(reportId, commandBuffer.buffer);
          
          await new Promise(resolve => setTimeout(resolve, 1500));

          setIsWriting(false);
          setRfidMessage(`⚠️ Comando enviado al dispositivo. ID propuesto: ${idToWrite}\n\n💡 IMPORTANTE: Este mensaje NO confirma que la tarjeta fue escrita.\n\nPara verificar:\n1. Cambia a modo "Leer"\n2. Acerca la tarjeta al lector\n3. Verifica que el UID leído coincida con el ID escrito`);
          setWriteId('');
          setWriteId(generateAutoId());
        } else {
          setIsWriting(false);
          setRfidMessage('El dispositivo no soporta escritura');
        }
      } else {
        setIsWriting(false);
        setRfidMessage('El dispositivo no soporta escritura');
      }
    } catch (error) {
      setIsWriting(false);
      setRfidMessage('❌ Error al enviar comando de escritura. Verifica que la tarjeta esté cerca del lector y que el dispositivo esté conectado.');
    }
  }, [device, writeId, generateAutoId, status]);


  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (device && device.opened) {
        disconnectDevice();
      }
    };
  }, [device, disconnectDevice]);

  if (!isWebHIDAvailable) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">RFID</h2>
          <span className="text-xs text-gray-500">{rfidCards.length} tarjetas</span>
        </div>
        <p className="text-xs text-gray-500">
          WebHID no está disponible. Usa Chrome o Edge.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">RFID</h2>
        <span className="text-xs text-gray-500">{rfidCards.length} tarjetas</span>
      </div>

      {/* Estado de conexión - Toggle con icono */}
      <div className="mb-4">
        <button
          type="button"
          onClick={status === 'connected' ? disconnectDevice : connectDevice}
          disabled={status === 'connecting'}
          className={`w-full flex items-center justify-between p-3 rounded-lg border transition ${
            status === 'connected'
              ? 'bg-green-50 border-green-200'
              : status === 'connecting'
              ? 'bg-gray-50 border-gray-200 cursor-not-allowed'
              : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
              status === 'connected' ? 'bg-green-500' : 'bg-gray-300'
            }`}>
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                  status === 'connected' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </div>
            <span className={`text-sm font-medium ${
              status === 'connected' ? 'text-green-700' : 'text-gray-700'
            }`}>
              {status === 'connected' ? 'Dispositivo conectado' : 
               status === 'connecting' ? 'Conectando...' : 
               'Dispositivo desconectado'}
            </span>
          </div>
          {status === 'connecting' && (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
          )}
          {status === 'connected' && (
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {status === 'disconnected' && (
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </button>
      </div>

      {/* Selector de modo */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setMode('read')}
          disabled={status !== 'connected'}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
            status !== 'connected'
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : mode === 'read'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Leer
        </button>
        <button
          type="button"
          onClick={() => setMode('write')}
          disabled={status !== 'connected'}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
            status !== 'connected'
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : mode === 'write'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Escribir
        </button>
      </div>

      {/* Modo Leer */}
      {mode === 'read' && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800 font-medium mb-2">
              📖 Prueba de Lectura
            </p>
            <p className="text-xs text-blue-700 mb-1">
              Opción 1: Pasa la tarjeta por el lector (si funciona como teclado, desconecta WebHID primero)
            </p>
            <p className="text-xs text-blue-700">
              Opción 2: Ingresa el UID manualmente abajo
            </p>
            {pollingActive && lastReadCard && (
              <p className="text-xs text-green-700 font-medium mt-2">
                ✅ Última lectura: {lastReadCard.uid}
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <label className="block text-xs text-gray-600 mb-1">
              UID de la tarjeta:
            </label>
            <input
              ref={keyboardInputRef}
              type="text"
              value={rfidUid}
              onChange={(e) => {
                const value = e.target.value;
                setRfidUid(value);
                keyboardInputValueRef.current = value;
                
                // Auto-procesar si tiene al menos 4 caracteres y parece un UID
                if (value.length >= 4 && /^[0-9A-Fa-f\s:]+$/.test(value)) {
                  const normalized = value.trim().replace(/\s+/g, '').replace(/:/g, '').toUpperCase();
                  if (normalized.length >= 4) {
                    handleCardRead(normalized);
                  }
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && rfidUid.trim()) {
                  const normalized = rfidUid.trim().replace(/\s+/g, '').replace(/:/g, '').toUpperCase();
                  if (normalized.length >= 4) {
                    handleCardRead(normalized);
                  } else if (normalized && personId) {
                    handleAssociateRfid(normalized);
                  }
                }
              }}
              placeholder="Pasa la tarjeta o ingresa UID aquí (ej: 1234567890AB)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              autoFocus={mode === 'read'}
            />
            <button
              type="button"
              onClick={() => {
                if (rfidUid.trim()) {
                  const normalized = rfidUid.trim().replace(/\s+/g, '').replace(/:/g, '').toUpperCase();
                  if (normalized.length >= 4) {
                    handleCardRead(normalized);
                  }
                }
              }}
              disabled={!rfidUid.trim() || rfidUid.trim().length < 4}
              className="w-full px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Procesar UID
            </button>
          </div>
          
          {rfidUid && rfidUid.length >= 4 && personId && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleAssociateRfid()}
                disabled={rfidLoading}
                className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {rfidLoading ? 'Asociando...' : 'Asociar Tarjeta'}
              </button>
            </div>
          )}
          
          {readEmpty && (
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
              ⚠️ Tarjeta detectada pero no contiene datos
            </div>
          )}
        </div>
      )}

      {/* Modo Escribir */}
      {mode === 'write' && (
        <div className="space-y-4">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-800 font-medium mb-2">
              ✍️ Prueba de Escritura
            </p>
            <p className="text-xs text-green-700">
              1. Conecta el dispositivo (toggle arriba)
            </p>
            <p className="text-xs text-green-700">
              2. Ingresa o usa el ID propuesto
            </p>
            <p className="text-xs text-green-700">
              3. Acerca la tarjeta al lector
            </p>
            <p className="text-xs text-green-700">
              4. Haz clic en "Escribir en Tarjeta"
            </p>
          </div>
          
          <div>
            <label className="block text-xs text-gray-600 mb-2">
              ID a escribir (12 dígitos):
            </label>
            <input
              type="text"
              value={writeId}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 12);
                setWriteId(value);
              }}
              placeholder={generateAutoId()}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
              maxLength={12}
              disabled={isWriting || status !== 'connected'}
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-gray-400">
                ID propuesto: <span className="font-mono">{generateAutoId()}</span>
              </p>
              <button
                type="button"
                onClick={() => setWriteId(generateAutoId())}
                disabled={isWriting || status !== 'connected'}
                className="text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-400"
              >
                Usar ID propuesto
              </button>
            </div>
          </div>
          
          {status !== 'connected' && (
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                ⚠️ Conecta el dispositivo arriba para habilitar la escritura
              </p>
            </div>
          )}
          
          <button
            type="button"
            onClick={writeToCard}
            disabled={isWriting || !device || status !== 'connected'}
            className="w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isWriting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Escribiendo...
              </span>
            ) : (
              'Escribir en Tarjeta'
            )}
          </button>
        </div>
      )}

      {/* Mensajes */}
      {rfidMessage && (
        <div className={`mt-2 p-3 rounded-lg border text-xs whitespace-pre-line ${
          rfidMessage.includes('✅') 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : rfidMessage.includes('⚠️') || rfidMessage.includes('💡')
            ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
            : rfidMessage.includes('❌')
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-gray-50 border-gray-200 text-gray-600'
        }`}>
          {rfidMessage}
        </div>
      )}

      {/* Lista de tarjetas */}
      <div className="mt-4 space-y-2">
        {rfidLoading && rfidCards.length === 0 ? (
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
                  onClick={async () => {
                    const response = await fetch(`/api/rfid/${card.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ active: !card.active })
                    });
                    if (response.ok) {
                      await loadRfidCards();
                    }
                  }}
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
                    onClick={async () => {
                      if (confirm('¿Eliminar esta tarjeta?')) {
                        await fetch(`/api/rfid/${card.id}`, { method: 'DELETE' });
                        await loadRfidCards();
                      }
                    }}
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
  );
}
