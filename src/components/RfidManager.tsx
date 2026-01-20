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
  
  const keyboardInputRef = useRef<HTMLInputElement>(null);
  const keyboardInputValueRef = useRef<string>('');
  const inputReportListenerRef = useRef<((event: HIDInputReportEvent) => void) | null>(null);
  const lastReadTimeRef = useRef<number>(0);
  const DEBOUNCE_MS = 500;

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
  }, [lastUid, onCardRead, mode, personId]);

  // Manejar eventos de input report
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
      console.error('[RFID] Error procesando input report:', error);
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

      setTimeout(() => {
        if (keyboardInputRef.current) {
          keyboardInputRef.current.focus();
        }
      }, 500);

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
    if (!device || !device.opened) {
      setRfidMessage('El dispositivo no está conectado');
      return;
    }

    const idToWrite = writeId.trim() || generateAutoId();
    
    if (idToWrite.length !== 12 || !/^\d+$/.test(idToWrite)) {
      setRfidMessage('El ID debe tener exactamente 12 dígitos numéricos');
      return;
    }

    setIsWriting(true);
    setRfidMessage('Escribiendo en la tarjeta...');

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
          
          await device.sendReport(reportId, commandBuffer.buffer);
          await new Promise(resolve => setTimeout(resolve, 1000));

          setIsWriting(false);
          setRfidMessage(`✅ Escritura completada. ID escrito: ${idToWrite}`);
          setWriteId('');
          setWriteId(generateAutoId());
        } else {
          setIsWriting(false);
          setRfidMessage('El dispositivo no soporta escritura');
        }
      }
    } catch (error) {
      console.error('[RFID] Error escribiendo:', error);
      setIsWriting(false);
      setRfidMessage('Error al escribir en la tarjeta');
    }
  }, [device, writeId, generateAutoId]);

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
      console.error('Error asociando tarjeta:', error);
      setRfidMessage('Error asociando tarjeta');
    } finally {
      setRfidLoading(false);
    }
  }, [rfidUid, personId, loadRfidCards, onCardAssociated]);

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

      {/* Selector de modo */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setMode('read')}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
            mode === 'read'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Leer
        </button>
        <button
          type="button"
          onClick={() => setMode('write')}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
            mode === 'write'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Escribir
        </button>
      </div>

      {/* Estado de conexión */}
      <div className="mb-4">
        {status === 'disconnected' && (
          <button
            type="button"
            onClick={connectDevice}
            className="w-full px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
          >
            Conectar Dispositivo
          </button>
        )}
        {status === 'connecting' && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
            <span>Conectando...</span>
          </div>
        )}
        {status === 'connected' && (
          <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Conectado</span>
            </div>
            <button
              type="button"
              onClick={disconnectDevice}
              className="text-xs text-green-700 hover:text-green-800"
            >
              Desconectar
            </button>
          </div>
        )}
      </div>

      {/* Modo Leer */}
      {mode === 'read' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              ref={keyboardInputRef}
              value={rfidUid}
              onChange={(e) => {
                const value = e.target.value;
                setRfidUid(value);
                keyboardInputValueRef.current = value;
                if (value.length >= 4) {
                  handleCardRead(value);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && rfidUid.trim()) {
                  handleAssociateRfid();
                }
              }}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent min-w-0"
              placeholder="UID de tarjeta RFID"
            />
            <button
              type="button"
              onClick={() => handleAssociateRfid()}
              disabled={rfidLoading || !rfidUid.trim() || !personId}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap sm:w-auto w-full"
            >
              {rfidLoading ? 'Asociando...' : 'Asociar'}
            </button>
          </div>
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              maxLength={12}
              disabled={isWriting}
            />
            <p className="text-xs text-gray-400 mt-1">
              Si no especificas un ID, se usará el propuesto automáticamente
            </p>
          </div>
          <button
            type="button"
            onClick={writeToCard}
            disabled={isWriting || !device || status !== 'connected'}
            className="w-full px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
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
        <p className={`text-xs mt-2 ${rfidMessage.includes('✅') ? 'text-green-600' : 'text-gray-600'}`}>
          {rfidMessage}
        </p>
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
