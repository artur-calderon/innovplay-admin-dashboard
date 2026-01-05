/**
 * Utilitários para gerenciamento de InnovCoins (moedas virtuais)
 */

/**
 * Formata o valor das moedas para exibição
 * @param amount Quantidade de moedas
 * @returns String formatada
 */
export const formatCoins = (amount: number): string => {
  return new Intl.NumberFormat('pt-BR').format(amount);
};

/**
 * Obtém a classe CSS para o badge de moedas baseado na posição
 * @param position Posição no ranking (1, 2, 3, etc.)
 * @returns Classes CSS para o badge
 */
export const getCoinsBadgeColor = (position: number): string => {
  switch (position) {
    case 1:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400 border-yellow-300';
    case 2:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400 border-gray-300';
    case 3:
      return 'bg-orange-100 text-orange-800 dark:bg-orange-950/30 dark:text-orange-400 border-orange-300';
    default:
      return 'bg-muted text-foreground border-border';
  }
};

/**
 * Obtém o emoji da medalha baseado na posição
 * @param position Posição no ranking
 * @returns Emoji da medalha ou string vazia
 */
export const getMedalEmoji = (position: number): string => {
  switch (position) {
    case 1:
      return '🥇';
    case 2:
      return '🥈';
    case 3:
      return '🥉';
    default:
      return '';
  }
};

/**
 * Calcula as moedas a serem ganhas baseado na posição e nas recompensas configuradas
 * @param position Posição no ranking
 * @param rewards Objeto com recompensas {ouro, prata, bronze, participacao}
 * @param includeParticipation Se deve incluir recompensa por participação (default: true)
 * @returns Quantidade de moedas
 */
export const calculateReward = (
  position: number, 
  rewards: { ouro: number; prata: number; bronze: number; participacao?: number },
  includeParticipation: boolean = true
): number => {
  const participationReward = includeParticipation ? (rewards.participacao || 0) : 0;
  
  switch (position) {
    case 1:
      return rewards.ouro + participationReward;
    case 2:
      return rewards.prata + participationReward;
    case 3:
      return rewards.bronze + participationReward;
    default:
      // Posições além do top 3 recebem apenas participação
      return participationReward;
  }
};

/**
 * Formata a posição com sufixo ordinal
 * @param position Posição numérica
 * @returns String formatada (ex: "1º", "2º", etc.)
 */
export const formatPosition = (position: number): string => {
  return `${position}º`;
};

/**
 * Obtém a classe CSS para destacar posições no top 3
 * @param position Posição no ranking
 * @returns Classes CSS
 */
export const getPositionHighlightClass = (position: number): string => {
  switch (position) {
    case 1:
      return 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-l-4 border-yellow-400';
    case 2:
      return 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 border-l-4 border-gray-400';
    case 3:
      return 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-l-4 border-orange-400';
    default:
      return '';
  }
};

/**
 * Obtém a cor de texto para a posição
 * @param position Posição no ranking
 * @returns Classes CSS de cor de texto
 */
export const getPositionTextColor = (position: number): string => {
  switch (position) {
    case 1:
      return 'text-yellow-600 dark:text-yellow-400';
    case 2:
      return 'text-gray-600 dark:text-gray-400';
    case 3:
      return 'text-orange-600 dark:text-orange-400';
    default:
      return 'text-foreground';
  }
};

/**
 * Obtém a cor de fundo do ícone de moedas
 * @param position Posição no ranking
 * @returns Classes CSS
 */
export const getCoinIconBgColor = (position: number): string => {
  switch (position) {
    case 1:
      return 'bg-yellow-500';
    case 2:
      return 'bg-gray-400';
    case 3:
      return 'bg-orange-500';
    default:
      return 'bg-blue-500';
  }
};

/**
 * Gera animação de confetti para celebração
 * (Utilizado quando o usuário ganha moedas)
 */
export const triggerCoinAnimation = () => {
  // Esta função pode ser expandida para integrar com uma biblioteca de animações
  // Por enquanto, retorna uma flag para indicar que animação deve ser mostrada
  return {
    shouldAnimate: true,
    duration: 3000,
    colors: ['#FFD700', '#FFA500', '#FFD700']
  };
};

/**
 * Descrição textual da premiação
 * @param position Posição no ranking
 * @returns Descrição em texto
 */
export const getRewardDescription = (position: number): string => {
  switch (position) {
    case 1:
      return 'Ouro - 1º Lugar';
    case 2:
      return 'Prata - 2º Lugar';
    case 3:
      return 'Bronze - 3º Lugar';
    default:
      return 'Participante';
  }
};

