import { calculateScore, POSITION_TYPES } from './scoring.js';

const tests = [
    {
        name: "Goleiro SG + 1 Defesa Pênalti",
        position: POSITION_TYPES.GOLEIRO,
        stats: { participou: true, equipeSofreuGol: false, penaltisDefendidos: 1 },
        expected: 3 + 5 + 5 // 13
    },
    {
        name: "Fixo com 1 Gol e 1 Assistência",
        position: POSITION_TYPES.FIXO,
        stats: { participou: true, equipeSofreuGol: true, gols: 1, assistencias: 1 },
        expected: 5 + 3 // 8
    },
    {
        name: "Capitão (Line) com 1 Gol e SG",
        position: POSITION_TYPES.LINE,
        isCaptain: true,
        stats: { participou: true, equipeSofreuGol: false, gols: 1 },
        expected: (2 + 5) * 2 // 14
    }
];

console.log("=== CTOla Scoring Logic Test ===");
tests.forEach(t => {
    const result = calculateScore(t.stats, t.position, t.isCaptain);
    console.log(`${t.name}: ${result === t.expected ? '✅' : '❌'} (Result: ${result}, Expected: ${t.expected})`);
});
