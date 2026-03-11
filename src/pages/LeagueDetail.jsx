import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy, Users, Info, Calendar, ChevronLeft,
    Filter, TrendingUp, Medal, Star, Zap, Loader2, Shield, Lock
} from 'lucide-react';
import { calculateScore } from '../utils/scoring';

const LeagueDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const {
        myFollowedLeaguesDetails, currentLeagueId, setCurrentLeague,
        fetchLeaderboard, rounds, activeRoundId, supabase, teams
    } = useStore();

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('users'); // 'users', 'teams', 'info'
    const [timeFilter, setTimeFilter] = useState('TOTAL'); // 'TOTAL', 'MONTH', 'ROUND'
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [userLeaderboard, setUserLeaderboard] = useState([]);
    const [teamLeaderboard, setTeamLeaderboard] = useState([]);

    const league = myFollowedLeaguesDetails.find(l => l.id === id);
    const isLeagueAdmin = league?.role === 'OWNER' || league?.role === 'ADMIN';
    const isMember = myFollowedLeaguesDetails.some(l => l.id === id);

    useEffect(() => {
        if (id && supabase) {
            // Set as current league if not already
            if (currentLeagueId !== id) {
                setCurrentLeague(id);
            }
            loadData();
        }
    }, [id, timeFilter, selectedMonth, activeRoundId, supabase]);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Fetch User Leaderboard (logic from Ranking.jsx)
            const squads = await fetchLeaderboard();
            const { data: allStats, error: statsError } = await supabase
                .from('match_stats')
                .select('*')
                .eq('league_id', id);

            if (statsError) throw statsError;

            // Filter stats by time
            let filteredStats = allStats || [];
            if (timeFilter === 'MONTH') {
                filteredStats = filteredStats.filter(s => new Date(s.created_at).getMonth() === selectedMonth);
            } else if (timeFilter === 'ROUND') {
                filteredStats = filteredStats.filter(s => s.round_id === activeRoundId);
            }

            // Calculate User Points
            const userPointsMap = {};
            squads.forEach(s => {
                const userId = s.user_id;
                if (!userPointsMap[userId]) {
                    userPointsMap[userId] = {
                        name: s.profiles?.name || 'Inominado',
                        avatar: s.profiles?.avatar_url,
                        points: 0
                    };
                }

                const sRoundStats = filteredStats.filter(st => st.round_id === s.round_id);
                Object.entries(s.squad_data || {}).forEach(([slot, athleteId]) => {
                    const stats = sRoundStats.find(st => st.athlete_id === athleteId);
                    if (stats) {
                        const isCaptain = s.captain_id === athleteId;
                        const pos = slot === 'goleiro' ? 'GOLEIRO' : slot === 'fixo' ? 'FIXO' : 'LINE';
                        userPointsMap[userId].points += calculateScore(stats, pos, isCaptain);
                    }
                });
            });

            setUserLeaderboard(Object.values(userPointsMap).sort((a, b) => b.points - a.points));

            // 2. Calculate Team Leaderboard (sum of athletes' points)
            const teamPointsMap = {};
            // Initialize teams
            teams.forEach(t => {
                teamPointsMap[t.id] = { name: t.name, points: 0 };
            });

            // Re-fetch athletes to get team association and position
            const { data: athletesData } = await supabase.from('athletes').select('id, team_id, pos');

            filteredStats.forEach(st => {
                const athlete = athletesData?.find(a => a.id === st.athlete_id);
                if (athlete && teamPointsMap[athlete.team_id]) {
                    const pos = athlete.pos || 'LINE';
                    teamPointsMap[athlete.team_id].points += calculateScore(st, pos, false);
                }
            });

            setTeamLeaderboard(Object.values(teamPointsMap).sort((a, b) => b.points - a.points));

        } catch (err) {
            console.error('League detail error:', err);
        } finally {
            setLoading(false);
        }
    };

    const months = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    return (
        <div className="flex flex-col gap-6 animate-fade pb-24">
            <header className="flex flex-col gap-4 px-1">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-3 glass rounded-2xl text-gray-400 hover:text-white border-white/5 transition-all">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black italic uppercase tracking-tighter">{league?.name || 'Detalhes da Liga'}</h1>
                        <span className="text-[8px] font-black uppercase text-neon tracking-[0.2em]">Cód: {league?.invite_code || '---'}</span>
                    </div>
                </div>

                {isMember && (
                    <motion.button
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => {
                            setCurrentLeague(id);
                            navigate('/admin/dashboard');
                        }}
                        className={`p-4 rounded-3xl flex items-center justify-between group transition-all border ${isLeagueAdmin ? 'bg-neon/10 border-neon/30 hover:bg-neon hover:text-black' : 'bg-white/5 border-white/10 hover:border-neon/30'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-neon/20 group-hover:bg-black/10">
                                {isLeagueAdmin ? (
                                    <Zap size={14} className="text-neon group-hover:text-black" />
                                ) : (
                                    <Lock size={14} className="text-gray-500 group-hover:text-neon" />
                                )}
                            </div>
                            <div className="flex flex-col items-start text-left">
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    {isLeagueAdmin ? 'Painel de Gestão' : 'Área de Gestão Limitada'}
                                </span>
                                <span className="text-[7px] font-bold uppercase opacity-60">
                                    {isLeagueAdmin ? 'Gerenciar Times e Atletas' : 'Acesso Restrito via Código'}
                                </span>
                            </div>
                        </div>
                        <ChevronLeft size={16} className="rotate-180 opacity-40 group-hover:opacity-100" />
                    </motion.button>
                )}

                <div className="flex gap-2 p-1 bg-[#1a1d23] rounded-2xl border border-white/5">
                    {[
                        { id: 'users', label: 'Ranking Usuários', icon: Users },
                        { id: 'teams', label: 'Ranking Times', icon: Shield },
                        { id: 'info', label: 'Informações', icon: Info }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-neon text-black neo-shadow' : 'text-gray-500 hover:text-white'}`}
                        >
                            <tab.icon size={12} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            {(activeTab === 'users' || activeTab === 'teams') && (
                <section className="flex flex-col gap-4 px-1">
                    <div className="flex items-center justify-between bg-white/5 p-4 rounded-3xl border border-white/5">
                        <div className="flex gap-2">
                            {['TOTAL', 'MONTH', 'ROUND'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setTimeFilter(f)}
                                    className={`px-4 py-2 rounded-xl text-[7px] font-black uppercase tracking-widest transition-all ${timeFilter === f ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                                >
                                    {f === 'TOTAL' ? 'Geral' : f === 'MONTH' ? 'Mês' : 'Rodada'}
                                </button>
                            ))}
                        </div>
                        {timeFilter === 'MONTH' && (
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className="bg-transparent text-[8px] font-black uppercase text-neon outline-none border-b border-neon/30 pb-0.5"
                            >
                                {months.map((m, i) => (
                                    <option key={i} value={i} className="bg-[#0f1115]">{m}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                            <Loader2 className="w-10 h-10 animate-spin text-neon" />
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Atualizando Dados...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            <AnimatePresence mode="popLayout">
                                {(activeTab === 'users' ? userLeaderboard : teamLeaderboard).map((item, idx) => (
                                    <motion.div
                                        key={`${activeTab}-${item.name}-${idx}`}
                                        layout
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 400,
                                            damping: 30,
                                            delay: idx * 0.03
                                        }}
                                        className={`glass p-5 rounded-[2rem] flex items-center justify-between border-white/5 bg-white/5 ${idx === 0 ? 'border-neon/20 bg-neon/5 shadow-[0_0_20px_rgba(0,245,255,0.05)]' : ''}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className={`text-xs font-black italic w-4 ${idx === 0 ? 'text-neon' : 'text-gray-600'}`}>{idx + 1}º</span>
                                            <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-lg overflow-hidden">
                                                {activeTab === 'users' ? (
                                                    item.avatar ? <img src={item.avatar} className="w-full h-full object-cover" alt={item.name} /> : <Users size={18} className="text-gray-600" />
                                                ) : (
                                                    <Shield size={18} className="text-neon/50" />
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-white">{item.name}</span>
                                                <span className="text-[7px] font-bold text-gray-600 uppercase">
                                                    {activeTab === 'users' ? 'Dono da Equipe' : 'Time da Liga'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-black text-neon italic">{item.points.toFixed(2)}</div>
                                            <span className="text-[7px] font-black text-gray-700 uppercase tracking-widest">PTS</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </section>
            )}

            {activeTab === 'info' && (
                <section className="px-1 flex flex-col gap-4">
                    <div className="glass p-8 rounded-[2.5rem] border border-white/5 flex flex-col gap-6">
                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-4">Sobre a Liga</h3>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Bem-vindo à <span className="text-white font-bold">{league?.name}</span>.
                                Dispute ponto a ponto com seus amigos e veja quem entende mais de futsal.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 p-6 rounded-3xl border border-white/5 flex flex-col gap-1">
                                <span className="text-[7px] font-black uppercase text-gray-600">Participantes</span>
                                <span className="text-xl font-black italic text-white">{userLeaderboard.length}</span>
                            </div>
                            <div className="bg-white/5 p-6 rounded-3xl border border-white/5 flex flex-col gap-1">
                                <span className="text-[7px] font-black uppercase text-gray-600">Times de Futsal</span>
                                <span className="text-xl font-black italic text-white">{teamLeaderboard.length}</span>
                            </div>
                        </div>

                        <div className="bg-neon/5 p-6 rounded-[2rem] border border-neon/20 flex items-center justify-between">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[7px] font-black uppercase text-gray-500 tracking-widest">Código da Liga</span>
                                <span className="text-sm font-black text-neon tracking-[0.3em] uppercase">{league?.invite_code}</span>
                            </div>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(league?.invite_code);
                                    alert('Código copiado!');
                                }}
                                className="text-[8px] font-black uppercase bg-white text-black px-4 py-2 rounded-xl"
                            >
                                Copiar
                            </button>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};

export default LeagueDetail;
