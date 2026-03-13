/**
 * Sistema de Pontuação Oficial do CTOla (Refatorado - Senior Level)
 */

export const POSITION_TYPES = {
    GOLEIRO: 'GOLEIRO',
    FIXO: 'FIXO',
    ALA: 'ALA',
    PIVO: 'PIVO',
};

// Pesos dos scouts (Game Theory Balanced)
export const SCOUT_WEIGHTS = {
    GOL: 5.0,
    ASSISTENCIA: 3.0,
    FINALIZACAO_DEFENDIDA: 1.2,
    DESARME: 1.5,
    GOLEIRO_LINHA_GOL: 8.0,
    CARTAO_AMARELO: -2.0,
    CARTAO_VERMELHO: -5.0,
    GOL_CONTRA: -5.0,
    FALTA_COMETIDA: -0.5,
    GOL_SOFRIDO: -1.0, // Apenas para goleiros
    SG_GOLEIRO: 5.0,
    SG_FIXO: 3.0,
    SG_LINHA: 1.0,
};

/**
 * Calcula a pontuação de um atleta baseado em suas estatísticas
 * @param {Object} stats - Estatísticas do atleta na rodada
 * @param {string} pos - GOLEIRO, FIXO, ALA, PIVO
 * @param {boolean} isCaptain - Se o jogador é o capitão do time fantasy
 * @returns {number} Pontuação final
 */
export function calculateScore(stats, pos, isCaptain = false) {
    if (!stats || stats.participou === false) return 0;

    let score = 0;
    const position = pos?.toUpperCase();

    // Scouts Positivos
    score += (stats.gols || 0) * SCOUT_WEIGHTS.GOL;
    score += (stats.assistencias || 0) * SCOUT_WEIGHTS.ASSISTENCIA;
    score += (stats.finalizacoes_defendidas || 0) * SCOUT_WEIGHTS.FINALIZACAO_DEFENDIDA;
    score += (stats.desarmes || 0) * SCOUT_WEIGHTS.DESARME;
    score += (stats.gols_goleiro_linha || 0) * SCOUT_WEIGHTS.GOLEIRO_LINHA_GOL;

    // Scouts Negativos
    score += (stats.cartao_amarelo || 0) * SCOUT_WEIGHTS.CARTAO_AMARELO;
    score += (stats.cartao_vermelho || 0) * SCOUT_WEIGHTS.CARTAO_VERMELHO;
    score += (stats.gol_contra || 0) * SCOUT_WEIGHTS.GOL_CONTRA;
    score += (stats.faltas_cometidas || 0) * SCOUT_WEIGHTS.FALTA_COMETIDA;

    // SG (Saldo de Gols)
    const sofreuGol = stats.equipe_sofreu_gol || stats.gols_sofridos > 0;
    if (!sofreuGol) {
        if (position === 'GOLEIRO') score += SCOUT_WEIGHTS.SG_GOLEIRO;
        else if (position === 'FIXO') score += SCOUT_WEIGHTS.SG_FIXO;
        else score += SCOUT_WEIGHTS.SG_LINHA;
    }

    // Penalidade para Goleiro (Gols Sofridos)
    if (position === 'GOLEIRO') {
        score += (stats.gols_sofridos || 0) * SCOUT_WEIGHTS.GOL_SOFRIDO;
    }

    // Regra do Capitão: 2x a pontuação final
    if (isCaptain) {
        score *= 2;
    }

    return parseFloat(score.toFixed(1));
}
