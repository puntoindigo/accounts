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
  const [isReading, setIsReading] = useState(false);
  const [readEmpty, setReadEmpty] = useState(false);
  const [rfidUid, setRfidUid] = useState('');
  const [rfidLoading, setRfidLoading] = useState(false);
  const [rfidMessage, setRfidMessage] = useState<string | null>(null);
  const [rfidCards, setRfidCards] = useState<RfidCard[]>([]);
  
  const keyboardInputRef = useRef<HTMLInputElement>(null);
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
    console.log('[RFID] handleCardRead llamado con UID:', uid);
    const now = Date.now();
    const normalizedUid = uid.trim().replace(/\s+/g, '').replace(/:/g, '').toUpperCase();

    if (!normalizedUid || normalizedUid.length < 4) {
      console.warn('[RFID] UID inválido después de normalización:', normalizedUid);
      return;
    }

    if (normalizedUid === lastUid && (now - lastReadTimeRef.current) < DEBOUNCE_MS) {
      console.log('[RFID] Lectura ignorada (debounce):', normalizedUid);
      return;
    }

    console.log('[RFID] Nueva lectura de tarjeta:', {
      uid: normalizedUid,
      mode,
      personId: personId ? 'presente' : 'ausente'
    });

    setLastUid(normalizedUid);
    lastReadTimeRef.current = now;

    if (onCardRead) {
      console.log('[RFID] Llamando onCardRead callback');
      onCardRead(normalizedUid);
    }

    // Si estamos en modo lectura y hay personId, asociar automáticamente
    if (mode === 'read' && personId) {
      console.log('[RFID] Asociando tarjeta automáticamente');
      setRfidUid(normalizedUid);
      handleAssociateRfid(normalizedUid);
    } else {
      console.log('[RFID] No se asocia automáticamente. Mode:', mode, 'personId:', personId ? 'presente' : 'ausente');
    }
  }, [lastUid, onCardRead, mode, personId]);

  // Manejar eventos de input report
  const handleInputReport = useCallback((event: HIDInputReportEvent) => {
    console.log('[RFID] ⚡⚡⚡ INPUT REPORT RECIBIDO ⚡⚡⚡', {
      reportId: event.reportId,
      dataLength: event.data?.byteLength,
      device: event.device?.productName,
      timestamp: new Date().toISOString()
    });

    if (!event.data) {
      console.warn('[RFID] Input report sin datos');
      return;
    }

    try {
      const buffer = new DataView(event.data.buffer);
      const dataArray = new Uint8Array(event.data.buffer);
      
      // Log datos raw
      console.log('[RFID] Datos raw:', Array.from(dataArray).map(b => '0x' + b.toString(16).padStart(2, '0').toUpperCase()).join(' '));
      
      let uid = formatUidFromBuffer(buffer, 0);
      console.log('[RFID] UID extraído (offset 0):', uid);
      
      if (!uid || uid.length < 4) {
        for (let offset = 1; offset <= 3 && offset < buffer.byteLength - 4; offset++) {
          const testUid = formatUidFromBuffer(buffer, offset);
          if (testUid && testUid.length >= 4) {
            uid = testUid;
            console.log('[RFID] UID encontrado en offset', offset, ':', uid);
            break;
          }
        }
      }
      
      if (!uid || uid.length < 4) {
        const allZeros = Array.from(dataArray).every(b => b === 0);
        if (allZeros) {
          console.log('[RFID] Tarjeta detectada pero sin datos (todos ceros)');
          setReadEmpty(true);
        } else {
          console.warn('[RFID] No se pudo extraer UID válido. Datos:', Array.from(dataArray));
        }
        return;
      }

      console.log('[RFID] UID válido detectado:', uid);
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
      console.log('[RFID] Dispositivo seleccionado:', {
        productName: selectedDevice.productName,
        vendorId: '0x' + selectedDevice.vendorId.toString(16),
        productId: '0x' + selectedDevice.productId.toString(16),
        opened: selectedDevice.opened,
        collections: selectedDevice.collections?.length || 0
      });

      if (!selectedDevice.opened) {
        console.log('[RFID] Abriendo dispositivo...');
        await selectedDevice.open();
        console.log('[RFID] Dispositivo abierto');
      }

      if (inputReportListenerRef.current) {
        selectedDevice.removeEventListener('inputreport', inputReportListenerRef.current);
      }

      inputReportListenerRef.current = handleInputReport;
      selectedDevice.addEventListener('inputreport', handleInputReport);
      console.log('[RFID] Listener de input report registrado');
      
      // También escuchar eventos de desconexión para debug
      selectedDevice.addEventListener('disconnect', () => {
        console.log('[RFID] ⚠️ Dispositivo desconectado inesperadamente');
      });
      
      // Intentar recibir feature reports para ver si hay datos ahí
      if (selectedDevice.collections && selectedDevice.collections.length > 0) {
        const collection = selectedDevice.collections[0];
        if (collection.featureReports && collection.featureReports.length > 0) {
          console.log('[RFID] Intentando recibir feature reports...');
          for (const report of collection.featureReports) {
            const reportId = report.reportId || 0;
            selectedDevice.receiveFeatureReport(reportId).then((data) => {
              console.log('[RFID] Feature report recibido:', Array.from(new Uint8Array(data.buffer)).map(b => '0x' + b.toString(16).padStart(2, '0').toUpperCase()).join(' '));
            }).catch((err) => {
              // Ignorar errores, es normal que no haya feature reports disponibles
            });
          }
        }
      }

      // Intentar enviar comandos de activación
      if (selectedDevice.collections && selectedDevice.collections.length > 0) {
        const collection = selectedDevice.collections[0];
        console.log('[RFID] Collection encontrada:', {
          usage: collection.usage,
          usagePage: collection.usagePage,
          inputReports: collection.inputReports?.length || 0,
          outputReports: collection.outputReports?.length || 0
        });
        
        if (collection.outputReports && collection.outputReports.length > 0) {
          for (const outputReport of collection.outputReports) {
            const reportId = outputReport.reportId || 0;
            console.log('[RFID] Enviando comandos de activación con reportId:', reportId);
            const activationCommands = [
              new Uint8Array([0x01]),
              new Uint8Array([0x00]),
              new Uint8Array([reportId, 0x01]),
            ];
            
            for (let i = 0; i < activationCommands.length; i++) {
              const cmd = activationCommands[i];
              try {
                console.log('[RFID] Enviando comando de activación', i + 1, ':', Array.from(cmd).map(b => '0x' + b.toString(16).padStart(2, '0').toUpperCase()).join(' '));
                await selectedDevice.sendReport(reportId, cmd.buffer);
                console.log('[RFID] Comando de activación', i + 1, 'enviado exitosamente');
              } catch (err) {
                console.warn('[RFID] Error enviando comando de activación', i + 1, ':', err);
              }
            }
          }
        } else {
          console.warn('[RFID] No se encontraron output reports para activación');
        }
      } else {
        console.warn('[RFID] No se encontraron collections en el dispositivo');
      }

      // IMPORTANTE: El dispositivo podría funcionar como teclado SOLO cuando NO está conectado vía WebHID
      // Por eso enfocamos el input siempre, incluso si no está conectado vía WebHID
      setTimeout(() => {
        if (keyboardInputRef.current) {
          keyboardInputRef.current.focus();
          console.log('[RFID] Input enfocado - listo para capturar datos del teclado');
          console.log('[RFID] NOTA: Si el dispositivo funciona como teclado, puede que necesite estar DESCONECTADO de WebHID');
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

  // Trigger lectura manual
  const triggerRead = useCallback(async () => {
    if (!device || !device.opened || status !== 'connected') {
      setRfidMessage('El dispositivo no está conectado');
      return;
    }

    setIsReading(true);
    setRfidMessage('📖 Enviando comando de lectura...');
    setReadEmpty(false);

    try {
      if (device.collections && device.collections.length > 0) {
        const collection = device.collections[0];
        if (collection.outputReports && collection.outputReports.length > 0) {
          const outputReport = collection.outputReports[0];
          const reportId = outputReport.reportId || 0;
          
          // Probar diferentes comandos de lectura
          // Algunos dispositivos requieren comandos específicos para activar lectura continua
          const readCommands = [
            new Uint8Array([0x03]), // Comando de lectura común
            new Uint8Array([0x04]), // Alternativa
            new Uint8Array([reportId, 0x03]), // Con reportId
            new Uint8Array([0x01]), // Re-activación
            new Uint8Array([0x05]), // Otro comando común
            new Uint8Array([0x06]), // Otro comando común
            new Uint8Array([0xFF]), // Comando de reset/activación
            new Uint8Array([0x02, 0x00]), // Comando de lectura con parámetro
            new Uint8Array([0x03, 0x01]), // Comando de lectura con flag
          ];
          
          console.log('[RFID] Enviando comandos de lectura con reportId:', reportId);
          
          for (let i = 0; i < readCommands.length; i++) {
            const cmd = readCommands[i];
            try {
              console.log('[RFID] Enviando comando de lectura', i + 1, ':', Array.from(cmd).map(b => '0x' + b.toString(16).padStart(2, '0').toUpperCase()).join(' '));
              await device.sendReport(reportId, cmd.buffer);
              console.log('[RFID] Comando de lectura', i + 1, 'enviado exitosamente');
              // Pequeña pausa entre comandos
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (err) {
              console.warn('[RFID] Error enviando comando de lectura', i + 1, ':', err);
            }
          }
          
          setRfidMessage('📖 Comando de lectura enviado. Acerca la tarjeta al lector ahora...');
          
          // Esperar más tiempo para recibir respuesta y dar tiempo al usuario
          console.log('[RFID] Esperando respuesta del dispositivo... (5 segundos)');
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          setIsReading(false);
          
          if (!lastUid) {
            setRfidMessage('⚠️ No se detectó ninguna tarjeta después de enviar comandos.\n\n💡 Prueba:\n1. Desconecta el dispositivo de WebHID\n2. Pasa la tarjeta directamente (funcionará como teclado)\n3. O verifica que la tarjeta esté cerca del lector');
            console.warn('[RFID] No se recibió ningún input report después de enviar comandos de lectura');
          } else {
            setRfidMessage(`✅ Tarjeta detectada: ${lastUid}`);
          }
        } else {
          setIsReading(false);
          setRfidMessage('El dispositivo no soporta lectura');
        }
      } else {
        setIsReading(false);
        setRfidMessage('Error: No se encontraron collections para lectura');
      }
    } catch (error) {
      console.error('[RFID] Error en lectura:', error);
      setIsReading(false);
      setRfidMessage('❌ Error al enviar comando de lectura');
    }
  }, [device, status, lastUid]);

  // Escribir en tarjeta
  const writeToCard = useCallback(async () => {
    console.log('[RFID] writeToCard llamado');
    
    if (!device || !device.opened || status !== 'connected') {
      console.warn('[RFID] Intento de escritura con dispositivo desconectado');
      setRfidMessage('El dispositivo no está conectado');
      return;
    }

    const idToWrite = writeId.trim() || generateAutoId();
    console.log('[RFID] ID a escribir:', idToWrite);
    
    if (idToWrite.length !== 12 || !/^\d+$/.test(idToWrite)) {
      console.warn('[RFID] ID inválido:', idToWrite);
      setRfidMessage('El ID debe tener exactamente 12 dígitos numéricos');
      return;
    }

    setIsWriting(true);
    setRfidMessage('⚠️ Asegúrate de tener la tarjeta cerca del lector antes de continuar...');

    // Pequeña pausa para que el usuario lea el mensaje
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const idBytes: number[] = [];
      for (let i = 0; i < idToWrite.length; i += 2) {
        const twoDigits = idToWrite.slice(i, i + 2);
        idBytes.push(parseInt(twoDigits, 10));
      }

      const writeBuffer = new Uint8Array(idBytes);
      console.log('[RFID] Bytes a escribir:', Array.from(writeBuffer));

      if (device.collections && device.collections.length > 0) {
        const collection = device.collections[0];
        if (collection.outputReports && collection.outputReports.length > 0) {
          const outputReport = collection.outputReports[0];
          const reportId = outputReport.reportId || 0;
          const commandBuffer = new Uint8Array([0x02, ...writeBuffer]);
          
          console.log('[RFID] Enviando comando de escritura:', {
            reportId,
            command: Array.from(commandBuffer).map(b => '0x' + b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
          });
          
          setRfidMessage('📤 Enviando comando de escritura...');
          
          // Enviar comando de escritura
          await device.sendReport(reportId, commandBuffer.buffer);
          console.log('[RFID] Comando de escritura enviado exitosamente');
          
          // Esperar un momento para que el dispositivo procese el comando
          await new Promise(resolve => setTimeout(resolve, 1500));

          setIsWriting(false);
          setRfidMessage(`⚠️ Comando enviado al dispositivo. ID propuesto: ${idToWrite}\n\n💡 IMPORTANTE: Este mensaje NO confirma que la tarjeta fue escrita.\n\nPara verificar:\n1. Cambia a modo "Leer"\n2. Acerca la tarjeta al lector\n3. Verifica que el UID leído coincida con el ID escrito`);
          setWriteId('');
          setWriteId(generateAutoId());
        } else {
          console.warn('[RFID] No se encontraron output reports para escritura');
          setIsWriting(false);
          setRfidMessage('El dispositivo no soporta escritura');
        }
      } else {
        console.warn('[RFID] No se encontraron collections para escritura');
        setIsWriting(false);
        setRfidMessage('El dispositivo no soporta escritura');
      }
    } catch (error) {
      console.error('[RFID] Error escribiendo:', error);
      setIsWriting(false);
      setRfidMessage('❌ Error al enviar comando de escritura. Verifica que la tarjeta esté cerca del lector y que el dispositivo esté conectado.');
    }
  }, [device, writeId, generateAutoId, status]);

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

      {/* Estado de conexión - Toggle con icono */}
      <div className="mb-4">
        <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800 mb-1">
            💡 <strong>Importante:</strong> Si el dispositivo funciona como teclado, puede que necesite estar <strong>desconectado</strong> de WebHID para leer tarjetas.
          </p>
          <p className="text-xs text-blue-700">
            Usa WebHID solo para escribir. Para leer, desconecta y pasa la tarjeta.
          </p>
        </div>
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
          <button
            type="button"
            onClick={triggerRead}
            disabled={isReading || !device || status !== 'connected'}
            className="w-full px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isReading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Leyendo...
              </span>
            ) : (
              'Leer Tarjeta'
            )}
          </button>
          
          <div className="space-y-2">
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800 font-medium mb-1">
                🔍 Modo de Lectura
              </p>
              <p className="text-xs text-yellow-700">
                Si el dispositivo funciona como teclado, <strong>desconéctalo de WebHID</strong> primero, luego pasa la tarjeta y el UID aparecerá automáticamente aquí.
              </p>
            </div>
            <input
              ref={keyboardInputRef}
              type="text"
              autoFocus={mode === 'read' && status !== 'connected'}
              placeholder={status === 'connected' ? "Desconecta WebHID primero, luego pasa la tarjeta..." : "Pasa la tarjeta por el lector (el UID aparecerá aquí)...")
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              onInput={(e) => {
                const target = e.target as HTMLInputElement;
                const value = target.value;
                console.log('[RFID] Input de teclado detectado (onInput):', value);
                
                if (value && value !== keyboardInputValueRef.current) {
                  keyboardInputValueRef.current = value;
                  setRfidUid(value);
                  setReadEmpty(false);
                  
                  // Si el valor parece un UID (más de 4 caracteres), procesarlo
                  if (value.length >= 4) {
                    console.log('[RFID] Procesando UID desde teclado:', value);
                    handleCardRead(value);
                    // Limpiar después de un momento
                    setTimeout(() => {
                      if (keyboardInputRef.current) {
                        keyboardInputRef.current.value = '';
                        keyboardInputValueRef.current = '';
                        setRfidUid('');
                        keyboardInputRef.current.focus();
                      }
                    }, 500);
                  }
                }
              }}
              onChange={(e) => {
                const value = e.target.value;
                console.log('[RFID] Input de teclado detectado (onChange):', value);
                
                if (value && value !== keyboardInputValueRef.current) {
                  keyboardInputValueRef.current = value;
                  setRfidUid(value);
                  setReadEmpty(false);
                  
                  if (value.length >= 4) {
                    console.log('[RFID] Procesando UID desde teclado (onChange):', value);
                    handleCardRead(value);
                    setTimeout(() => {
                      if (keyboardInputRef.current) {
                        keyboardInputRef.current.value = '';
                        keyboardInputValueRef.current = '';
                        setRfidUid('');
                        keyboardInputRef.current.focus();
                      }
                    }, 500);
                  }
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && keyboardInputValueRef.current.trim()) {
                  const value = keyboardInputValueRef.current.trim();
                  if (value.length >= 4) {
                    handleCardRead(value);
                  } else if (value && personId) {
                    handleAssociateRfid(value);
                  }
                }
              }}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={rfidUid}
              onChange={(e) => setRfidUid(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && rfidUid.trim()) {
                  handleAssociateRfid();
                }
              }}
              disabled={status !== 'connected'}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent min-w-0 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
              placeholder="O ingresa UID manualmente aquí"
            />
            <button
              type="button"
              onClick={() => handleAssociateRfid()}
              disabled={rfidLoading || !rfidUid.trim() || !personId || status !== 'connected'}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap sm:w-auto w-full"
            >
              {rfidLoading ? 'Asociando...' : 'Asociar'}
            </button>
          </div>
          {status !== 'connected' && (
            <p className="text-xs text-gray-500">
              Conecta el dispositivo para habilitar la lectura
            </p>
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
            <p className="text-xs text-gray-400 mt-1">
              Si no especificas un ID, se usará el propuesto automáticamente
            </p>
          </div>
          {status !== 'connected' && (
            <p className="text-xs text-gray-500">
              Conecta el dispositivo para habilitar la escritura
            </p>
          )}
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
          <p className="text-xs text-gray-500">
            💡 Acerca la tarjeta al lector antes de hacer clic en "Escribir en Tarjeta"
          </p>
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
