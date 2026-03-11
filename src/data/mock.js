/**
 * Mock Data & Initial State for CTAola FC
 */

export const INITIAL_TEAMS = [
    "Abutres FC",
    "Panteras",
    "Leões de Judá",
    "Fênix Futsal",
    "Dragões",
    "Águias",
    "Vips Futsal",
    "Amigos do Colegial",
    "Elite FC",
    "Galácticos",
    "Tubarões",
    "Titãs",
    "Lobos",
    "Falcões"
];

// Aliases for compatibility
export const TEAMS = INITIAL_TEAMS;

export const INITIAL_ATHLETES = [
    { id: 1, name: "Rodrigo Lucena", team: "Abutres FC", pos: "LINE", price: 15.5, photo: "⚽", avg: 8.5 },
    { id: 2, name: "Goleiro Paredão", team: "Leões de Judá", pos: "GOLEIRO", price: 12.0, photo: "🧤", avg: 7.2 },
    { id: 3, name: "Fixo Titã", team: "Panteras", pos: "FIXO", price: 14.2, photo: "🛡️", avg: 6.8 },
    { id: 4, name: "Ala Veloz", team: "Fênix Futsal", pos: "LINE", price: 10.0, photo: "🏃", avg: 5.5 },
    { id: 5, name: "Pivô Matador", team: "Dragões", pos: "LINE", price: 18.0, photo: "🔥", avg: 9.1 },
    { id: 6, name: "Murilo Fixo", team: "Águias", pos: "FIXO", price: 11.5, photo: "🧱", avg: 6.2 },
    { id: 7, name: "Mão Santa", team: "Abutres FC", pos: "GOLEIRO", price: 10.0, photo: "🧤", avg: 7.0 },
    { id: 8, name: "Artilheiro Amigo", team: "Amigos do Colegial", pos: "LINE", price: 20.0, photo: "🎯", avg: 8.8 }
];

export const ATHLETES = INITIAL_ATHLETES;

export const INITIAL_ROUNDS = [
    {
        id: 1,
        status: 'closed',
        matches: [
            { id: 101, home: "Abutres FC", away: "Panteras", scoreHome: 3, scoreAway: 2, time: "18:00", score: "3x2" },
            { id: 102, home: "Leões de Judá", away: "Fênix Futsal", scoreHome: 0, scoreAway: 1, time: "19:00", score: "0x1" },
            { id: 103, home: "Dragões", away: "Águias", scoreHome: 2, scoreAway: 2, time: "20:00", score: "2x2" }
        ]
    },
    {
        id: 2,
        status: 'open',
        matches: [
            { id: 201, home: "Abutres FC", away: "Leões de Judá", scoreHome: 0, scoreAway: 0, time: "09:00", score: null },
            { id: 202, home: "Panteras", away: "Fênix Futsal", scoreHome: 0, scoreAway: 0, time: "10:30", score: null }
        ]
    }
];

// Extract matches for compatibility with MatchCenter
export const MATCHES = INITIAL_ROUNDS[1].matches;
