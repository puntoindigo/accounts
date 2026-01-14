'use client';

import { useState, useRef, useCallback } from 'react';
import { debugError } from '@/lib/debug';

let faceapiPromise: Promise<any> | null = null;

const loadFaceApi = async () => {
  if (typeof window === 'undefined') {
    throw new Error('face-api.js solo puede usarse en el cliente');
  }

  if (!faceapiPromise) {
    faceapiPromise = new Promise((resolve, reject) => {
      const existingFaceApi =
        (window as any).faceapi ||
        (window as any).faceApi;
      if (existingFaceApi) {
        resolve(existingFaceApi);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
      script.async = true;

      script.onload = () => {
        let attempts = 0;
        const maxAttempts = 10;

        const checkFaceApi = () => {
          attempts += 1;
          const faceApi =
            (window as any).faceapi ||
            (window as any).faceApi ||
            (window as any).face_api;

          if (faceApi && faceApi.nets) {
            resolve(faceApi);
          } else if (attempts < maxAttempts) {
            setTimeout(checkFaceApi, 50);
          } else {
            reject(new Error('face-api.js se cargó pero no está disponible.'));
          }
        };

        setTimeout(checkFaceApi, 50);
      };

      script.onerror = () => {
        reject(new Error('Error cargando face-api.js desde CDN.'));
      };

      document.head.appendChild(script);
    });
  }

  return faceapiPromise;
};

export interface FaceRecognitionState {
  isModelLoaded: boolean;
  isDetecting: boolean;
  error: string | null;
  descriptor: Float32Array | null;
}

export interface UseFaceRecognitionReturn {
  state: FaceRecognitionState;
  loadModels: () => Promise<void>;
  detectFace: (videoElement: HTMLVideoElement) => Promise<Float32Array | null>;
  detectFaceBox: (videoElement: HTMLVideoElement) => Promise<any | null>;
  stopDetection: () => void;
}

export function useFaceRecognition(): UseFaceRecognitionReturn {
  const [state, setState] = useState<FaceRecognitionState>({
    isModelLoaded: false,
    isDetecting: false,
    error: null,
    descriptor: null
  });

  const modelsLoadedRef = useRef(false);

  const loadModels = useCallback(async () => {
    if (modelsLoadedRef.current) {
      setState(prev => ({ ...prev, isModelLoaded: true }));
      return;
    }

    try {
      setState(prev => ({ ...prev, error: null }));
      const faceapi = await loadFaceApi();
      const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);

      modelsLoadedRef.current = true;
      setState(prev => ({
        ...prev,
        isModelLoaded: true,
        error: null
      }));
    } catch (error) {
      debugError('Error cargando modelos de face-api:', error);
      setState(prev => ({
        ...prev,
        isModelLoaded: false,
        error: error instanceof Error ? error.message : 'Error desconocido al cargar modelos'
      }));
    }
  }, []);

  const detectFace = useCallback(
    async (videoElement: HTMLVideoElement): Promise<Float32Array | null> => {
      if (!state.isModelLoaded) {
        throw new Error('Los modelos no están cargados. Llama a loadModels() primero.');
      }

      try {
        setState(prev => ({ ...prev, isDetecting: true, error: null }));
        const faceapi = await loadFaceApi();

        const detection = await faceapi
          .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!detection) {
          setState(prev => ({
            ...prev,
            isDetecting: false,
            descriptor: null,
            error: 'No se detectó ningún rostro en la imagen'
          }));
          return null;
        }

        const descriptor = detection.descriptor;
        setState(prev => ({
          ...prev,
          isDetecting: false,
          descriptor,
          error: null
        }));

        return descriptor;
      } catch (error) {
        debugError('Error detectando rostro:', error);
        setState(prev => ({
          ...prev,
          isDetecting: false,
          descriptor: null,
          error: error instanceof Error ? error.message : 'Error desconocido al detectar rostro'
        }));
        return null;
      }
    },
    [state.isModelLoaded]
  );

  const detectFaceBox = useCallback(
    async (videoElement: HTMLVideoElement): Promise<any | null> => {
      if (!state.isModelLoaded) {
        return null;
      }

      try {
        const faceapi = await loadFaceApi();
        const detection = await faceapi
          .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks();

        return detection;
      } catch (error) {
        debugError('Error detectando bounding box:', error);
        return null;
      }
    },
    [state.isModelLoaded]
  );

  const stopDetection = useCallback(() => {
    setState(prev => ({
      ...prev,
      isDetecting: false
    }));
  }, []);

  return {
    state,
    loadModels,
    detectFace,
    detectFaceBox,
    stopDetection
  };
}
