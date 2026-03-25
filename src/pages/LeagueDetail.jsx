import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy, Users, Info, Calendar, ChevronLeft,
    Filter, TrendingUp, Medal, Star, Zap, Loader2, Shield, Lock,
    Copy, ExternalLink, Activity, Search
} from 'lucide-react';

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
        supabase, user, promoteToAdmin
    } = useStore();

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('times'); // 'times', 'athletes', 'info'
    const [timeFilter, setTimeFilter] = useState('TOTAL'); // 'TOTAL', 'MONTH', 'ROUND'
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedRoundId, setSelectedRoundId] = useState(null);
    const [availableRounds, setAvailableRounds] = useState([]);
    const [userLeaderboard, setUserLeaderboard] = useState([]);
    const [athleteLeaderboard, setAthleteLeaderboard] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMember, setSelectedMember] = useState(null);
    const league = (myFollowedLeaguesDetails || []).find(l => l.id === id);
    const isLeagueAdmin = league?.role === 'OWNER' || league?.role === 'ADMIN';
    const isMember = myFollowedLeaguesDetails.some(l => l.id === id);
    const isLeagueOwner = league?.owner_id === user?.id;

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
                setSelectedRoundId(data[0].id);
            }
        } catch (err) {
            console.error('Error fetching rounds:', err);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            if (timeFilter === 'ROUND' && !selectedRoundId) {
                setLoading(false);
                return;
            }

            // 1. Fetch Stats
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

            // 2. Athlete Leaderboard
            const { data: athletesInfo } = await supabase.from('athletes').select('id, name, pos, team_id').eq('league_id', id);
            const athleteMap = {};
            filteredStats.forEach(st => {
                const athlete = (athletesInfo || []).find(a => a.id === st.athlete_id);
                if (athlete) {
                    if (!athleteMap[st.athlete_id]) {
                        athleteMap[st.athlete_id] = { id: st.athlete_id, name: athlete.name, pos: athlete.pos, points: 0 };
                    }
                    athleteMap[st.athlete_id].points += Number(st.points || 0);
                }
            });
            console.log('Leaderboard calculated:', Object.keys(athleteMap).length, 'athletes');
            setAthleteLeaderboard(Object.values(athleteMap).sort((a, b) => b.points - a.points));

            // 3. Fantasy Team Leaderboard
            const { data: squads, error: squadError } = await supabase.from('user_squads').select('*').eq('league_id', id);
            if (squadError) throw squadError;

            const { data: members, error: memberError } = await supabase.from('league_members').select('user_id, team_name').eq('league_id', id);
            if (memberError) throw memberError;

            const userIds = [...new Set((squads || []).map(s => s.user_id))];
            const { data: profiles } = await supabase.from('profiles').select('id, name, avatar_url').in('id', userIds);
            
            const userPointsMap = {};
            (members || []).forEach(m => {
                userPointsMap[m.user_id] = { team_name: m.team_name || 'TITÃ SEM NOME', user_name: 'Comandante', avatar: null, points: 0 };
            });

            const athletePointsByRound = {};
            (statsData || []).forEach(st => {
                if (!athletePointsByRound[st.round_id]) athletePointsByRound[st.round_id] = {};
                athletePointsByRound[st.round_id][st.athlete_id] = Number(st.points || 0);
            });

            (squads || []).forEach(s => {
                const userId = s.user_id;
                if (!userPointsMap[userId]) return;
                
                const profile = (profiles || []).find(p => p.id === userId);
                if (profile) {
                    userPointsMap[userId].user_name = profile.name || userPointsMap[userId].user_name;
                    userPointsMap[userId].avatar = profile.avatar_url || userPointsMap[userId].avatar;
                }
                
                if (timeFilter === 'MONTH' && new Date(s.created_at).getMonth() !== selectedMonth) return;
                if (timeFilter === 'ROUND' && s.round_id !== selectedRoundId) return;

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

            const leaderboard = Object.values(userPointsMap).sort((a, b) => b.points - a.points);
            setUserLeaderboard(leaderboard);

        } catch (err) {
            console.error('CRITICAL: League detail error:', err);
            setNotification({ message: 'Erro ao carregar dados: ' + err.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const filteredAthletes = athleteLeaderboard.filter(a => 
        a.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    return (
        <div className="flex flex-col gap-10 animate-fade-in pb-32">
            <header className="flex flex-col gap-6 px-1">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <button onClick={() => navigate(-1)} className="p-4 bento-card text-gray-500 hover:text-white transition-all">
                            <ChevronLeft size={20} />
                        </button>
                        <div className="flex items-center gap-3">
                            <div>
                                <h1 className="text-3xl font-bebas italic text-white leading-none tracking-tighter uppercase">{league?.name || 'ARENA'}</h1>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[8px] font-black uppercase text-volt tracking-[0.3em]">ID: {league?.invite_code || '---'}</span>
                                </div>
                            </div>
                            {isLeagueAdmin && (
                                <button 
                                    onClick={() => navigate('/admin/dashboard')}
                                    className="px-4 py-2 bg-white/10 border border-white/10 rounded-xl text-[8px] font-black text-volt uppercase tracking-widest hover:bg-volt hover:text-black transition-all"
                                >
                                    GESTÃO
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 p-1.5 bg-deep-charcoal rounded-[2rem] border border-white/5">
                    <TabButton active={activeTab === 'times'} onClick={() => setActiveTab('times')} icon={Users} label="Times" />
                    <TabButton active={activeTab === 'athletes'} onClick={() => setActiveTab('athletes')} icon={Trophy} label="Atletas" />
                    <TabButton active={activeTab === 'info'} onClick={() => setActiveTab('info')} icon={Info} label="Info" />
                </div>
            </header>

            {activeTab !== 'info' && (
                <section className="flex flex-col gap-6 px-1">
                    {activeTab === 'athletes' && (
                        <div className="relative group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-volt transition-colors" size={18} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="BUSCAR ATLETA NA ARENA..."
                                className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl pl-16 pr-6 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-volt/40 transition-all placeholder:text-gray-700"
                            />
                        </div>
                    )}

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
                                    {months.map((m, i) => <option key={i} value={i} className="bg-black text-white">{m}</option>)}
                                </select>
                            )}
                            {timeFilter === 'ROUND' && (
                                <select
                                    value={selectedRoundId || ''}
                                    onChange={(e) => setSelectedRoundId(e.target.value)}
                                    className="bg-transparent text-[9px] font-black uppercase text-volt outline-none border-b-2 border-volt/30 pb-1 pr-2 tracking-widest"
                                >
                                    {availableRounds.map(r => <option key={r.id} value={r.id} className="bg-black text-white">Rodada {r.number}</option>)}
                                    {availableRounds.length === 0 && <option value="" className="bg-black text-white">Nenhuma</option>}
                                </select>
                            )}
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-6 opacity-30">
                            <Loader2 className="w-12 h-12 animate-spin text-volt" />
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Processando...</span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <AnimatePresence mode="popLayout">
                                {(activeTab === 'times' ? userLeaderboard : filteredAthletes).map((item, idx) => {
                                    const isTop3 = idx < 3;
                                    const rankColor = idx === 0 ? 'text-volt' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-orange-400' : 'text-gray-700';
                                    const posColors = {
                                        'GOLEIRO': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                                        'FIXO': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                                        'ALA': 'bg-volt/20 text-volt border-volt/30',
                                        'PIVÔ': 'bg-red-500/20 text-red-400 border-red-500/30'
                                    };
                                    
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
                                                <div className={`text-xl font-bebas italic w-6 text-center ${rankColor}`}>{idx + 1}</div>
                                                <div className={`w-12 h-12 rounded-2xl bg-black border border-white/5 flex items-center justify-center overflow-hidden shadow-2xl transition-transform group-hover:scale-110 ${isTop3 ? 'border-volt/20' : ''}`}>
                                                    {activeTab === 'times' ? (
                                                        item.avatar ? <img src={item.avatar} className="w-full h-full object-cover" /> : <Users size={20} className="text-gray-700" />
                                                    ) : (
                                                        <div className={`w-full h-full flex items-center justify-center font-black text-[9px] italic border-2 rounded-2xl ${posColors[item.pos?.toUpperCase()] || 'bg-white/5 text-gray-500 border-white/10'}`}>
                                                            {item.pos?.substring(0, 3).toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div 
                                                    className={`flex flex-col gap-1 ${activeTab === 'times' && isLeagueOwner ? 'cursor-pointer hover:opacity-70' : ''}`}
                                                    onClick={() => {
                                                        if (activeTab === 'times' && isLeagueOwner && item.user_id !== user.id) {
                                                            setSelectedMember(item);
                                                        }
                                                    }}
                                                >
                                                    <span className={`text-sm font-bebas italic text-white uppercase tracking-tight leading-none ${isTop3 ? 'text-volt' : ''}`}>
                                                        {activeTab === 'times' ? item.team_name : item.name}
                                                    </span>
                                                    <span className="text-[7px] font-black text-gray-600 uppercase tracking-widest leading-none">
                                                        {activeTab === 'times' ? `COMANDANTE: ${item.user_name}` : 'LIGA REAL'}
                                                        {activeTab === 'times' && item.role === 'ADMIN' && <span className="text-volt"> • ADMIN</span>}
                                                        {activeTab === 'times' && item.role === 'OWNER' && <span className="text-volt"> • DONO</span>}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-2xl font-bebas italic leading-none ${isTop3 ? 'text-volt' : 'text-white'}`}>{item.points.toFixed(1)}</div>
                                                <span className="text-[7px] font-black text-gray-700 uppercase tracking-[0.2em] mt-1 block">PTS</span>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                            {(activeTab === 'times' ? userLeaderboard : filteredAthletes).length === 0 && (
                                <div className="py-24 text-center flex flex-col items-center gap-6 opacity-20">
                                    <Activity size={48} />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Nenhum registro encontrado</p>
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
                                Bem-vindo à arena <span className="text-white font-bold uppercase">{league?.name}</span>. Aqui, a tática supera a sorte.
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
                        <div className="bg-volt/5 p-8 rounded-[2.5rem] border border-volt/20 flex flex-col gap-6">
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-black uppercase text-gray-500 tracking-[0.3em]">CHAVE DE ACESSO</span>
                                <span className="text-3xl font-bebas italic text-volt tracking-[0.2em] uppercase">{league?.invite_code || '------'}</span>
                            </div>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(league?.invite_code);
                                    alert('Chave copiada!');
                                }}
                                className="w-full py-5 bg-white text-black rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl"
                            >
                                <Copy size={16} /> COPIAR CHAVE
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {/* Promotion Modal */}
            <AnimatePresence>
                {selectedMember && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/95 backdrop-blur-2xl">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-sm glass-premium p-10 rounded-[3.5rem] border border-white/10 flex flex-col gap-8 text-center"
                        >
                            <div className="flex flex-col items-center gap-4">
                                <Users className="text-volt" size={48} />
                                <h2 className="text-2xl font-bebas text-white italic tracking-tight uppercase">Gestão de Membro</h2>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                                    Deseja tornar <span className="text-volt">{selectedMember.team_name}</span> um administrador da Arena?
                                </p>
                            </div>

                            {selectedMember.role !== 'ADMIN' && selectedMember.role !== 'OWNER' && (
                                <button
                                    onClick={async () => {
                                        await promoteToAdmin(currentLeagueId, selectedMember.user_id);
                                        setSelectedMember(null);
                                    }}
                                    className="w-full bg-volt text-black py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-all"
                                >
                                    Tornar Admin
                                </button>
                            )}

                            <button
                                onClick={() => setSelectedMember(null)}
                                className="w-full bg-white/5 text-gray-500 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:text-white transition-all"
                            >
                                Cancelar
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LeagueDetail;
