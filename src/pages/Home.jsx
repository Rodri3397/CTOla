import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Zap, TrendingUp, Users, Calendar, ChevronRight, Trophy, Shield } from 'lucide-react';
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

                <div className="grid grid-cols-2 gap-4 w-full max-w-xs mt-10">
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
    const initials = profile?.name ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??';

    return (
        <div className="flex flex-col gap-8 animate-fade-in pb-32">
            {/* Header Premium */}
            <header className="flex flex-col gap-6 px-1">
                <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                        <h1 className="text-4xl font-bebas italic text-white leading-none tracking-tight">
                            CT<span className="text-volt">OLA</span>
                        </h1>
                        <span className="text-[9px] font-inter font-black uppercase text-gray-600 tracking-[0.4em] ml-0.5 mt-1">
                            Futsal Fantasy League
                        </span>
                    </div>
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/perfil')}
                        className="w-12 h-12 rounded-2xl bg-deep-charcoal border border-white/10 flex items-center justify-center font-black text-white text-xs shadow-2xl overflow-hidden cursor-pointer"
                    >
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                            <User className="text-gray-500" size={20} />
                        )}
                    </motion.div>
                </div>

                {/* Bento Grid Principal */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Card de Boas-vindas / Próximo Jogo */}
                    <div className="col-span-2 bento-card flex flex-col justify-between min-h-[160px] bg-gradient-to-br from-deep-charcoal to-black relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Trophy size={80} className="text-volt" />
                        </div>
                        <div className="relative z-10">
                            <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2 block">Liga Ativa</span>
                            <h2 className="text-2xl font-bebas text-white leading-tight uppercase truncate max-w-[200px]">
                                {myFollowedLeaguesDetails.find(l => l.id === currentLeagueId)?.name || 'Nenhuma Liga'}
                            </h2>
                        </div>
                        <div className="relative z-10 flex items-center justify-between mt-6">
                            <RoundSelector />
                            <motion.button 
                                whileTap={{ scale: 0.9 }}
                                onClick={() => navigate('/ranking')}
                                className="w-10 h-10 rounded-xl bg-volt flex items-center justify-center text-black shadow-[0_5px_15px_rgba(223,255,0,0.3)]"
                            >
                                <ChevronRight size={20} />
                            </motion.button>
                        </div>
                    </div>

                    {/* Card de Pontos da Rodada */}
                    <div className="bento-card flex flex-col gap-2 relative group overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 opacity-5 text-volt group-hover:scale-110 transition-transform">
                            <Zap size={60} />
                        </div>
                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Rodada Atual</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bebas text-volt">{roundScore.toFixed(1)}</span>
                            <span className="text-[10px] font-bold text-gray-600 uppercase">PTS</span>
                        </div>
                        <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: '65%' }}
                                className="h-full bg-volt"
                            />
                        </div>
                    </div>

                    {/* Card de Patrimonio / Total */}
                    <div className="bento-card flex flex-col gap-2 relative group overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 opacity-5 text-white group-hover:scale-110 transition-transform">
                            <TrendingUp size={60} />
                        </div>
                        <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Saldo Total</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bebas text-white">C$ {totalScore.toFixed(0)}</span>
                        </div>
                        <span className="text-[7px] font-bold text-green-500 uppercase tracking-tighter mt-1">+12.4% este mês</span>
                    </div>
                </div>

                {/* Minhas Ligas Horizontal */}
                <div className="flex flex-col gap-4 mt-2">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Suas Ligas</h2>
                        <button onClick={() => navigate('/explorar')} className="text-[9px] font-black text-volt uppercase tracking-widest hover:brightness-125 transition-all">+ Ver Todas</button>
                    </div>
                    <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
                        {myFollowedLeaguesDetails.map((league) => (
                            <motion.button
                                key={league.id}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setCurrentLeague(league.id)}
                                className={`flex-shrink-0 px-8 py-5 rounded-[2rem] border transition-all flex items-center gap-4 ${currentLeagueId === league.id
                                    ? 'bg-volt text-black shadow-[0_10px_25px_rgba(223,255,0,0.2)] border-volt'
                                    : 'bg-deep-charcoal border-white/5 text-gray-500 hover:text-white'
                                    }`}
                            >
                                <Shield size={16} />
                                <span className="text-[11px] font-black uppercase tracking-widest">{league.name}</span>
                            </motion.button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Feed Section (Premium List) */}
            <section className="flex flex-col gap-6 px-1">
                <div className="flex items-center justify-between">
                    <h2 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em]">Resumo da Rodada</h2>
                    <div className="px-3 py-1 bg-volt/10 rounded-full border border-volt/20">
                        <span className="text-[8px] font-black uppercase text-volt animate-pulse tracking-widest">LIVE NOW</span>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <AnimatePresence mode="popLayout">
                        {feed.length > 0 ? (
                            feed.map((event, idx) => (
                                <motion.div
                                    key={event.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="bg-deep-charcoal p-5 rounded-[2.5rem] border border-white/5 flex items-center justify-between active:scale-[0.98] transition-all"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-2xl border border-white/5">
                                            {event.gols > 0 ? '⚽' : event.assistencias > 0 ? '👟' : '🛡️'}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-white italic tracking-tighter uppercase leading-none">
                                                {event.athletes?.name}
                                            </span>
                                            <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                                                {event.athletes?.pos} <span className="w-1 h-1 rounded-full bg-white/10" /> {event.gols > 0 ? 'GOL' : event.assistencias > 0 ? 'ASSIT.' : 'DEFS.'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-xl font-bebas text-volt italic leading-none">
                                        +{calculateScore(event, event.athletes?.pos).toFixed(1)}
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="bento-card py-16 text-center flex flex-col items-center gap-4 opacity-40 grayscale">
                                <TrendingUp size={32} />
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] max-w-[200px] leading-relaxed">
                                    Nenhum evento registrado nesta rodada ainda.
                                </p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </section>
        </div>
    );
}
