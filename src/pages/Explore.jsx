import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Shield, Users, ArrowRight, Star, StarOff, Trophy, MapPin, Loader2, Sparkles, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';

export default function Explore() {
    const navigate = useNavigate();
    const {
        leagues, fetchLeagues, setCurrentLeague, currentLeagueId, loading, error,
        followLeague, unfollowLeague, myFollowedLeagues, joinLeagueByCode
    } = useStore();
    const [search, setSearch] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        fetchLeagues();
    }, [fetchLeagues]);

    const filteredLeagues = (leagues || []).filter(l =>
        l.name.toLowerCase().includes(search.toLowerCase())
    );

    const toggleFollow = async (id) => {
        if (myFollowedLeagues.includes(id)) {
            await unfollowLeague(id);
        } else {
            await followLeague(id);
        }
    };

    const handleJoinByCode = async (e) => {
        e.preventDefault();
        if (!joinCode) return;
        setJoining(true);
        const { data, error } = await joinLeagueByCode(joinCode);
        setJoining(false);
        if (error) {
            alert(error);
        } else if (data) {
            alert(`Bem-vindo à liga: ${data.name}!`);
            setJoinCode('');
            setCurrentLeague(data.id);
            navigate(`/league/${data.id}`);
        }
    };

    const handleViewLeague = (leagueId) => {
        setCurrentLeague(leagueId);
        navigate(`/league/${leagueId}`);
    };

    return (
        <div className="flex flex-col gap-10 animate-fade-in pb-32">
            <header className="flex flex-col gap-3 px-1">
                <h1 className="text-4xl font-bebas italic text-white leading-none tracking-tighter">EXPLORAR <span className="text-volt">ARENAS</span></h1>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.25em]">Localize e conquiste as melhores competições</p>
            </header>

            <div className="flex flex-col gap-4">
                <div className="relative group">
                    <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-volt transition-colors" size={18} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="BUSCAR LIGAS PÚBLICAS..."
                        className="w-full bg-deep-charcoal border border-white/5 rounded-[2rem] py-5 pl-16 pr-6 text-[10px] font-black text-white placeholder:text-gray-700 outline-none focus:border-volt/20 transition-all uppercase tracking-widest shadow-2xl"
                    />
                </div>

                <form onSubmit={handleJoinByCode} className="flex gap-2">
                    <div className="relative flex-1">
                        <Hash className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                        <input
                            type="text"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            placeholder="CÓDIGO DE CONVITE"
                            className="w-full bg-deep-charcoal border border-white/5 rounded-[2rem] py-5 pl-16 pr-6 text-[10px] font-black text-white placeholder:text-gray-700 outline-none focus:border-volt/20 transition-all uppercase tracking-widest"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={joining}
                        className="bg-volt text-black px-8 rounded-[1.8rem] font-black text-[10px] uppercase shadow-2xl shadow-volt/20 transition-all active:scale-95 disabled:opacity-30"
                    >
                        {joining ? '...' : 'ENTRAR'}
                    </button>
                </form>
            </div>

            <section className="flex flex-col gap-6">
                <div className="flex items-center gap-3 px-1">
                    <Sparkles size={14} className="text-volt" />
                    <h3 className="text-[10px] font-black uppercase text-gray-500 tracking-[0.3em]">Ligas em Destaque</h3>
                </div>

                <div className="flex flex-col gap-5">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-6 opacity-30">
                            <Loader2 className="w-12 h-12 animate-spin text-volt" />
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Escaneando Competições...</span>
                        </div>
                    ) : error ? (
                        <div className="bento-card py-16 text-center flex flex-col items-center gap-6 border-red-500/20 bg-red-500/5">
                            <Shield className="text-red-500" size={40} />
                            <p className="text-[10px] font-black uppercase tracking-widest text-red-400 px-10">Ops! Falha na conexão com a Arena.</p>
                        </div>
                    ) : filteredLeagues.map((league) => (
                        <motion.div
                            key={league.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bento-card group hover:border-volt/30 transition-all"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex gap-5">
                                    <div className="w-16 h-16 bg-black rounded-[1.8rem] flex items-center justify-center border border-white/5 shadow-2xl group-hover:rotate-6 transition-transform">
                                        <Trophy className="text-volt" size={28} />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-3">
                                            <h4 className="text-lg font-bebas italic text-white tracking-tight uppercase leading-none">{league.name}</h4>
                                            {league.is_public && (
                                                <div className="bg-volt/10 px-3 py-1 rounded-full border border-volt/20">
                                                    <span className="text-[7px] text-volt font-black uppercase tracking-widest">Pública</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5 text-[8px] font-black text-gray-600 uppercase tracking-widest">
                                                <Users size={12} className="text-volt opacity-50" /> {league.member_count || 0} Membros
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[8px] font-black text-gray-600 uppercase tracking-widest">
                                                <MapPin size={12} className="text-volt opacity-50" /> BRASIL
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <motion.button
                                    whileTap={{ scale: 0.8 }}
                                    onClick={() => toggleFollow(league.id)}
                                    className={`p-4 rounded-2xl transition-all ${myFollowedLeagues.includes(league.id) ? 'bg-volt/10 text-volt border border-volt/20 shadow-glow shadow-volt/5' : 'bg-white/5 text-gray-700 hover:text-white'}`}
                                >
                                    {myFollowedLeagues.includes(league.id) ? <Star size={18} fill="currentColor" /> : <StarOff size={18} />}
                                </motion.button>
                            </div>

                            <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
                                <div className="flex -space-x-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-8 h-8 rounded-full border-[3px] border-deep-charcoal bg-white/5" />
                                    ))}
                                    <div className="text-[8px] font-black text-gray-700 flex items-center ml-5 uppercase tracking-widest italic group-hover:text-white transition-colors">
                                        Explorar Detalhes
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleViewLeague(league.id)}
                                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-volt group-hover:text-black transition-all"
                                >
                                    <ArrowRight size={14} />
                                </button>
                            </div>
                        </motion.div>
                    ))}

                    {!loading && !error && filteredLeagues.length === 0 && (
                        <div className="py-24 text-center flex flex-col items-center gap-8 opacity-20">
                            <Shield size={64} />
                            <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma arena encontrada</p>
                        </div>
                    )}
                </div>
            </section>

            <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/admin/dashboard')}
                className="w-full py-10 bento-card border-dashed border-white/10 flex flex-col items-center gap-6 group hover:border-volt/30 shadow-2xl"
            >
                <div className="w-16 h-16 bg-volt/10 rounded-[2rem] flex items-center justify-center group-hover:rotate-[15deg] transition-all border border-volt/20 shadow-glow shadow-volt/5">
                    <Shield className="text-volt" size={32} />
                </div>
                <div className="text-center">
                    <h4 className="text-sm font-bebas italic text-white tracking-[0.2em] uppercase">FUNDAR MINHA PRÓPRIA ARENA</h4>
                    <p className="text-[8px] text-gray-600 font-bold uppercase tracking-[0.3em] mt-2">Torne-se um administrador oficial</p>
                </div>
            </motion.button>
        </div>
    );
}
