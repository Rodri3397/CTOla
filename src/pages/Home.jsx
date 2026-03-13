import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Zap, TrendingUp, Users, Calendar, ChevronRight, Trophy, Shield, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { calculateScore } from '../utils/scoring';
import RoundSelector from '../components/RoundSelector';

export default function Home() {
    const {
        teams, fetchLeagueData, feed, loading, activeRoundId, rounds,
        currentLeagueId, setCurrentLeague, supabase, profile, myFollowedLeaguesDetails
    } = useStore();
    const navigate = useNavigate();
    const [selectedMonth, setSelectedMonth] = useState('ALL');
    const [allStats, setAllStats] = useState([]);
    const [dbSquad, setDbSquad] = useState(null);

    useEffect(() => {
        if (currentLeagueId) {
            fetchLeagueData();
            fetchAllStats();
            loadSquad();
        }
    }, [currentLeagueId, activeRoundId]);

    const loadSquad = async () => {
        const { fetchUserSquad } = useStore.getState();
        const squad = await fetchUserSquad();
        setDbSquad(squad);
    };

    const fetchAllStats = async () => {
        if (!currentLeagueId) return;
        const { data, error } = await supabase
            .from('match_stats')
            .select('*')
            .eq('league_id', currentLeagueId);
        if (!error) setAllStats(data || []);
    };

    if (!currentLeagueId) {
        return (
            <div className="flex flex-col gap-12 animate-fade py-10 items-center text-center">
                <header className="flex flex-col items-center gap-6">
                    <div className="w-24 h-24 bg-neon/10 rounded-[3rem] flex items-center justify-center border border-neon/20 shadow-2xl shadow-neon/10 animate-pulse">
                        <Trophy className="text-neon" size={48} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Bem-vindo ao CTOlá</h1>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-4 px-10 leading-loose">
                            Sua jornada no fantasy futsal começa agora. Escolha uma liga para começar a competir ou crie a sua própria!
                        </p>
                    </div>
                </header>

                <div className="flex flex-col gap-4 w-full px-4">
                    <button
                        onClick={() => navigate('/explorar')}
                        className="w-full bg-white text-black py-6 rounded-[2rem] font-black text-xs uppercase shadow-2xl hover:bg-neon hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        Descobrir Ligas <ChevronRight size={16} />
                    </button>
                    <button
                        onClick={() => navigate('/admin/dashboard')}
                        className="w-full glass py-6 rounded-[2rem] border border-white/10 font-black text-[10px] uppercase text-gray-400 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                        <Zap size={14} className="text-neon" /> Gerenciar Minha Liga
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full max-xs mt-10">
                    <div className="flex flex-col items-center gap-2 opacity-40">
                        <Users size={20} />
                        <span className="text-[8px] font-bold uppercase tracking-widest">Multi-usuários</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 opacity-40">
                        <Shield className="text-green-500" size={20} />
                        <span className="text-[8px] font-bold uppercase tracking-widest">PWA Instalável</span>
                    </div>
                </div>
            </div>
        );
    }

    const months = [
        { id: 'ALL', name: 'Geral' },
        { id: 2, name: 'Março' },
        { id: 3, name: 'Abril' },
        { id: 4, name: 'Maio' }
    ];

    const getScores = () => {
        const squad = dbSquad?.squad_data;
        const capId = dbSquad?.captain_id;
        if (!squad) return { round: 0, total: 0 };

        let roundTotal = 0;
        let cumulativeTotal = 0;

        Object.entries(squad).forEach(([slot, player]) => {
            if (player) {
                // Round score (from feed which is filtered by activeRoundId)
                const roundPlayerStats = feed.find(f => f.athlete_id === player.id) || {};
                roundTotal += calculateScore(roundPlayerStats, player.pos, capId === slot);

                // Cumulative score (optionally filtered by month)
                const playerAllStats = allStats.filter(s => {
                    const matchesPlayer = s.athlete_id === player.id;
                    if (!matchesPlayer) return false;
                    if (selectedMonth === 'ALL') return true;
                    // match_stats created_at month (0-indexed)
                    const month = new Date(s.created_at).getMonth();
                    return month === selectedMonth;
                });

                playerAllStats.forEach(stat => {
                    // Fallback position detection from slot
                    const pos = slot === 'goleiro' ? 'GOLEIRO' : slot === 'fixo' ? 'FIXO' : 'LINE';
                    cumulativeTotal += calculateScore(stat, pos, capId === slot);
                });
            }
        });
        return { round: roundTotal, total: cumulativeTotal };
    };

    const { round: roundScore, total: totalScore } = getScores();

    const SkeletonItem = () => (
        <div className="bg-deep-charcoal p-5 rounded-[2.5rem] border border-white/5 flex items-center justify-between animate-pulse opacity-40">
            <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-black/40" />
                <div className="flex flex-col gap-2">
                    <div className="w-24 h-2 bg-white/10 rounded-full" />
                    <div className="w-16 h-1.5 bg-white/5 rounded-full" />
                </div>
            </div>
            <div className="w-10 h-4 bg-white/10 rounded-full" />
        </div>
    );

    return (
        <div className="flex flex-col gap-10 animate-fade-in pb-32">
            {/* Header Premium */}
            <header className="flex flex-col gap-8 px-1">
                <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                        <h1 className="text-5xl font-bebas italic text-white leading-none tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                            CT<span className="text-volt">OLA</span>
                        </h1>
                        <span className="text-[10px] font-inter font-black uppercase text-gray-700 tracking-[0.5em] ml-0.5 mt-2">
                            Futsal Fantasy League
                        </span>
                    </div>
                </div>

                {/* Bento Grid Principal */}
                <div className="grid grid-cols-2 gap-5">
                    {/* Card de Boas-vindas / Próximo Jogo */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="col-span-2 bento-card flex flex-col justify-between min-h-[180px] bg-gradient-to-br from-[#0d0d0d] via-black to-[#0a0a0a] relative overflow-hidden group border-white/10"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity blur-[2px]">
                            <Trophy size={110} className="text-volt" />
                        </div>
                        <div className="relative z-10">
                            <span className="text-[10px] font-black uppercase text-gray-600 tracking-[0.3em] mb-3 block">Liga em Destaque</span>
                            <h2 className="text-3xl font-bebas text-white leading-tight uppercase truncate max-w-[240px]">
                                {myFollowedLeaguesDetails.find(l => l.id === currentLeagueId)?.name || 'Nenhuma Liga'}
                            </h2>
                        </div>
                        <div className="relative z-10 flex items-center justify-between mt-8">
                            <RoundSelector />
                            <motion.button 
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => navigate('/ranking')}
                                className="w-12 h-12 rounded-2xl bg-volt flex items-center justify-center text-black shadow-[0_8px_25px_rgba(223,255,0,0.4)] transition-all"
                            >
                                <ChevronRight size={24} strokeWidth={3} />
                            </motion.button>
                        </div>
                    </motion.div>

                    {/* Card de Pontos da Rodada */}
                    <div className="bento-card flex flex-col gap-3 relative group overflow-hidden border-white/5">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-volt group-hover:scale-110 transition-transform blur-sm">
                            <Zap size={80} />
                        </div>
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Sua Rodada</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-4xl font-bebas text-volt tracking-tighter">{roundScore.toFixed(1)}</span>
                            <span className="text-[12px] font-black text-gray-700 uppercase">PTS</span>
                        </div>
                        <div className="mt-3 h-1.5 w-full bg-white/5 rounded-full overflow-hidden shadow-inner">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: roundScore > 0 ? '75%' : '5%' }}
                                className="h-full bg-gradient-to-r from-volt to-green-400 shadow-[0_0_10px_rgba(223,255,0,0.5)]"
                                transition={{ duration: 1.5, ease: "easeOut" }}
                            />
                        </div>
                    </div>

                    {/* Card de Patrimonio / Total */}
                    <div className="bento-card flex flex-col gap-3 relative group overflow-hidden border-white/5">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.03] text-white group-hover:scale-110 transition-transform blur-sm">
                            <TrendingUp size={80} />
                        </div>
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Patrimônio</span>
                        <div className="flex flex-col">
                            <span className="text-4xl font-bebas text-white tracking-tighter">C$ {totalScore.toFixed(1)}</span>
                            <span className="text-[9px] font-black text-green-500/80 uppercase tracking-widest mt-2 flex items-center gap-1">
                                <TrendingUp size={10} /> Alta Mensal
                            </span>
                        </div>
                    </div>
                </div>

                {/* Minhas Ligas Horizontal */}
                <div className="flex flex-col gap-5 mt-4">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-[12px] font-black text-gray-700 uppercase tracking-[0.4em]">Minhas Divisões</h2>
                        <button onClick={() => navigate('/explorar')} className="text-[10px] font-black text-volt uppercase tracking-widest hover:brightness-125 transition-all">Explorar</button>
                    </div>
                    <div className="flex gap-4 overflow-x-auto no-scrollbar py-2 -mx-1 px-1">
                        {myFollowedLeaguesDetails.map((league) => (
                            <motion.button
                                key={league.id}
                                whileHover={{ y: -4 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setCurrentLeague(league.id)}
                                className={`flex-shrink-0 px-8 py-5 rounded-[2.2rem] border transition-all flex items-center gap-4 ${currentLeagueId === league.id
                                    ? 'bg-volt text-black shadow-[0_15px_35px_rgba(223,255,0,0.2)] border-volt'
                                    : 'bg-[#0d0d0d] border-white/5 text-gray-600 hover:text-white hover:border-white/20'
                                    }`}
                            >
                                <Shield size={16} className={currentLeagueId === league.id ? 'text-black' : 'text-volt'} />
                                <span className="text-[12px] font-black uppercase tracking-widest">{league.name}</span>
                            </motion.button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Feed Section (Premium List) */}
            <section className="flex flex-col gap-8 px-1">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-[12px] font-black text-gray-600 uppercase tracking-[0.4em]">Radar da Rodada</h2>
                        <span className="text-[8px] font-bold text-gray-800 uppercase tracking-widest">Principais acontecimentos</span>
                    </div>
                    <div className="px-4 py-2 bg-black rounded-2xl border border-white/5 shadow-2xl">
                        <span className="text-[9px] font-black uppercase text-volt animate-pulse tracking-widest flex items-center gap-2">
                             AO VIVO
                        </span>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    {loading ? (
                        Array(5).fill(0).map((_, i) => <SkeletonItem key={i} />)
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {feed.length > 0 ? (
                                feed.map((event, idx) => (
                                    <motion.div
                                        key={event.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="bg-[#0d0d0d] p-6 rounded-[2.5rem] border border-white/5 flex items-center justify-between hover:bg-black hover:border-white/10 transition-all shadow-xl group"
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className="w-14 h-14 rounded-2xl bg-black border border-white/5 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform shadow-inner">
                                                {event.gols > 0 ? '⚽' : event.assistencias > 0 ? '👟' : '🛡️'}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[14px] font-black text-white italic tracking-tighter uppercase leading-none">
                                                    {event.athletes?.name}
                                                </span>
                                                <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest mt-2 flex items-center gap-2">
                                                    {event.athletes?.pos} <span className="w-1 h-1 rounded-full bg-white/10" /> {event.gols > 0 ? 'GOLEADOR' : event.assistencias > 0 ? 'GARÇOM' : 'PAREDÃO'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <div className="text-2xl font-bebas text-volt italic leading-none drop-shadow-[0_0_8px_rgba(223,255,0,0.3)]">
                                                +{calculateScore(event, event.athletes?.pos).toFixed(1)}
                                            </div>
                                            <span className="text-[8px] font-black text-gray-800 uppercase mt-1">PONTOS</span>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="bento-card py-24 text-center flex flex-col items-center gap-6 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all cursor-default"
                                >
                                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                        <TrendingUp size={32} className="text-gray-500" />
                                    </div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.4em] max-w-[220px] leading-relaxed text-gray-500">
                                        Aguardando os primeiros Scouts da Arena.
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    )}
                </div>
            </section>
        </div>
    );
}
