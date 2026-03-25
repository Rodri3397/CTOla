import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Zap, TrendingUp, Users, Calendar, ChevronRight, Trophy, Shield, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { calculateScore } from '../utils/scoring';
import RoundSelector from '../components/RoundSelector';

export default function Home() {
    const {
        teams, fetchLeagueData, feed, loading, activeRoundId, rounds,
        currentLeagueId, setCurrentLeague, supabase, profile, myFollowedLeaguesDetails,
        athletes
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
                const roundPlayerStats = (feed || []).find(f => f.athlete_id === player.id) || {};
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
                    const pos = player?.pos || (slot === 'goleiro' ? 'GOLEIRO' : slot === 'fixo' ? 'FIXO' : 'ALA');
                    cumulativeTotal += calculateScore(stat, pos, capId === slot);
                });
            }
        });
        return { round: roundTotal, total: cumulativeTotal };
    };

    const { round: roundScore, total: totalScore } = getScores();

    // Calculate real budget for the bar
    const budgetData = useMemo(() => {
        const squad = dbSquad?.squad_data || {};
        const cost = Object.values(squad).reduce((acc, id) => {
            const athlete = (athletes || []).find(a => String(a.id) === String(id));
            return acc + (athlete?.price || 0);
        }, 0);
        const patrimony = parseFloat(profile?.wallet) || 100.0;
        return { patrimony, cost, balance: patrimony - cost };
    }, [dbSquad, athletes]);

    // Calculate Top Scorers of the Round
    const topScorers = useMemo(() => {
        if (!allStats || allStats.length === 0) return [];
        const roundStats = allStats.filter(s => s.round_id === activeRoundId);
        return roundStats
            .map(s => {
                const athlete = (feed || []).find(f => f.athlete_id === s.athlete_id)?.athletes || 
                                ((teams || []).flatMap(t => t.athletes || []).find(a => a.id === s.athlete_id));
                return {
                    ...s,
                    athlete_name: athlete?.name || 'Atleta',
                    athlete_pos: athlete?.pos || 'N/A'
                };
            })
            .sort((a, b) => b.points - a.points)
            .slice(0, 3);
    }, [allStats, activeRoundId, feed, teams]);

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
            <header className="flex flex-col gap-6 px-1">
                <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                        {currentLeagueId && (
                            <div className="flex items-center gap-2 mb-2 px-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-volt shadow-glow animate-pulse" />
                                <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em]">Arena Selecionada</span>
                            </div>
                        )}
                        <div className="flex items-baseline gap-3">
                            <h1 className="text-5xl font-bebas italic text-white leading-none tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                                CT<span className="text-volt">OLA</span>
                            </h1>
                            {currentLeagueId && (
                                <span className="text-lg font-bebas italic text-volt/60 tracking-tight brightness-110">
                                    / {(myFollowedLeaguesDetails || []).find(l => l.id === currentLeagueId)?.name || 'Arena'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Budget Bar - Fixed at top of content */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bento-card py-3 px-4 flex flex-col gap-1 items-center bg-black/40">
                        <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest">Patrimônio</span>
                        <span className="text-base font-bebas text-white">C$ {budgetData.patrimony.toFixed(1)}</span>
                    </div>
                    <div className="bento-card py-3 px-4 flex flex-col gap-1 items-center border-volt/20 bg-volt/5">
                        <span className="text-[7px] font-black text-volt/60 uppercase tracking-widest">Custo</span>
                        <span className="text-base font-bebas text-volt">C$ {budgetData.cost.toFixed(1)}</span>
                    </div>
                    <div className="bento-card py-3 px-4 flex flex-col gap-1 items-center bg-black/40">
                        <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest">Saldo</span>
                        <span className={`text-base font-bebas ${budgetData.balance < 0 ? 'text-electric-crimson' : 'text-white'}`}>C$ {budgetData.balance.toFixed(1)}</span>
                    </div>
                </div>

                {/* League Selection Tabs - Moved to Top */}
                <div className="flex flex-col gap-3">
                    <span className="text-[8px] font-black text-gray-700 uppercase tracking-[0.4em] px-1">Selecione sua Arena</span>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                        {myFollowedLeaguesDetails.map((league) => (
                            <button
                                key={league.id}
                                onClick={() => setCurrentLeague(league.id)}
                                className={`flex-shrink-0 px-6 py-3 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest ${currentLeagueId === league.id
                                    ? 'bg-volt text-black border-volt shadow-glow'
                                    : 'bg-white/5 border-white/5 text-gray-500 hover:text-white hover:border-white/10'
                                    }`}
                            >
                                {league.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Primary Stats */}
                <div className="grid grid-cols-1">
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bento-card flex flex-col gap-3 relative group overflow-hidden border-volt/20 bg-volt/5 py-8 items-center"
                        onClick={() => navigate(`/league/${currentLeagueId}`)}
                    >
                        <div className="absolute -right-4 -bottom-4 opacity-[0.05] text-volt blur-sm">
                            <Trophy size={100} />
                        </div>
                        <span className="text-[9px] font-black text-volt uppercase tracking-widest">Sua Pontuação na Rodada</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-6xl font-bebas text-white tracking-tighter">{roundScore.toFixed(1)}</span>
                            <span className="text-sm font-black text-gray-600 uppercase">PTS</span>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-[8px] font-black text-gray-500 uppercase tracking-widest border border-white/10 px-4 py-2 rounded-full">
                            Entrar na Arena <ChevronRight size={10} />
                        </div>
                    </motion.div>
                </div>

                {/* Destaques da Rodada - Novo Requirement */}
                <div className="flex flex-col gap-5">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-3">
                            <Trophy size={14} className="text-volt" />
                            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Mitos da Rodada</h2>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {topScorers.length > 0 ? topScorers.map((s, i) => (
                            <div key={i} className="bento-card p-4 flex flex-col items-center text-center gap-2 border-white/5 bg-black/40">
                                <div className="w-10 h-10 rounded-xl bg-volt/10 flex items-center justify-center text-xl shadow-inner border border-volt/10">
                                   {s.athlete_pos === 'GOLEIRO' ? '🧤' : '🏃'}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-white uppercase truncate w-20 leading-tight">{s.athlete_name}</span>
                                    <span className="text-[12px] font-bebas text-volt italic mt-1">{s.points.toFixed(1)} pts</span>
                                </div>
                            </div>
                        )) : (
                            <div className="col-span-3 py-6 text-center opacity-20">
                                <span className="text-[8px] font-black uppercase tracking-widest">Aguardando Scouts...</span>
                            </div>
                        )}
                    </div>
                </div>

            </header>

            {/* Feed Section */}
            <section className="flex flex-col gap-8 px-1">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em]">Radar de Eventos</h2>
                        <span className="text-[8px] font-bold text-gray-800 uppercase tracking-widest">Atividade em tempo real</span>
                    </div>
                    <div className="px-4 py-2 bg-black rounded-2xl border border-white/5 shadow-2xl">
                        <span className="text-[9px] font-black uppercase text-volt animate-pulse tracking-widest flex items-center gap-2">
                             LIVE
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
                                                    {event.athletes?.pos} <span className="w-1 h-1 rounded-full bg-white/10" /> {event.gols > 0 ? 'MARCOU' : event.assistencias > 0 ? 'ASSISTÊNCIA' : 'SCOUT'}
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
