import { useState, useEffect, useRef, useCallback } from 'react';
import { translateText } from './translate';

/**
 * Custom hook that debounces translation requests.
 * Cancels in-flight requests when input changes.
 */
export function useTranslation(text, sourceLang, targetLang, delay = 400) {
  const [translated, setTranslated] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const timeoutRef = useRef(null);

  const doTranslate = useCallback(async (txt, src, tgt) => {
    // Cancel previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    if (!txt.trim()) {
      setTranslated('');
      setIsLoading(false);
      setError(null);
      return;
    }

    if (src === tgt) {
      setTranslated(txt);
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const result = await translateText(txt, src, tgt, controller.signal);
      setTranslated(result);
      setError(null);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
        setTranslated('');
      }
    } finally {
      if (abortRef.current === controller) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      doTranslate(text, sourceLang, targetLang);
    }, delay);

    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, [text, sourceLang, targetLang, delay, doTranslate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { translated, isLoading, error };
}
