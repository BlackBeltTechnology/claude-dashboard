import { useState, useCallback } from 'react';
import type { PromptRequest, PromptResponse } from 'shared';

interface UsePromptSendResult {
  sendPrompt: (sessionId: string, prompt: string, tmuxTarget?: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
  success: string | null;
  clearStatus: () => void;
}

const API_BASE = 'http://localhost:3847/api';

export function usePromptSend(): UsePromptSendResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clearStatus = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  const sendPrompt = useCallback(async (
    sessionId: string,
    prompt: string,
    tmuxTarget?: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const body: PromptRequest = {
        prompt,
        ...(tmuxTarget && { tmuxTarget }),
      };

      const response = await fetch(`${API_BASE}/sessions/${sessionId}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data: PromptResponse = await response.json();

      if (data.success) {
        setSuccess(data.message);
        return true;
      } else {
        setError(data.message);
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send prompt';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    sendPrompt,
    isLoading,
    error,
    success,
    clearStatus,
  };
}
