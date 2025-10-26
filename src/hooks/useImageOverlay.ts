import { useState, useCallback, useRef } from 'react';

export interface ImageOverlayState {
  overlay: HTMLImageElement | null;
  isLoading: boolean;
  error: string | null;
}

export function useImageOverlay() {
  const [state, setState] = useState<ImageOverlayState>({
    overlay: null,
    isLoading: false,
    error: null
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadOverlay = useCallback(() => {
    // Create file input if it doesn't exist
    if (!fileInputRef.current) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      fileInputRef.current = input;

      input.addEventListener('change', async (event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];

        if (!file) return;

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
          // Create image element
          const img = new Image();

          // Wait for image to load
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Failed to load image'));

            // Create object URL from file
            const url = URL.createObjectURL(file);
            img.src = url;
          });

          setState({
            overlay: img,
            isLoading: false,
            error: null
          });

          console.log('[Overlay] Image loaded successfully:', img.width, 'x', img.height);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load overlay image';
          setState({
            overlay: null,
            isLoading: false,
            error: errorMessage
          });
          console.error('[Overlay] Error loading image:', errorMessage);
        }

        // Reset input value so the same file can be selected again
        target.value = '';
      });
    }

    // Trigger file picker
    fileInputRef.current.click();
  }, []);

  const removeOverlay = useCallback(() => {
    setState({
      overlay: null,
      isLoading: false,
      error: null
    });
    console.log('[Overlay] Overlay removed');
  }, []);

  return {
    overlay: state.overlay,
    isLoading: state.isLoading,
    error: state.error,
    loadOverlay,
    removeOverlay
  };
}

