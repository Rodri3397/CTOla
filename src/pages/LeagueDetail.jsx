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
    const [activeTab, setActiveTab] = useState('fantasy'); // 'fantasy', 'athletes', 'clubs', 'info'
    const [timeFilter, setTimeFilter] = useState('TOTAL'); // 'TOTAL', 'MONTH', 'ROUND'
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedRoundId, setSelectedRoundId] = useState(null);
    const [availableRounds, setAvailableRounds] = useState([]);
    const [userLeaderboard, setUserLeaderboard] = useState([]);
    const [athleteLeaderboard, setAthleteLeaderboard] = useState([]);
    const [teamLeaderboard, setTeamLeaderboard] = useState([]);

    const league = myFollowedLeaguesDetails.find(l => l.id === id);
    const isLeagueAdmin = league?.role === 'OWNER' || league?.role === 'ADMIN';
    const isMember = myFollowedLeaguesDetails.some(l => l.id === id);

    useEffect(() => {
        if (id && supabase) {
            if (currentLeagueId !== id) {
                setCurrentLeague(id);
            }
            fetchRounds();
        }
    }, [id, supabase]);

    useEffect(() => {
        if (id && supabase) {
            loadData();
        }
    }, [id, timeFilter, selectedMonth, selectedRoundId, supabase]);

    const fetchRounds = async () => {
        try {
            const { data, error } = await supabase
                .from('rounds')
                .select('*')
                .eq('league_id', id)
                .order('number', { ascending: false });
            
            if (error) throw error;
            setAvailableRounds(data || []);
            if (data?.length > 0 && !selectedRoundId) {
                // Default to latest round
                setSelectedRoundId(data[0].id);
            }
        } catch (err) {
            console.error('Error fetching rounds:', err);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            // Safety check for round filter
            if (timeFilter === 'ROUND' && !selectedRoundId) {
                setLoading(false);
                return;
            }

            // 1. Fetch Stats based on filter
            let query = supabase.from('match_stats').select('*').eq('league_id', id);
            
            if (timeFilter === 'ROUND' && selectedRoundId) {
                query = query.eq('round_id', selectedRoundId);
            }
            
            const { data: statsData, error: statsError } = await query;
            if (statsError) throw statsError;

            let filteredStats = statsData || [];
            if (timeFilter === 'MONTH') {
                filteredStats = filteredStats.filter(s => new Date(s.created_at).getMonth() === selectedMonth);
            }

            // 2. Athlete Leaderboard Calculation
            const { data: athletesInfo } = await supabase
                .from('athletes')
                .select('id, name, pos, team_id')
                .eq('league_id', id);

            const athleteMap = {};
            
            filteredStats.forEach(st => {
                const athlete = athletesInfo?.find(a => a.id === st.athlete_id);
                if (athlete) {
                    if (!athleteMap[st.athlete_id]) {
                        athleteMap[st.athlete_id] = {
                            id: st.athlete_id,
                            name: athlete.name,
                            pos: athlete.pos,
                            points: 0
                        };
                    }
                    athleteMap[st.athlete_id].points += Number(st.points || 0);
                }
            });

            setAthleteLeaderboard(Object.values(athleteMap).sort((a, b) => b.points - a.points));

            // Athlete Points Map for Round-specific calculation
            const athletePointsByRound = {};
            (statsData || []).forEach(st => {
                if (!athletePointsByRound[st.round_id]) athletePointsByRound[st.round_id] = {};
                athletePointsByRound[st.round_id][st.athlete_id] = Number(st.points || 0);
            });

            // 3. Fantasy Team Leaderboard
            let squadQuery = supabase.from('user_squads').select(`
                *,
                profiles:user_id (name, avatar_url)
            `).eq('league_id', id);

            if (timeFilter === 'ROUND' && selectedRoundId) {
                squadQuery = squadQuery.eq('round_id', selectedRoundId);
            }

            const { data: squads, error: squadError } = await squadQuery;
            if (squadError) throw squadError;

            const { data: members } = await supabase.from('league_members').select('user_id, team_name').eq('league_id', id);
            
            const userPointsMap = {};
            (members || []).forEach(m => {
                userPointsMap[m.user_id] = {
                    team_name: m.team_name || 'Meu Time', 
                    user_name: 'Comandante',
                    avatar: null,
                    points: 0
                };
            });

            (squads || []).forEach(s => {
                const userId = s.user_id;
                if (!userPointsMap[userId]) return;

                if (s.profiles) {
                    userPointsMap[userId].user_name = s.profiles.name || userPointsMap[userId].user_name;
                    userPointsMap[userId].avatar = s.profiles.avatar_url || userPointsMap[userId].avatar;
                }

                if (timeFilter === 'MONTH') {
                    if (new Date(s.created_at).getMonth() !== selectedMonth) return;
                }

                const roundPoints = athletePointsByRound[s.round_id] || {};
                let squadTotal = 0;
                if (s.squad_data) {
                    Object.values(s.squad_data).forEach(athleteId => {
                        let pts = roundPoints[athleteId] || 0;
                        if (String(athleteId) === String(s.captain_id)) pts *= 2;
                        squadTotal += pts;
                    });
                }
                userPointsMap[userId].points += squadTotal;
            });

            setUserLeaderboard(Object.values(userPointsMap).sort((a, b) => b.points - a.points));

            // 4. Club Leaderboard
            const { data: leagueTeams } = await supabase.from('teams').select('*').eq('league_id', id);
            const teamPointsMap = {};
            leagueTeams?.forEach(t => {
                teamPointsMap[t.id] = { name: t.name, points: 0 };
            });

            filteredStats.forEach(st => {
                const athlete = athletesInfo?.find(a => a.id === st.athlete_id);
                if (athlete && teamPointsMap[athlete.team_id]) {
                    teamPointsMap[athlete.team_id].points += Number(st.points || 0);
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

                <div className="flex gap-2 p-1.5 bg-deep-charcoal rounded-[2rem] border border-white/5 overflow-x-auto no-scrollbar">
                    <TabButton active={activeTab === 'fantasy'} onClick={() => setActiveTab('fantasy')} icon={Users} label="Times" />
                    <TabButton active={activeTab === 'athletes'} onClick={() => setActiveTab('athletes')} icon={Trophy} label="Atletas" />
                    <TabButton active={activeTab === 'clubs'} onClick={() => setActiveTab('clubs')} icon={Shield} label="Clubes" />
                    <TabButton active={activeTab === 'info'} onClick={() => setActiveTab('info')} icon={Info} label="Info" />
                </div>
            </header>

            {(activeTab !== 'info') && (
                <section className="flex flex-col gap-6 px-1">
                    <div className="flex items-center justify-between bg-deep-charcoal p-4 rounded-[2rem] border border-white/5 shadow-2xl overflow-x-auto no-scrollbar gap-4">
                        <div className="flex gap-2">
                            {['TOTAL', 'MONTH', 'ROUND'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setTimeFilter(f)}
                                    className={`px-5 py-2.5 rounded-[1.2rem] text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${timeFilter === f ? 'bg-volt text-black shadow-glow' : 'text-gray-600 hover:text-white'}`}
                                >
                                    {f === 'TOTAL' ? 'Geral' : f === 'MONTH' ? 'Mês' : 'Rodada'}
                                </button>
                            ))}
                        </div>
                        
                        <div className="flex items-center gap-3">
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

                            {timeFilter === 'ROUND' && (
                                <select
                                    value={selectedRoundId || ''}
                                    onChange={(e) => setSelectedRoundId(e.target.value)}
                                    className="bg-transparent text-[9px] font-black uppercase text-volt outline-none border-b-2 border-volt/30 pb-1 pr-2 tracking-widest"
                                >
                                    {availableRounds.map((r, i) => (
                                        <option key={r.id} value={r.id} className="bg-black text-white">Rodada {r.number}</option>
                                    ))}
                                    {availableRounds.length === 0 && <option value="" className="bg-black text-white">Nenhuma rodada</option>}
                                </select>
                            )}
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-6 opacity-30">
                            <Loader2 className="w-12 h-12 animate-spin text-volt" />
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Processando Ranking...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <AnimatePresence mode="popLayout">
                                {(activeTab === 'fantasy' ? userLeaderboard : activeTab === 'athletes' ? athleteLeaderboard : teamLeaderboard).map((item, idx) => {
                                    const isTop3 = idx < 3;
                                    const rankColor = idx === 0 ? 'text-volt' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-orange-400' : 'text-gray-700';
                                    const posColors = {
                                        'GOLEIRO': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                                        'FIXO': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                                        'ALA': 'bg-volt/20 text-volt border-volt/30',
                                        'PIVÔ': 'bg-red-500/20 text-red-400 border-red-500/30'
                                    };
                                    const posColorClass = posColors[item.pos?.toUpperCase()] || 'bg-white/5 text-gray-500 border-white/10';

                                    return (
                                        <motion.div
                                            key={`${activeTab}-${item.name || item.team_name}-${idx}`}
                                            layout
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className={`bento-card p-5 flex items-center justify-between group transition-all ${isTop3 ? 'border-volt/30 bg-volt/5 shadow-glow shadow-volt/5' : 'border-white/5 hover:border-white/20'}`}
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className={`text-xl font-bebas italic w-6 text-center ${rankColor}`}>
                                                    {idx + 1}
                                                </div>
                                                <div className={`w-12 h-12 rounded-2xl bg-black border border-white/5 flex items-center justify-center overflow-hidden shadow-2xl transition-transform group-hover:scale-110 ${isTop3 ? 'border-volt/20' : ''}`}>
                                                    {activeTab === 'fantasy' ? (
                                                        item.avatar ? <img src={item.avatar} className="w-full h-full object-cover" alt={item.team_name} /> : <Users size={20} className="text-gray-700" />
                                                    ) : activeTab === 'athletes' ? (
                                                        <div className={`w-full h-full flex items-center justify-center font-black text-[9px] italic border-2 rounded-2xl ${posColorClass}`}>
                                                            {item.pos?.substring(0, 3).toUpperCase()}
                                                        </div>
                                                    ) : (
                                                        <Shield size={20} className="text-volt opacity-50" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className={`text-sm font-bebas italic text-white uppercase tracking-tight leading-none ${isTop3 ? 'text-volt' : ''}`}>
                                                        {activeTab === 'fantasy' ? item.team_name : item.name}
                                                    </span>
                                                    <span className="text-[7px] font-black text-gray-600 uppercase tracking-widest leading-none">
                                                        {activeTab === 'fantasy' ? `COMANDANTE: ${item.user_name}` : activeTab === 'athletes' ? `EQUIPE: LIGA REAL` : 'CLUBE DA LIGA'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-2xl font-bebas italic leading-none ${isTop3 ? 'text-volt' : 'text-white'}`}>
                                                    {item.points.toFixed(1)}
                                                </div>
                                                <span className="text-[7px] font-black text-gray-700 uppercase tracking-[0.2em] mt-1 block">PTS</span>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>

                            {(activeTab === 'fantasy' ? userLeaderboard : activeTab === 'athletes' ? athleteLeaderboard : teamLeaderboard).length === 0 && (
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
                                <span className="text-[9px] font-black uppercase text-gray-600 tracking-widest">Rodadas</span>
                                <span className="text-3xl font-bebas italic text-white">{availableRounds.length}</span>
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
