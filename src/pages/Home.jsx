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
        <div className="flex flex-col gap-6 animate-fade pb-24">
            <header className="flex flex-col gap-4 px-1">
                <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-black italic text-white flex gap-1 leading-none">
                            CT <span className="text-neon">ola</span>
                        </h1>
                        <span className="text-[7px] font-black uppercase text-gray-600 tracking-[0.4em] ml-0.5 mt-1">Fantasy League</span>
                    </div>
                    <div
                        onClick={() => navigate('/perfil')}
                        className="w-10 h-10 rounded-full bg-[#1e40af] border-2 border-white/20 flex items-center justify-center font-black text-white text-xs shadow-xl shadow-blue-900/40 overflow-hidden cursor-pointer hover:scale-105 transition-all"
                    >
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                            initials
                        )}
                    </div>
                </div>

                <RoundSelector />

                {/* Minhas Ligas Switcher */}
                <div className="flex flex-col gap-3 mt-4">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Minhas Ligas</h2>
                        <button
                            onClick={() => navigate('/explorar')}
                            className="text-[8px] font-black text-neon uppercase tracking-widest hover:underline"
                        >
                            + Entrar em Outra
                        </button>
                    </div>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                        {myFollowedLeaguesDetails.map((league) => (
                            <button
                                key={league.id}
                                onClick={() => setCurrentLeague(league.id)}
                                className={`flex-shrink-0 px-6 py-4 rounded-2xl border transition-all flex items-center gap-3 ${currentLeagueId === league.id
                                    ? 'bg-neon/10 border-neon text-neon shadow-lg shadow-neon/5'
                                    : 'bg-white/5 border-white/5 text-gray-400 opacity-60 hover:opacity-100'
                                    }`}
                            >
                                <div className={`w-2 h-2 rounded-full ${currentLeagueId === league.id ? 'bg-neon animate-pulse' : 'bg-gray-700'}`}></div>
                                <span className="text-[10px] font-black uppercase tracking-widest">{league.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* Admin Access on Home */}
                    {(() => {
                        const activeLeague = myFollowedLeaguesDetails.find(l => l.id === currentLeagueId);
                        const isLeagueAdmin = activeLeague?.role === 'OWNER' || activeLeague?.role === 'ADMIN';
                        if (!activeLeague) return null;

                        return (
                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => navigate('/admin/dashboard')}
                                className={`mt-2 p-5 rounded-[2rem] border flex items-center justify-between group transition-all ${isLeagueAdmin ? 'bg-neon/10 border-neon/30 hover:bg-neon hover:text-black' : 'bg-white/5 border-white/10 opacity-60 hover:opacity-100'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-neon/20 group-hover:bg-black/10">
                                        {isLeagueAdmin ? <Zap size={18} className="text-neon group-hover:text-black" /> : <Shield size={18} className="text-gray-500 group-hover:text-neon" />}
                                    </div>
                                    <div className="flex flex-col items-start text-left">
                                        <span className="text-[11px] font-black uppercase tracking-widest">
                                            {isLeagueAdmin ? 'Painel de Gestão Direto' : 'Acessar Área Restrita'}
                                        </span>
                                        <span className="text-[8px] font-bold uppercase opacity-60">
                                            {isLeagueAdmin ? 'Gerenciar liga atual agora' : 'Área de administração (Requer código)'}
                                        </span>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="opacity-40 group-hover:opacity-100" />
                            </motion.button>
                        );
                    })()}
                </div>
            </header>

            <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-2">
                        <Calendar size={12} className="text-gray-700" /> Histórico por Período
                    </span>
                    <div className="relative">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value))}
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase text-white outline-none focus:border-neon/30 appearance-none pr-8 cursor-pointer hover:bg-white/10 transition-all"
                        >
                            {months.map(m => (
                                <option key={m.id} value={m.id} className="bg-[#1a1d23]">{m.name}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                            <ChevronRight size={12} className="rotate-90" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="glass p-6 rounded-[2.5rem] flex flex-col gap-1 border-white/5 shadow-inner relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 w-16 h-16 bg-neon/10 blur-2xl rounded-full group-hover:bg-neon/20 transition-all"></div>
                        <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1">
                            <Zap size={8} className="text-neon" /> Pontos Rodada
                        </span>
                        <div className="text-lg font-black text-neon">{roundScore.toFixed(2)}</div>
                    </div>
                    <div className="glass p-6 rounded-[2.5rem] flex flex-col gap-1 border-white/5 shadow-inner relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/5 blur-2xl rounded-full group-hover:bg-white/10 transition-all"></div>
                        <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1">
                            <TrendingUp size={8} className="text-green-500" /> Pontos Totais
                        </span>
                        <div className="text-lg font-black text-white">{totalScore.toFixed(2)}</div>
                    </div>
                </div>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/ranking')}
                    className="w-full glass py-5 rounded-[2rem] border border-neon/20 flex items-center justify-center gap-3 group bg-neon/5 mt-2"
                >
                    <Trophy className="text-neon group-hover:rotate-12 transition-transform" size={16} />
                    <span className="text-[10px] font-black uppercase text-neon tracking-widest">Ver Classificação da Liga</span>
                </motion.button>
            </section>

            <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em]">Feed da Liga</h2>
                    <div className="flex items-center gap-1.5 bg-neon/10 px-2 py-1 rounded-full text-neon">
                        <Zap size={8} className="animate-pulse" />
                        <span className="text-[8px] font-black uppercase">Resultados</span>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <AnimatePresence mode="popLayout">
                        {feed.length > 0 ? (
                            feed.map((event, idx) => (
                                <motion.div
                                    key={event.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="glass p-5 rounded-[2rem] border border-white/5 flex items-center justify-between group hover:border-neon/10 transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
                                            {event.gols > 0 ? '⚽' : event.assistencias > 0 ? '👟' : '🛡️'}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-white">
                                                {event.athletes?.name}
                                            </span>
                                            <span className="text-[8px] font-bold text-gray-500 uppercase">
                                                {event.gols > 0 ? `${event.gols} Gols` : event.assistencias > 0 ? `${event.assistencias} Assis.` : 'SG Mantido'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-[10px] font-black italic text-neon">
                                        +{calculateScore(event, event.athletes?.pos).toFixed(1)}
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="glass p-8 rounded-[2rem] border border-white/5 text-center flex flex-col items-center gap-2 opacity-50">
                                <TrendingUp className="text-gray-800" size={24} />
                                <p className="text-[9px] font-black uppercase text-gray-600 tracking-widest leading-relaxed">
                                    Sem dados para esta rodada.
                                </p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </section>
        </div>
    );
}
