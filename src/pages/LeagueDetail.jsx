import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy, Users, Info, Calendar, ChevronLeft,
    Filter, TrendingUp, Medal, Star, Zap, Loader2, Shield, Lock,
    Copy, ExternalLink, Activity
} from 'lucide-react';
import { calculateScore } from '../utils/scoring';

const TabButton = ({ active, onClick, icon: Icon, label }) => (
    <button
        onClick={onClick}
        className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] transition-all ${active ? 'bg-volt text-black shadow-glow shadow-volt/20 scale-105 z-10' : 'text-gray-600 hover:text-white bg-white/5'}`}
    >
        <Icon size={14} />
        {label}
    </button>
);

const LeagueDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const {
        myFollowedLeaguesDetails, currentLeagueId, setCurrentLeague,
        fetchLeaderboard, activeRoundId, supabase, teams
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
            if (currentLeagueId !== id) {
                setCurrentLeague(id);
            }
            loadData();
        }
    }, [id, timeFilter, selectedMonth, activeRoundId, supabase]);

    const loadData = async () => {
        setLoading(true);
        try {
            const squads = await fetchLeaderboard();
            const { data: allStats, error: statsError } = await supabase
                .from('match_stats')
                .select('*')
                .eq('league_id', id);

            if (statsError) throw statsError;

            let filteredStats = allStats || [];
            if (timeFilter === 'MONTH') {
                filteredStats = filteredStats.filter(s => new Date(s.created_at).getMonth() === selectedMonth);
            } else if (timeFilter === 'ROUND') {
                filteredStats = filteredStats.filter(s => s.round_id === activeRoundId);
            }

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

            const teamPointsMap = {};
            teams.forEach(t => {
                teamPointsMap[t.id] = { name: t.name, points: 0 };
            });

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
        <div className="flex flex-col gap-10 animate-fade-in pb-32">
            <header className="flex flex-col gap-6 px-1">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <button onClick={() => navigate(-1)} className="p-4 bento-card text-gray-500 hover:text-white transition-all">
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bebas italic text-white leading-none tracking-tighter uppercase">{league?.name || 'DETALHES DA ARENA'}</h1>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-[8px] font-black uppercase text-volt tracking-[0.3em]">ID: {league?.invite_code || '---'}</span>
                                {league?.is_public && <div className="w-1 h-1 rounded-full bg-volt shadow-glow" />}
                            </div>
                        </div>
                    </div>
                </div>

                {isMember && (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                            setCurrentLeague(id);
                            navigate('/admin/dashboard');
                        }}
                        className={`p-6 bento-card flex items-center justify-between group transition-all ${isLeagueAdmin ? 'border-volt/30 bg-volt/5 pb-8' : 'border-white/5 opacity-80'}`}
                    >
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center border border-white/5">
                                {isLeagueAdmin ? <Activity size={20} className="text-volt animate-pulse" /> : <Lock size={20} className="text-gray-600" />}
                            </div>
                            <div className="flex flex-col items-start text-left">
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">
                                    {isLeagueAdmin ? 'CENTRO DE COMANDO' : 'ARENA DE GESTÃO'}
                                </span>
                                <span className="text-[7px] font-bold uppercase text-gray-600 tracking-widest mt-1.5 leading-none">
                                    {isLeagueAdmin ? 'Administrar competições e elenco' : 'Acesso restrito à diretoria'}
                                </span>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-volt group-hover:text-black transition-all">
                            <ExternalLink size={14} />
                        </div>
                    </motion.button>
                )}

                <div className="flex gap-2 p-1.5 bg-deep-charcoal rounded-[2rem] border border-white/5">
                    <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={Users} label="Ranking" />
                    <TabButton active={activeTab === 'teams'} onClick={() => setActiveTab('teams')} icon={Shield} label="Clubes" />
                    <TabButton active={activeTab === 'info'} onClick={() => setActiveTab('info')} icon={Info} label="Info" />
                </div>
            </header>

            {(activeTab === 'users' || activeTab === 'teams') && (
                <section className="flex flex-col gap-6 px-1">
                    <div className="flex items-center justify-between bg-deep-charcoal p-4 rounded-[2rem] border border-white/5 shadow-2xl">
                        <div className="flex gap-2">
                            {['TOTAL', 'MONTH', 'ROUND'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setTimeFilter(f)}
                                    className={`px-5 py-2.5 rounded-[1.2rem] text-[8px] font-black uppercase tracking-widest transition-all ${timeFilter === f ? 'bg-volt text-black shadow-glow' : 'text-gray-600 hover:text-white'}`}
                                >
                                    {f === 'TOTAL' ? 'Geral' : f === 'MONTH' ? 'Mês' : 'Rodada'}
                                </button>
                            ))}
                        </div>
                        {timeFilter === 'MONTH' && (
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className="bg-transparent text-[9px] font-black uppercase text-volt outline-none border-b-2 border-volt/30 pb-1 pr-2 tracking-widest"
                            >
                                {months.map((m, i) => (
                                    <option key={i} value={i} className="bg-black text-white">{m}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-6 opacity-30">
                            <Loader2 className="w-12 h-12 animate-spin text-volt" />
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Processando Ranking...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <AnimatePresence mode="popLayout">
                                {(activeTab === 'users' ? userLeaderboard : teamLeaderboard).map((item, idx) => (
                                    <motion.div
                                        key={`${activeTab}-${item.name}-${idx}`}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className={`bento-card p-5 flex items-center justify-between group transition-all ${idx === 0 ? 'border-volt/30 bg-volt/5 shadow-glow shadow-volt/5' : 'border-white/5 hover:border-white/20'}`}
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className={`text-xl font-bebas italic w-6 text-center ${idx < 3 ? 'text-volt' : 'text-gray-700'}`}>
                                                {idx + 1}
                                            </div>
                                            <div className={`w-12 h-12 rounded-2xl bg-black border border-white/5 flex items-center justify-center overflow-hidden shadow-2xl transition-transform group-hover:scale-105 ${idx < 3 ? 'border-volt/20' : ''}`}>
                                                {activeTab === 'users' ? (
                                                    item.avatar ? <img src={item.avatar} className="w-full h-full object-cover" alt={item.name} /> : <Users size={20} className="text-gray-700" />
                                                ) : (
                                                    <Shield size={20} className="text-volt opacity-50" />
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-bebas italic text-white uppercase tracking-tight leading-none">{item.name}</span>
                                                <span className="text-[7px] font-black text-gray-600 uppercase tracking-widest leading-none">
                                                    {activeTab === 'users' ? 'COMANDANTE' : 'CLUBE DA LIGA'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bebas italic text-volt leading-none">{item.points.toFixed(idx === 0 ? 1 : 1)}</div>
                                            <span className="text-[7px] font-black text-gray-700 uppercase tracking-[0.2em] mt-1 block">PONTOS</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {userLeaderboard.length === 0 && (
                                <div className="py-24 text-center flex flex-col items-center gap-6 opacity-20">
                                    <Activity size={48} />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Nenhum registro encontrado nesta arena</p>
                                </div>
                            )}
                        </div>
                    )}
                </section>
            )}

            {activeTab === 'info' && (
                <section className="px-1 animate-fade-in">
                    <div className="bento-card p-10 flex flex-col gap-10">
                        <div>
                            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-volt mb-6">Manifesto da Arena</h3>
                            <p className="text-sm font-medium text-gray-400 leading-relaxed italic">
                                Bem-vindo à arena <span className="text-white font-bold uppercase">{league?.name}</span>. 
                                Aqui, a tática supera a sorte e cada detalhe do scout define a história.
                                Prepare sua escalação e conquiste o topo.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 flex flex-col gap-2">
                                <Users size={20} className="text-volt opacity-50 mb-2" />
                                <span className="text-[9px] font-black uppercase text-gray-600 tracking-widest">Participantes</span>
                                <span className="text-3xl font-bebas italic text-white">{userLeaderboard.length}</span>
                            </div>
                            <div className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 flex flex-col gap-2">
                                <Trophy size={20} className="text-volt opacity-50 mb-2" />
                                <span className="text-[9px] font-black uppercase text-gray-600 tracking-widest">Premiação</span>
                                <span className="text-3xl font-bebas italic text-white">---</span>
                            </div>
                        </div>

                        <div className="bg-volt/5 p-8 rounded-[2.5rem] border border-volt/20 flex flex-col gap-6 shadow-glow shadow-volt/5">
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-black uppercase text-gray-500 tracking-[0.3em]">CHAVE DE ACESSO</span>
                                <span className="text-3xl font-bebas italic text-volt tracking-[0.2em] uppercase">{league?.invite_code || '------'}</span>
                            </div>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(league?.invite_code);
                                    alert('Chave copiada para a área de transferência!');
                                }}
                                className="w-full py-5 bg-white text-black rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-3 shadow-2xl"
                            >
                                <Copy size={16} /> COPIAR CHAVE
                            </button>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};

export default LeagueDetail;
