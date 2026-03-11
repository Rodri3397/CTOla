import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Shield, Users, ArrowRight, Star, StarOff, Trophy, MapPin, Loader2 } from 'lucide-react';
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
        <div className="flex flex-col gap-8 animate-fade pb-24">
            <header className="flex flex-col gap-2">
                <h1 className="text-2xl font-black italic uppercase">Explorar Ligas</h1>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Encontre e siga as melhores competições</p>
            </header>

            <div className="flex flex-col gap-4">
                <div className="relative group">
                    <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon transition-colors" size={18} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar ligas públicas..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-5 text-xs font-bold outline-none focus:border-neon/30 transition-all shadow-xl"
                    />
                </div>

                <form onSubmit={handleJoinByCode} className="flex gap-2">
                    <input
                        type="text"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        placeholder="Código de convite (Ex: XA21B)"
                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-xs font-bold outline-none focus:border-neon/30 transition-all shadow-xl uppercase"
                    />
                    <button
                        type="submit"
                        disabled={joining}
                        className="bg-neon text-black px-6 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-neon/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                    >
                        {joining ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>
            </div>

            <section className="flex flex-col gap-4">
                <h3 className="text-[10px] font-black uppercase text-gray-600 tracking-[0.3em] px-1">Ligas em Destaque</h3>

                <div className="flex flex-col gap-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                            <Loader2 className="w-10 h-10 animate-spin text-neon" />
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Buscando Ligas...</span>
                        </div>
                    ) : error ? (
                        <div className="py-20 text-center flex flex-col items-center gap-6 glass rounded-[2.5rem] border border-red-500/20 bg-red-500/5">
                            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
                                <Shield className="text-red-500" size={32} />
                            </div>
                            <div className="flex flex-col gap-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-red-400 px-10">
                                    Ops! Houve um erro ao carregar as ligas.
                                </p>
                                <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider px-10">
                                    {error}
                                </p>
                            </div>
                            <button
                                onClick={() => fetchLeagues()}
                                className="px-8 py-3 bg-white/5 border border-white/10 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-white/10 transition-all border-red-500/20 text-red-400"
                            >
                                Tentar Novamente
                            </button>

                            <p className="text-[7px] text-gray-600 font-bold uppercase tracking-widest px-10 mt-2">
                                Certifique-se de que executou o script SQL no Supabase.
                            </p>
                        </div>
                    ) : filteredLeagues.map((league) => (
                        <motion.div
                            key={league.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass p-6 rounded-[2.5rem] border border-white/5 flex flex-col gap-4 relative overflow-hidden group"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex gap-4">
                                    <div className="w-14 h-14 bg-[#1a1d23] rounded-2xl flex items-center justify-center border border-white/10 shadow-lg group-hover:scale-105 transition-transform">
                                        <Trophy className="text-neon" size={24} />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-black uppercase italic tracking-tight">{league.name}</h4>
                                            {league.is_public && (
                                                <div className="bg-neon/10 px-2 py-0.5 rounded-full border border-neon/20">
                                                    <span className="text-[6px] text-neon font-black uppercase tracking-tighter">Pública</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1 text-[8px] font-bold text-gray-500 uppercase">
                                                <Users size={10} /> Ativa
                                            </div>
                                            <div className="flex items-center gap-1 text-[8px] font-bold text-gray-500 uppercase">
                                                <MapPin size={10} /> Brasil
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => toggleFollow(league.id)}
                                    className={`p-3 rounded-2xl transition-all ${myFollowedLeagues.includes(league.id) ? 'bg-neon/10 text-neon' : 'bg-white/5 text-gray-600 hover:text-white'}`}
                                >
                                    {myFollowedLeagues.includes(league.id) ? <Star size={20} fill="currentColor" /> : <StarOff size={20} />}
                                </button>
                            </div>

                            <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/5">
                                <div className="flex -space-x-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-6 h-6 rounded-full border-2 border-[#1a1d23] bg-gray-800" />
                                    ))}
                                    <div className="text-[8px] font-bold text-gray-600 flex items-center ml-4 uppercase tracking-widest">
                                        {myFollowedLeagues.includes(league.id) ? 'Você segue' : 'Participar'}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleViewLeague(league.id)}
                                    className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-neon hover:gap-3 transition-all"
                                >
                                    Ver Liga <ArrowRight size={10} />
                                </button>
                            </div>
                        </motion.div>
                    ))}

                    {!loading && !error && filteredLeagues.length === 0 && (
                        <div className="py-20 text-center flex flex-col items-center gap-4 opacity-40">
                            <Shield size={48} />
                            <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma liga encontrada</p>
                        </div>
                    )}
                </div>
            </section>

            <button
                onClick={() => navigate('/admin/dashboard')}
                className="w-full py-8 glass rounded-[2.5rem] border-dashed border-white/10 flex flex-col items-center gap-4 group hover:border-neon/30 transition-all mt-4"
            >
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all">
                    <Shield className="text-gray-500 group-hover:text-neon" size={24} />
                </div>
                <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest">Quer criar sua própria liga?</h4>
                    <p className="text-[8px] text-gray-600 font-bold uppercase mt-1">Torne-se um administrador oficial</p>
                </div>
            </button>
        </div>
    );
}
