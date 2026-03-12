/**
 * Sistema de Pontuação Oficial do CTOla
 */

export const POSITION_TYPES = {
    GOLEIRO: 'GOLEIRO',
    FIXO: 'FIXO',
    LINE: 'LINE', // Jogadores 3, 4 e 5 (Ala, Pivô)
};

/**
 * Mapeia posições legíveis para os tipos internos de pontuação
 * @param {string} pos - ALA, PIVO, FIXO, GOLEIRO
 * @returns {string} internal position type
 */
export function mapPositionToType(pos) {
    const p = pos?.toUpperCase();
    if (p === 'GOLEIRO') return POSITION_TYPES.GOLEIRO;
    if (p === 'FIXO') return POSITION_TYPES.FIXO;
    if (p === 'ALA' || p === 'PIVO' || p === 'PIVÔ') return POSITION_TYPES.LINE;
    return POSITION_TYPES.LINE; // Default
}

/**
 * Calcula a pontuação de um atleta baseado em suas estatísticas
 * @param {Object} stats - Estatísticas do atleta na rodada
 * @param {string} position - GOLEIRO, FIXO ou LINE
 * @param {boolean} isCaptain - Se o jogador é o capitão do time fantasy
 * @returns {number} Pontuação final
 */
export function calculateScore(stats, position, isCaptain = false) {
    const type = mapPositionToType(position);
    let score = 0;

    // Garantir valores padrão (snake_case do DB)
    const s = {
        gols: stats.gols || 0,
        assistencias: stats.assistencias || 0,
        penaltisPerdidos: stats.penaltisperdidos || 0,
        tirosLivresDefendidos: stats.tiroslivresdefendidos || 0,
        penaltisDefendidos: stats.penaltisdefendidos || 0,
        golsSofridos: stats.golssofridos || 0,
        bonusMelhorGoleiro: stats.melhorgoleiro ? 5 : 0,
        participou: stats.participou !== undefined ? stats.participou : true,
        equipeSofreuGol: stats.equipesofreugol || false,
    };

    if (!s.participou) return 0;

    const SG = !s.equipeSofreuGol;

    switch (type) {
        case POSITION_TYPES.GOLEIRO:
            // Fórmula: 3 + SG(5) + (3 × TL) + (5 × P) − GS + BMG
            score = 3;
            if (SG) score += 5;
            score += (3 * s.tirosLivresDefendidos);
            score += (5 * s.penaltisDefendidos);
            score -= s.golsSofridos;
            score += s.bonusMelhorGoleiro;
            break;

        case POSITION_TYPES.FIXO:
            // Fórmula: SG(5) + (5 × G) + (3 × A) − (3 × PP)
            if (SG) score += 5;
            score += (5 * s.gols);
            score += (3 * s.assistencias);
            score -= (3 * s.penaltisPerdidos);
            break;

        case POSITION_TYPES.LINE:
            // Fórmula: SG(2) + (5 × G) + (3 × A) − (3 × PP)
            if (SG) score += 2;
            score += (5 * s.gols);
            score += (3 * s.assistencias);
            score -= (3 * s.penaltisPerdidos);
            break;

        default:
            break;
    }

    // Regra do Capitão: 2x a pontuação final (Qualquer posição pode ser capitão)
    if (isCaptain) {
        score *= 2;
    }

    return score;
}
