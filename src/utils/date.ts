// Gera ISO com offset local (+/-HH:MM) a partir de um Date
export function toLocalOffsetISO(date: Date): string {
  const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0');
  const tzOffsetMin = date.getTimezoneOffset(); // minutos atrás de UTC
  const sign = tzOffsetMin > 0 ? '-' : '+'; // ex.: Brasília (UTC-3) -> getTimezoneOffset() = 180 -> '-'
  const hh = pad(tzOffsetMin / 60);
  const mm = pad(tzOffsetMin % 60);
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${y}-${m}-${d}T${h}:${min}:${s}${sign}${hh}:${mm}`;
}

/**
 * Converte uma string datetime-local (formato "YYYY-MM-DDTHH:mm") para ISO string com timezone
 * Isso garante que a data seja interpretada corretamente sem ajustes de timezone
 * 
 * @param dateTimeString - String no formato "YYYY-MM-DDTHH:mm" (sem timezone)
 * @returns String ISO com timezone (ex: "2024-01-01T10:00:00-03:00")
 */
export function convertDateTimeLocalToISO(dateTimeString: string): string {
  if (!dateTimeString) {
    throw new Error("Data/hora não fornecida");
  }

  // Criar um objeto Date a partir da string datetime-local
  // O JavaScript interpreta isso como hora local
  const localDate = new Date(dateTimeString);
  
  // Verificar se a data é válida
  if (isNaN(localDate.getTime())) {
    throw new Error(`Data/hora inválida: ${dateTimeString}`);
  }

  // Usar a função existente para converter para ISO com timezone
  return toLocalOffsetISO(localDate);
}


