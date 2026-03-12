import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';

export default function Market() {
    const { athletes, loading, error, fetchAthletes, currentLeagueId, rounds, activeRoundId } = useStore();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');

    const activeRound = rounds.find(r => r.id === activeRoundId);
    const isMarketOpen = activeRound?.status === 'open' || !activeRound;

    useEffect(() => {
        if (currentLeagueId) {
            useStore.getState().fetchLeagueData();
        }
    }, [currentLeagueId]);

    const filteredAthletes = (athletes || []).filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.pos.toLowerCase().includes(search.toLowerCase()) ||
        (a.teams?.name || '').toLowerCase().includes(search.toLowerCase())
    );

    if (!currentLeagueId) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-fade">
                <div className="w-20 h-20 bg-neon/10 rounded-full flex items-center justify-center mb-6">
                    <ShoppingCart className="text-neon opacity-50" size={32} />
                </div>
                <h2 className="text-lg font-black uppercase italic">Mercado Bloqueado</h2>
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-2 px-10 text-center">
                    Você precisa selecionar uma liga no menu Explorar para ver os atletas disponíveis.
                </p>
                <button
                    onClick={() => navigate('/explorar')}
                    className="mt-8 px-8 py-4 bg-neon text-black rounded-2xl font-black text-[10px] uppercase shadow-xl hover:scale-105 transition-all"
                >
                    Explorar Ligas
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 animate-fade pb-24">
            <header className="flex justify-between items-end px-1">
                <h1 className="text-2xl font-black italic uppercase tracking-tighter">Mercado</h1>
                <div className="text-right flex flex-col items-end">
                    <span className="text-neon font-black text-sm">C$ 85.00</span>
                    {!isMarketOpen && (
                        <span className="text-[7px] font-black uppercase text-red-500 tracking-widest mt-1">Mercado Fechado</span>
                    )}
                </div>
            </header>

            <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-neon transition-colors" size={16} />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar craque..."
                    className="w-full bg-[#1a1d23] border border-white/5 rounded-[2rem] py-5 pl-14 pr-6 text-xs font-bold text-white placeholder:text-gray-700 outline-none focus:border-neon/20 transition-all shadow-inner"
                />
            </div>

            <div className="flex flex-col gap-3">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                        <Loader2 className="w-10 h-10 animate-spin text-neon" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Consultando Mercado...</span>
                    </div>
                ) : error ? (
                    <div className="py-20 text-center flex flex-col items-center gap-6 glass rounded-[2.5rem] border border-red-500/20 bg-red-500/5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-400">Erro no Mercado</p>
                        <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">{error}</p>
                    </div>
                ) : filteredAthletes.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center gap-4 opacity-40">
                        <ShoppingCart size={48} />
                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhum atleta nesta liga</p>
                    </div>
                ) : filteredAthletes.map((athlete, idx) => (
                    <motion.div
                        key={athlete.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="glass p-5 rounded-[2rem] flex items-center justify-between group border-white/5 hover:border-neon/20 transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-[#1a1d23] flex items-center justify-center text-2xl border border-white/10 group-hover:scale-110 transition-transform">
                                {athlete.photo || '⚽'}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-black text-white leading-none">{athlete.name}</span>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <span className="text-[8px] text-gray-600 font-black uppercase tracking-widest">{athlete.team || 'SEM TIME'} - <span className="text-gray-500">{athlete.pos}</span></span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                            <span className="text-[10px] font-black text-neon italic leading-none">C$ {athlete.price}</span>
                            <button
                                onClick={() => {
                                    if (isMarketOpen) {
                                        useStore.getState().addToDraftSquad(athlete);
                                        navigate('/meu-time');
                                    }
                                }}
                                disabled={!isMarketOpen}
                                className={`border text-[7px] font-black uppercase px-3 py-1.5 rounded-lg transition-all tracking-widest ${isMarketOpen
                                    ? 'bg-white/5 border-white/10 group-hover:bg-neon group-hover:text-black'
                                    : 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                {isMarketOpen ? 'Comprar' : 'Fechado'}
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
