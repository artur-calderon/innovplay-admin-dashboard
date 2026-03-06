import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/authContext';
import {
  getStudentPreferences,
  updateStudentPreferences,
  type StudentPreferences,
} from '@/services/studentPreferencesService';

interface StudentPreferencesContextValue {
  preferences: StudentPreferences;
  isLoading: boolean;
  setPreferences: (prefs: Partial<StudentPreferences>) => Promise<void>;
  refetch: () => Promise<void>;
}

const StudentPreferencesContext = createContext<StudentPreferencesContextValue | null>(null);

export function StudentPreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [preferences, setPreferencesState] = useState<StudentPreferences>({});
  const [isLoading, setIsLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (user?.role !== 'aluno' || !user?.id) return;
    setIsLoading(true);
    try {
      const prefs = await getStudentPreferences();
      setPreferencesState(prefs);
    } catch {
      setPreferencesState({});
    } finally {
      setIsLoading(false);
    }
  }, [user?.role, user?.id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const setPreferences = useCallback(async (prefs: Partial<StudentPreferences>) => {
    if (user?.role !== 'aluno') return;
    setPreferencesState((prev) => ({ ...prev, ...prefs }));
    try {
      const next = await updateStudentPreferences(prefs);
      setPreferencesState(next);
    } catch {
      // Backend may not have endpoint yet; local state already updated above
    }
  }, [user?.role]);

  const value: StudentPreferencesContextValue = {
    preferences,
    isLoading,
    setPreferences,
    refetch,
  };

  return (
    <StudentPreferencesContext.Provider value={value}>
      {children}
    </StudentPreferencesContext.Provider>
  );
}

export function useStudentPreferences(): StudentPreferencesContextValue | null {
  return useContext(StudentPreferencesContext);
}
