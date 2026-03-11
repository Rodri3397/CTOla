import React, { useState, useEffect } from 'react';
import { Trophy, Medal, ChevronRight, User, TrendingUp, Zap, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { calculateScore } from '../utils/scoring';

const Ranking = () => {
    const { currentLeagueId, fetchLeaderboard, rounds, activeRoundId, supabase } = useStore();
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('TOTAL'); // 'TOTAL' or 'ROUND'

    useEffect(() => {
        if (currentLeagueId && supabase) {
            loadLeaderboard();
        }
    }, [currentLeagueId, filter, activeRoundId, supabase]);

    const loadLeaderboard = async () => {
        setLoading(true);
        try {
            // Fetch all squads for this league
            const squads = await fetchLeaderboard();

            // Fetch all match stats for this league to calculate points accurately
            const { data: allStats, error: statsError } = await supabase
                .from('match_stats')
                .select('*')
                .eq('league_id', currentLeagueId);

            if (statsError) throw statsError;

            // Group by user and calculate points
            const userPoints = {};

            squads.forEach(s => {
                const userId = s.user_id;
                if (!userPoints[userId]) {
                    userPoints[userId] = {
                        name: s.profiles?.name || 'Inominado',
                        avatar: s.profiles?.avatar_url,
                        totalPoints: 0,
                        roundPoints: 0,
                    };
                }

                // Calculate points for this specific squad entry
                let squadPointsTotal = 0;
                const roundStats = (allStats || []).filter(st => st.round_id === s.round_id);

                Object.entries(s.squad_data || {}).forEach(([slot, athleteId]) => {
                    const stats = roundStats.find(st => st.athlete_id === athleteId);
                    if (stats) {
                        const isCaptain = s.captain_id === athleteId;
                        // Determine position from slot name as a safe fallback
                        const pos = slot === 'goleiro' ? 'GOLEIRO' : slot === 'fixo' ? 'FIXO' : 'LINE';
                        squadPointsTotal += calculateScore(stats, pos, isCaptain);
                    }
                });

                userPoints[userId].totalPoints += squadPointsTotal;
                if (s.round_id === activeRoundId) {
                    userPoints[userId].roundPoints = squadPointsTotal;
                }
            });

            const sorted = Object.values(userPoints).sort((a, b) =>
                filter === 'TOTAL' ? b.totalPoints - a.totalPoints : b.roundPoints - a.roundPoints
            );

            setLeaderboard(sorted);
        } catch (err) {
            console.error('Leaderboard error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-8 animate-fade pb-24 px-1">
            <header className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-black italic uppercase italic tracking-tighter">Ranking da Liga</h1>
                    <div className="w-10 h-10 rounded-2xl bg-neon/10 flex items-center justify-center border border-neon/20">
                        <Trophy className="text-neon" size={20} />
                    </div>
                </div>

                <div className="flex gap-2 p-1 bg-[#1a1d23] rounded-2xl border border-white/5">
                    <button
                        onClick={() => setFilter('TOTAL')}
                        className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filter === 'TOTAL' ? 'bg-neon text-black neo-shadow' : 'text-gray-500 hover:text-white'}`}
                    >
                        Geral
                    </button>
                    <button
                        onClick={() => setFilter('ROUND')}
                        className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filter === 'ROUND' ? 'bg-neon text-black neo-shadow' : 'text-gray-500 hover:text-white'}`}
                    >
                        Rodada Atual
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                    <Loader2 className="w-10 h-10 animate-spin text-neon" />
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Calculando Líderes...</span>
                </div>
            ) : leaderboard.length > 0 ? (
                <div className="flex flex-col gap-4">
                    {/* Top 3 Podio */}
                    <div className="flex items-end justify-center gap-4 mb-8 pt-10">
                        {leaderboard[1] && (
                            <div className="flex flex-col items-center gap-2">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-[2rem] bg-gray-400/10 border-2 border-gray-400/30 flex items-center justify-center text-2xl relative z-10">🥈</div>
                                    <div className="absolute -top-2 -right-2 bg-gray-400 text-black w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center border-2 border-[#0f1115]">2</div>
                                </div>
                                <span className="text-[8px] font-black uppercase text-gray-500 text-center w-20 truncate">{leaderboard[1].name}</span>
                            </div>
                        )}
                        <div className="flex flex-col items-center gap-2 scale-125 -mt-8 relative">
                            <div className="absolute inset-0 bg-neon/20 blur-3xl rounded-full scale-150" />
                            <div className="relative">
                                <div className="w-20 h-20 rounded-[2.5rem] bg-neon/10 border-2 border-neon flex items-center justify-center text-3xl relative z-10 neo-shadow">🥇</div>
                                <div className="absolute -top-3 -right-3 bg-neon text-black w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center border-4 border-[#0f1115] neo-shadow">1</div>
                            </div>
                            <span className="text-[8px] font-black uppercase text-white text-center w-20 truncate">{leaderboard[0].name}</span>
                        </div>
                        {leaderboard[2] && (
                            <div className="flex flex-col items-center gap-2">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-[2rem] bg-orange-700/10 border-2 border-orange-700/30 flex items-center justify-center text-2xl relative z-10">🥉</div>
                                    <div className="absolute -top-2 -right-2 bg-orange-700 text-black w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center border-2 border-[#0f1115]">3</div>
                                </div>
                                <span className="text-[8px] font-black uppercase text-gray-500 text-center w-20 truncate">{leaderboard[2].name}</span>
                            </div>
                        )}
                    </div>

                    {/* List */}
                    <div className="flex flex-col gap-2">
                        {leaderboard.map((user, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`glass p-5 rounded-[2rem] flex items-center justify-between group border-white/5 bg-white/5 ${idx === 0 ? 'border-neon/20 bg-neon/5' : ''}`}
                            >
                                <div className="flex items-center gap-4">
                                    <span className="text-xs font-black italic text-gray-600 w-4">{idx + 1}º</span>
                                    <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-lg">
                                        {user.avatar ? <img src={user.avatar} className="w-full h-full rounded-2xl object-cover" /> : '👤'}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white">{user.name}</span>
                                        <span className="text-[7px] font-bold text-gray-600 uppercase">Clube de Vantagens</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-black text-neon italic">
                                        {(filter === 'TOTAL' ? user.totalPoints : user.roundPoints).toFixed(2)}
                                    </div>
                                    <span className="text-[7px] font-black text-gray-700 uppercase tracking-widest">PTS</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="py-20 text-center flex flex-col items-center gap-4 opacity-40">
                    <Medal size={48} />
                    <p className="text-[10px] font-black uppercase tracking-widest px-10 leading-relaxed">Ninguém escalou times nesta liga ainda.</p>
                </div>
            )}
        </div>
    );
};

export default Ranking;
