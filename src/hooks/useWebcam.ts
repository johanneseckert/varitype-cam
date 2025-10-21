import { useEffect, useRef, useState, useCallback } from 'react';

export interface WebcamState {
  video: HTMLVideoElement | null;
  isReady: boolean;
  error: string | null;
  isLoading: boolean;
  hasStarted: boolean;
}

export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<WebcamState>({
    video: null,
    isReady: false,
    error: null,
    isLoading: false,
    hasStarted: false
  });

  const startWebcam = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null, hasStarted: true }));

      // Request webcam access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      // Create video element
      const video = document.createElement('video');
      video.srcObject = stream;
      video.playsInline = true;
      video.autoplay = true;
      video.muted = true;

      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
          video.play()
            .then(() => resolve())
            .catch(reject);
        };
        video.onerror = reject;
      });

      videoRef.current = video;
      streamRef.current = stream;

      setState({
        video,
        isReady: true,
        error: null,
        isLoading: false,
        hasStarted: true
      });
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : 'Failed to access webcam';

      setState({
        video: null,
        isReady: false,
        error: errorMessage,
        isLoading: false,
        hasStarted: true
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  return { ...state, startWebcam };
}

