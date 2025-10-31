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


