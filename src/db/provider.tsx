import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { initializeDatabase } from './client';
import { seedCategories } from './seed';
import { createScopedLogger } from '../utils/debug';

const logger = createScopedLogger('Database');

interface DatabaseContextType {
  isReady: boolean;
  error: Error | null;
  retry: () => void;
}

const DatabaseContext = createContext<DatabaseContextType>({
  isReady: false,
  error: null,
  retry: () => {},
});

export function useDatabaseReady() {
  return useContext(DatabaseContext);
}

interface DatabaseProviderProps {
  children: ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        await initializeDatabase();
        await seedCategories();

        if (!cancelled) setIsReady(true);
      } catch (err) {
        logger.error('Database initialization error:', err);
        if (!cancelled) setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setIsReady(false);
    setError(null);
    setAttempt((a) => a + 1);
  }, []);

  return (
    <DatabaseContext.Provider value={{ isReady, error, retry }}>
      {children}
    </DatabaseContext.Provider>
  );
}
