import { useState, useEffect, useRef } from 'react';
import { useBoundStore } from '../../../store/bound-store';
import { getApiBaseUrl } from '../../../lib/constants';

interface UseAuthenticatedImageResult {
  src: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to fetch an image with authentication headers and return a blob URL.
 * This is necessary because <img> tags cannot send Authorization headers natively.
 *
 * @param imageUrl - The relative or absolute URL to fetch (e.g., "/api/notes/images/{id}")
 * @returns Object with src (blob URL), loading state, and error
 */
export function useAuthenticatedImage(imageUrl: string | null): UseAuthenticatedImageResult {
  const [src, setSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const token = useBoundStore(state => state.token);

  useEffect(() => {
    if (!imageUrl) {
      setSrc(null);
      return;
    }

    // Build full URL if relative
    const fullUrl = imageUrl.startsWith('http')
      ? imageUrl
      : `${getApiBaseUrl()}${imageUrl}`;

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    const fetchImage = async () => {
      try {
        const headers: HeadersInit = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(fullUrl, {
          headers,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();

        // Revoke previous blob URL if exists
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
        }

        const blobUrl = URL.createObjectURL(blob);
        blobUrlRef.current = blobUrl;
        setSrc(blobUrl);
        setError(null);
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          return; // Ignore abort errors
        }
        console.error('Failed to fetch authenticated image:', err);
        setError((err as Error).message);
        setSrc(null);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchImage();

    // Cleanup: abort fetch and revoke blob URL
    return () => {
      controller.abort();
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [imageUrl, token]);

  return { src, isLoading, error };
}
