'use client';

import { useState, useRef, useEffect } from 'react';
import { useFaceRecognition } from '@/hooks/useFaceRecognition';
import { descriptorToArray } from '@/lib/biometric/utils';

interface FaceRecognitionCaptureProps {
  savedDescriptor?: number[] | null;
  onDescriptorCaptured: (descriptor: number[]) => void;
  onDescriptorRemoved?: () => void;
  readOnly?: boolean;
  defaultExpanded?: boolean;
  title?: string;
  description?: string;
  actionLabel?: string;
  autoCaptureOnDetect?: boolean;
  autoCaptureCooldownMs?: number;
  autoCaptureDisabled?: boolean;
  autoCaptureNoticeLabel?: string;
  autoStartCamera?: boolean; // Si debe iniciar la cámara automáticamente al expandir
}

export default function FaceRecognitionCapture({
  savedDescriptor,
  onDescriptorCaptured,
  onDescriptorRemoved,
  readOnly = false,
  defaultExpanded = false,
  title = 'Reconocimiento Facial',
  description = 'Captura y registra el descriptor facial del empleado.',
  actionLabel = 'Capturar Rostro',
  autoCaptureOnDetect = false,
  autoCaptureCooldownMs = 2000,
  autoCaptureDisabled = false,
  autoCaptureNoticeLabel = 'Intentando iniciar sesión...',
  autoStartCamera = false // Por defecto no iniciar automáticamente
}: FaceRecognitionCaptureProps) {
  const { state, loadModels, detectFace, detectFaceBox, stopDetection } = useFaceRecognition();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [faceDetection, setFaceDetection] = useState<any | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [autoCaptureBlocked, setAutoCaptureBlocked] = useState(false);
  const [autoCaptureNotice, setAutoCaptureNotice] = useState(false);
  // Inicializar userStopped en true si no se debe activar automáticamente
  const [userStopped, setUserStopped] = useState(!autoStartCamera);
  const prevExpandedRef = useRef(isExpanded);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isExpanded && !state.isModelLoaded) {
      loadModels();
    }
  }, [isExpanded, state.isModelLoaded, loadModels]);

  useEffect(() => {
    // Solo activar automáticamente si autoStartCamera está habilitado
    if (
      autoStartCamera &&
      isExpanded &&
      state.isModelLoaded &&
      !isStreaming &&
      !isStartingCamera &&
      !cameraError &&
      !userStopped
    ) {
      const timer = setTimeout(() => {
        startCamera();
      }, 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [autoStartCamera, isExpanded, state.isModelLoaded, isStreaming, isStartingCamera, cameraError, userStopped]);

  useEffect(() => {
    if (!isExpanded && isStreaming) {
      stopStream();
    }
  }, [isExpanded, isStreaming]);

  useEffect(() => {
    const prevExpanded = prevExpandedRef.current;
    // Solo resetear userStopped si autoStartCamera está habilitado
    if (isExpanded && !prevExpanded) {
      if (autoStartCamera) {
        setUserStopped(false);
      } else {
        // Si no debe activarse automáticamente, mantener userStopped en true
        setUserStopped(true);
      }
    }
    if (!isExpanded && prevExpanded) {
      setUserStopped(true);
    }
    prevExpandedRef.current = isExpanded;
  }, [isExpanded, autoStartCamera]);

  useEffect(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }

    if (isStreaming && state.isModelLoaded && videoRef.current && canvasRef.current) {
      detectionIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current) return;
        const detection = await detectFaceBox(videoRef.current);
        setFaceDetection(detection);

        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !video.videoWidth || !video.videoHeight) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (detection?.detection) {
          const box = detection.detection.box;
          ctx.strokeStyle = detection.detection.score > 0.5 ? '#22c55e' : '#f59e0b';
          ctx.lineWidth = 3;
          ctx.strokeRect(box.x, box.y, box.width, box.height);
        }

        if (
          autoCaptureOnDetect &&
          !autoCaptureDisabled &&
          !autoCaptureBlocked &&
          detection?.detection?.score > 0.6 &&
          !state.isDetecting
        ) {
          setAutoCaptureBlocked(true);
          setAutoCaptureNotice(true);
          const descriptor = await detectFace(videoRef.current);
          if (descriptor) {
            onDescriptorCaptured(descriptorToArray(descriptor));
          }
          setTimeout(() => {
            setAutoCaptureBlocked(false);
            setAutoCaptureNotice(false);
          }, autoCaptureCooldownMs);
        }
      }, 120);
    }

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [
    isStreaming,
    state.isModelLoaded,
    detectFaceBox,
    detectFace,
    onDescriptorCaptured,
    autoCaptureOnDetect,
    autoCaptureCooldownMs,
    autoCaptureBlocked,
    state.isDetecting,
    autoCaptureDisabled
  ]);

  useEffect(() => {
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      stopStream();
    };
  }, []);

  const startCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Tu navegador no soporta acceso a la cámara.');
      return;
    }

    setIsStartingCamera(true);
    setCameraError(null);
    setMessage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      if (!videoRef.current) {
        throw new Error('El elemento de video no está disponible');
      }

      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      setIsStreaming(true);
      setIsStartingCamera(false);

      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().catch(() => {
          setCameraError('No se pudo iniciar el video.');
        });
      };
    } catch (error: any) {
      setIsStartingCamera(false);
      const errorMessage =
        error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError'
          ? 'Permiso de cámara denegado.'
          : error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError'
          ? 'No se encontró ninguna cámara disponible.'
          : error?.name === 'NotReadableError' || error?.name === 'TrackStartError'
          ? 'La cámara está siendo usada por otra aplicación.'
          : error?.name === 'SecurityError'
          ? 'Error de seguridad. Usa HTTPS para acceder a la cámara.'
          : `Error al acceder a la cámara: ${error?.message || 'desconocido'}`;

      setCameraError(errorMessage);
    }
  };

  const stopStream = () => {
    setUserStopped(true);
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }

    setIsStreaming(false);
    setFaceDetection(null);
    stopDetection();
  };

  const captureDescriptor = async () => {
    if (!videoRef.current) {
      setMessage('El video no está disponible.');
      return;
    }

    if (!state.isModelLoaded) {
      setMessage('Los modelos de reconocimiento no están cargados.');
      return;
    }

    const descriptor = await detectFace(videoRef.current);
    if (descriptor) {
      const descriptorArray = descriptorToArray(descriptor);
      onDescriptorCaptured(descriptorArray);
      setMessage('Rostro capturado exitosamente.');
      stopStream();
      setIsExpanded(false);
    } else {
      setMessage('No se detectó ningún rostro. Intenta nuevamente.');
    }
  };

  const hasSavedDescriptor = Array.isArray(savedDescriptor) && savedDescriptor.length > 0;

  // Si no hay título ni descripción, mostrar directamente sin header colapsable
  const showCollapsible = title || description;

  return (
    <div className="w-full rounded-lg border border-slate-200 bg-white shadow-sm">
      {showCollapsible && (
        <button
          type="button"
          className="w-full text-left px-4 py-3 border-b border-slate-100 flex items-center justify-between"
          onClick={() => !readOnly && !hasSavedDescriptor && setIsExpanded(!isExpanded)}
        >
          <div>
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
          <div className="text-xs text-slate-500">
            {hasSavedDescriptor ? 'Registrado' : isExpanded ? 'Ocultar' : 'Mostrar'}
          </div>
        </button>
      )}

      {(!showCollapsible || isExpanded) && (
        <div className="p-4 space-y-4">
          {!state.isModelLoaded && (
            <div className="text-sm text-slate-600">Cargando modelos de reconocimiento...</div>
          )}

          {state.error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
              {state.error}
            </div>
          )}

          {state.isModelLoaded && (
            <div className="space-y-4">
              <div className={`relative rounded-lg overflow-hidden aspect-video ${
                isStreaming ? 'bg-black' : 'bg-gray-300'
              }`}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isStreaming ? 'block' : 'hidden'}`}
                />
                {isStreaming && (
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  />
                )}
                {!isStreaming && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                    <svg className="w-12 h-12 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium">Cámara no activa</span>
                  </div>
                )}
                {isStreaming && faceDetection && (
                  <div className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium bg-slate-900/70 text-white">
                    {faceDetection.detection?.score > 0.5 ? 'Rostro detectado' : 'Ajustando...'}
                  </div>
                )}
                {autoCaptureNotice && (
                  <div className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium bg-emerald-600 text-white">
                    {autoCaptureNoticeLabel}
                  </div>
                )}
                <div className="absolute top-2 right-2 flex items-center gap-2">
                  {!isStreaming ? (
                    <button
                      type="button"
                      onClick={() => {
                        setUserStopped(false);
                        startCamera();
                      }}
                      disabled={state.isDetecting || isStartingCamera}
                      className="h-9 w-9 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow hover:bg-white"
                      aria-label="Activar cámara"
                    >
                      ▶
                    </button>
                  ) : (
                    <>
                      {!autoCaptureOnDetect && (
                        <button
                          type="button"
                          onClick={captureDescriptor}
                          disabled={state.isDetecting}
                          className="h-9 w-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow hover:bg-emerald-500"
                          aria-label={actionLabel}
                        >
                          ●
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={stopStream}
                        className="h-9 w-9 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow hover:bg-white"
                        aria-label="Detener cámara"
                      >
                        ■
                      </button>
                    </>
                  )}
                </div>
              </div>

              {cameraError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                  {cameraError}
                </div>
              )}

              {hasSavedDescriptor && onDescriptorRemoved && (
                <button
                  type="button"
                  onClick={onDescriptorRemoved}
                  className="px-4 py-2 rounded border border-red-200 text-sm text-red-600"
                >
                  Eliminar descriptor
                </button>
              )}

              {message && (
                <div className="text-sm text-slate-600">{message}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
