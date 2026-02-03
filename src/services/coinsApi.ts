import { api } from "@/lib/api";

export interface CoinBalanceResponse {
  balance: number;
}

export interface CoinTransaction {
  id: string;
  amount: number;
  reason: string;
  description?: string;
  created_at: string;
  balance_after: number;
}

export interface CoinTransactionsResponse {
  transactions: CoinTransaction[];
  total?: number;
  page?: number;
  per_page?: number;
}

export interface CoinTransactionsParams {
  page?: number;
  per_page?: number;
  reason?: string;
  from?: string;
  to?: string;
  student_id?: string;
  limit?: number;
}

export interface AdminCreditBody {
  student_id: string;
  amount: number;
  reason: string;
  description?: string;
}

export interface AdminDebitBody {
  student_id: string;
  amount: number;
  reason: string;
  description?: string;
}

/**
 * Busca o saldo de moedas do aluno logado ou de um aluno específico (admin).
 */
export async function getCoinBalance(studentId?: string): Promise<CoinBalanceResponse> {
  const params = studentId ? { student_id: studentId } : {};
  const { data } = await api.get<CoinBalanceResponse>("/coins/balance", { params });
  return data;
}

/**
 * Busca o histórico de transações de moedas.
 */
export async function getCoinTransactions(
  params?: CoinTransactionsParams
): Promise<CoinTransactionsResponse> {
  const { data } = await api.get<CoinTransactionsResponse>("/coins/transactions", { params });
  return data;
}

/**
 * Busca transações de um aluno (admin). Útil para "últimas transações".
 */
export async function getCoinTransactionsByStudent(
  studentId: string,
  limit = 5
): Promise<CoinTransactionsResponse> {
  const { data } = await api.get<CoinTransactionsResponse>("/coins/transactions", {
    params: { student_id: studentId, limit },
  });
  return data;
}

/**
 * Crédito administrativo (dar moedas).
 */
export async function adminCredit(body: AdminCreditBody): Promise<{ balance: number }> {
  const { data } = await api.post<{ balance: number }>("/coins/admin/credit", body);
  return data;
}

/**
 * Débito administrativo (remover moedas).
 */
export async function adminDebit(body: AdminDebitBody): Promise<{ balance: number }> {
  const { data } = await api.post<{ balance: number }>("/coins/admin/debit", body);
  return data;
}
