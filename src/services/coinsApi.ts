import { api } from '@/lib/api';

export interface BalanceResponse {
  balance: number;
}

export interface CoinTransaction {
  id: string;
  student_id: string;
  amount: number;
  reason: string;
  description?: string;
  balance_after: number;
  created_at: string;
}

export interface TransactionsResponse {
  transactions: CoinTransaction[];
}

export interface CreditDebitPayload {
  student_id: string;
  amount: number;
  reason: string;
  description?: string;
}

/**
 * Busca o saldo de moedas do aluno.
 * Sem student_id = aluno logado.
 */
export async function getBalance(studentId?: string): Promise<number> {
  const params = studentId ? { student_id: studentId } : {};
  const { data } = await api.get<BalanceResponse>('/coins/balance', { params });
  return data.balance;
}

/**
 * Busca transações de moedas.
 */
export async function getTransactions(params?: {
  student_id?: string;
  limit?: number;
  offset?: number;
}): Promise<CoinTransaction[]> {
  const { data } = await api.get<TransactionsResponse>('/coins/transactions', {
    params: params
      ? {
          ...(params.student_id && { student_id: params.student_id }),
          ...(params.limit != null && { limit: params.limit }),
          ...(params.offset != null && { offset: params.offset }),
        }
      : undefined,
  });
  return data.transactions ?? [];
}

/**
 * Credita moedas ao aluno (admin/coordenador/diretor/tecadm).
 * @param cityId - Opcional; quando admin e em contexto de município, envia X-City-ID
 */
export async function credit(
  studentId: string,
  amount: number,
  reason: string,
  description?: string,
  cityId?: string
): Promise<void> {
  const config = cityId ? { meta: { cityId } } : {};
  await api.post('/coins/admin/credit', {
    student_id: studentId,
    amount,
    reason,
    ...(description && { description }),
  }, config);
}

/**
 * Debita moedas do aluno (admin/coordenador/diretor/tecadm).
 * @param cityId - Opcional; quando admin e em contexto de município, envia X-City-ID
 */
export async function debit(
  studentId: string,
  amount: number,
  reason: string,
  description?: string,
  cityId?: string
): Promise<void> {
  const config = cityId ? { meta: { cityId } } : {};
  await api.post('/coins/admin/debit', {
    student_id: studentId,
    amount,
    reason,
    ...(description && { description }),
  }, config);
}

/**
 * Retorna a mensagem de erro da API para exibir ao usuário (ex.: saldo insuficiente).
 */
export function getApiErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const res = (error as { response?: { data?: { error?: string; message?: string } } })
      .response;
    const msg = res?.data?.error ?? res?.data?.message;
    if (typeof msg === 'string') return msg;
  }
  if (error instanceof Error) return error.message;
  return 'Erro ao processar a operação.';
}
