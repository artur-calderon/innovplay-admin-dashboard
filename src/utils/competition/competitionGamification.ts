export type CompetitionBand =
  | 'Aprendiz'
  | 'Iniciante'
  | 'Dedicado'
  | 'Destaque'
  | 'Honra'
  | 'Excelência'
  | 'Mestre do Saber';

export const BAND_COLORS: Record<CompetitionBand, string> = {
  Aprendiz: '#BDBDBD',
  Iniciante: '#64B5F6',
  Dedicado: '#43A047',
  Destaque: '#8E24AA',
  Honra: '#FB8C00',
  Excelência: '#FFD700',
  'Mestre do Saber': '#0D47A1',
};

export function getBandColor(band: CompetitionBand | string | undefined): string | undefined {
  if (!band) return undefined;
  const key = band as CompetitionBand;
  return BAND_COLORS[key];
}

