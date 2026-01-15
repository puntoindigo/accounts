'use client';

import { useEffect, useRef, useState } from 'react';
import { useFaceRecognition } from '@/hooks/useFaceRecognition';
import { descriptorToArray } from '@/lib/biometric/utils';

interface CaptureItem {
  id: string;
  imageUrl: string;
  descriptor: number[];
}

interface FaceRegistrationPickerProps {
  onRegister: (descriptor: number[], imageUrl: string) => Promise<void> | void;
  onRemove: () => Promise<void> | void;
  hasSavedFace: boolean;
}

const MAX_CAPTURES = 4;
const MIN_CAPTURES = 3;

export default function FaceRegistrationPicker({
  onRegister,
  onRemove,
  hasSavedFace
}: FaceRegistrationPickerProps) {
  const { state, loadModels, detectFace, detectFaceBox, stopDetection } = useFaceRecognition();
  const [isStreaming, setIsStreaming] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [faceDetection, setFaceDetection] = useState<any | null>(null);
  const [captures, setCaptures] = useState<CaptureItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

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
      }, 150);
    }

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [isStreaming, state.isModelLoaded, detectFaceBox]);

  useEffect(() => {
    return () => {
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
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
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
      setCameraError('Error accediendo a la cámara.');
    }
  };

  const stopStream = () => {
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

  const captureFrame = async () => {
    if (!videoRef.current) {
      setMessage('El video no está disponible.');
      return;
    }
    if (!state.isModelLoaded) {
      setMessage('Los modelos todavía no están listos.');
      return;
    }
    if (captures.length >= MAX_CAPTURES) {
      setMessage(`Máximo ${MAX_CAPTURES} capturas.`);
      return;
    }

    const descriptor = await detectFace(videoRef.current);
    if (!descriptor) {
      setMessage('No se detectó rostro, intentá de nuevo.');
      return;
    }

    const canvas = document.createElement('canvas');
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setMessage('No se pudo capturar la imagen.');
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageUrl = canvas.toDataURL('image/jpeg', 0.9);

    const item: CaptureItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      imageUrl,
      descriptor: descriptorToArray(descriptor)
    };

    setCaptures(prev => {
      const next = [...prev, item];
      if (!selectedId) {
        setSelectedId(item.id);
      }
      return next;
    });
    setMessage(`Captura ${captures.length + 1} guardada.`);
  };

  const handleRegister = async () => {
    const selected = captures.find(item => item.id === selectedId) || captures[0];
    if (!selected) return;
    await onRegister(selected.descriptor, selected.imageUrl);
    setCaptures([]);
    setSelectedId(null);
    setMessage('Rostro registrado.');
    stopStream();
  };

  return (
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
      </div>

      {cameraError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {cameraError}
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-sm">
        {!isStreaming ? (
          <button
            type="button"
            onClick={startCamera}
            disabled={isStartingCamera}
            className="px-4 py-2 rounded bg-slate-900 text-white disabled:opacity-50"
          >
            {isStartingCamera ? 'Activando cámara...' : 'Activar cámara'}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={captureFrame}
              disabled={state.isDetecting}
              className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-50"
            >
              Capturar
            </button>
            <button
              type="button"
              onClick={stopStream}
              className="px-4 py-2 rounded border border-slate-300"
            >
              Detener cámara
            </button>
          </>
        )}
        {hasSavedFace && (
          <button
            type="button"
            onClick={onRemove}
            className="px-4 py-2 rounded border border-red-200 text-red-600"
          >
            Quitar rostro
          </button>
        )}
      </div>

      <div className="text-xs text-slate-500">
        Capturá {MIN_CAPTURES} o {MAX_CAPTURES} fotos y elegí una.
      </div>

      {captures.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {captures.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className={`rounded border ${selectedId === item.id ? 'border-slate-900' : 'border-slate-200'}`}
            >
              <img src={item.imageUrl} alt="captura" className="w-full h-20 object-cover rounded" />
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-sm">
        <button
          type="button"
          onClick={handleRegister}
          disabled={captures.length < MIN_CAPTURES}
          className="px-4 py-2 rounded bg-slate-900 text-white disabled:opacity-50"
        >
          Registrar rostro
        </button>
        <button
          type="button"
          onClick={() => {
            setCaptures([]);
            setSelectedId(null);
          }}
          className="px-4 py-2 rounded border border-slate-300"
        >
          Limpiar capturas
        </button>
      </div>

      {message && (
        <div className="text-sm text-slate-600">{message}</div>
      )}
    </div>
  );
}
