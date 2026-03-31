import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/authContext';
import { getAvailableCompetitions } from '@/services/competition/competitionsApi';
import type { Competition } from '@/types/competition-types';

const OPEN_STATUSES = ['aberta', 'enrollment_open', 'active', 'scheduled'];

function isOpenStatus(c: Competition): boolean {
  const s = String(c.status).toLowerCase();
  return OPEN_STATUSES.some((open) => s === open);
}

function isInEnrollmentPeriod(c: Competition): boolean {
  const now = Date.now();
  if (c.enrollment_start && new Date(c.enrollment_start).getTime() > now) return false;
  if (c.enrollment_end && new Date(c.enrollment_end).getTime() < now) return false;
  return true;
}

function hasSlots(c: Competition): boolean {
  const max = c.max_participants ?? c.limit;
  if (max == null || max <= 0) return true;
  const enrolled = c.enrolled_count ?? 0;
  return enrolled < max;
}

function canEnrollNow(c: Competition): boolean {
  return isOpenStatus(c) && isInEnrollmentPeriod(c) && hasSlots(c) && !c.is_enrolled;
}

/**
 * Retorna a quantidade de competições abertas (em que o aluno pode se inscrever agora).
 * Só faz fetch quando user.role === 'aluno'.
 */
export function useOpenCompetitionsCount(): number {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (user?.role !== 'aluno') {
      setCount(0);
      return;
    }
    try {
      const list = await getAvailableCompetitions();
      const open = Array.isArray(list) ? list.filter(canEnrollNow) : [];
      setCount(open.length);
    } catch {
      setCount(0);
    }
  }, [user?.role]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  return count;
}
