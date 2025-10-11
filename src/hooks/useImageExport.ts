import { useCallback } from 'react';

export function useImageExport() {
  const exportToPNG = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas) {
      console.error('No canvas available for export');
      return;
    }

    canvas.toBlob((blob) => {
      if (!blob) {
        console.error('Failed to create blob from canvas');
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

      link.download = `ascii-cam-${timestamp}.png`;
      link.href = url;
      link.click();

      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 100);
    }, 'image/png');
  }, []);

  return { exportToPNG };
}

