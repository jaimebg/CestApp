import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { initializeDatabase } from './client';
import { seedCategories } from './seed';

interface DatabaseContextType {
  isReady: boolean;
  error: Error | null;
}

const DatabaseContext = createContext<DatabaseContextType>({
  isReady: false,
  error: null,
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

  useEffect(() => {
    async function init() {
      try {
        initializeDatabase();
        await seedCategories();

        setIsReady(true);
      } catch (err) {
        console.error('Database initialization error:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    }

    init();
  }, []);

  return <DatabaseContext.Provider value={{ isReady, error }}>{children}</DatabaseContext.Provider>;
}
