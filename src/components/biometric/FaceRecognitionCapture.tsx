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
  autoCaptureNoticeLabel = 'Intentando iniciar sesión...'
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
  const [userStopped, setUserStopped] = useState(false);
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
    if (
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
  }, [isExpanded, state.isModelLoaded, isStreaming, isStartingCamera, cameraError, userStopped]);

  useEffect(() => {
    if (!isExpanded && isStreaming) {
      stopStream();
    }
  }, [isExpanded, isStreaming]);

  useEffect(() => {
    const prevExpanded = prevExpandedRef.current;
    if (isExpanded && !prevExpanded) {
      setUserStopped(false);
    }
    if (!isExpanded && prevExpanded) {
      setUserStopped(true);
    }
    prevExpandedRef.current = isExpanded;
  }, [isExpanded]);

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
        const ctx = canvas.getContext('2d');
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

  return (
    <div className="w-full rounded-lg border border-slate-200 bg-white shadow-sm">
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

      {isExpanded && (
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
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
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
                  <div className="absolute inset-0 flex items-center justify-center text-slate-200 text-sm">
                    Cámara no activa
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
              </div>

              {cameraError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                  {cameraError}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {!isStreaming ? (
                  <button
                    type="button"
                    onClick={() => {
                      setUserStopped(false);
                      startCamera();
                    }}
                    disabled={state.isDetecting || isStartingCamera}
                    className="px-4 py-2 rounded bg-slate-900 text-white text-sm disabled:opacity-50"
                  >
                    {isStartingCamera ? 'Activando cámara...' : 'Activar cámara'}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={captureDescriptor}
                      disabled={state.isDetecting}
                      className="px-4 py-2 rounded bg-emerald-600 text-white text-sm disabled:opacity-50"
                    >
                      {state.isDetecting ? 'Detectando...' : actionLabel}
                    </button>
                    <button
                      type="button"
                      onClick={stopStream}
                      className="px-4 py-2 rounded border border-slate-300 text-sm"
                    >
                      Detener cámara
                    </button>
                  </>
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
              </div>

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
