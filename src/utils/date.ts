// Gera ISO com offset local (+/-HH:MM) a partir de um Date
export function toLocalOffsetISO(date: Date): string {
  const pad = (value: number) => String(Math.floor(Math.abs(value))).padStart(2, '0');
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

  const [datePart, timePart] = dateTimeString.split('T');

  if (!datePart || !timePart) {
    throw new Error(`Formato inválido: ${dateTimeString}`);
  }

  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  if (
    [year, month, day, hour, minute].some((segment) => Number.isNaN(segment))
  ) {
    throw new Error(`Data/hora inválida: ${dateTimeString}`);
  }

  // Construir a data manualmente para evitar ajustes implícitos
  const localDate = new Date(year, month - 1, day, hour, minute, 0, 0);
  
  // Verificar se a data é válida
  if (isNaN(localDate.getTime())) {
    throw new Error(`Data/hora inválida: ${dateTimeString}`);
  }

  // Usar a função existente para converter para ISO com timezone
  return toLocalOffsetISO(localDate);
}


