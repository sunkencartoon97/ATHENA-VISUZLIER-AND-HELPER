import { useState, useEffect } from 'react';
import { healthCheck, ApiError } from '../api';

export type HealthStatus = 'ok' | 'error' | 'engine_not_compiled' | 'loading';

export function useHealthCheck() {
  const [status, setStatus] = useState<HealthStatus>('loading');
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const response = await healthCheck();
        setStatus('ok');
        setVersion(response.version);
      } catch (error) {
        if (error instanceof ApiError && error.status === 503) {
          setStatus('engine_not_compiled');
        } else {
          setStatus('error');
          setVersion(null);
        }
      }
    };

    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  return { status, version };
}
