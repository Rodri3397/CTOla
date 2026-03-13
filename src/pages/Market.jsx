import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';

// Simple SVG Sparkline Component
const Sparkline = ({ data = [0,0,0], color = '#DFFF00' }) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const points = data.map((v, i) => `${(i * 30)} , ${20 - ((v - min) / range) * 20}`).join(' ');

    return (
        <svg width="90" height="25" className="opacity-60 overflow-visible">
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
                className="drop-shadow-[0_0_8px_rgba(223,255,0,0.4)]"
            />
        </svg>
    );
};

const SkeletonCard = () => (
    <div className="bg-deep-charcoal/40 p-6 rounded-[2.5rem] border border-white/5 h-32 animate-pulse flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5" />
            <div className="flex flex-col gap-2">
                <div className="w-24 h-3 bg-white/5 rounded-full" />
                <div className="w-32 h-4 bg-white/5 rounded-full" />
            </div>
        </div>
        <div className="w-16 h-10 bg-white/5 rounded-xl" />
    </div>
);

export default function Market() {
    const { athletes, teams, loading, currentLeagueId, rounds, activeRoundId, addToDraftSquad, draftSquad } = useStore();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [filterPos, setFilterPos] = useState('TODOS');
    const [sortBy, setSortBy] = useState('price_desc');

    const activeRound = rounds.find(r => r.id === activeRoundId);
    const isMarketOpen = activeRound?.status === 'open' || !activeRound;

    useEffect(() => {
        if (currentLeagueId) {
            useStore.getState().fetchLeagueData();
        }
    }, [currentLeagueId]);

    const filteredAthletes = useMemo(() => {
        return (athletes || [])
            .filter(a => {
                const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase());
                const matchesPos = filterPos === 'TODOS' || a.pos === filterPos;
                return matchesSearch && matchesPos;
            })
            .sort((a, b) => {
                if (sortBy === 'price_desc') return b.price - a.price;
                if (sortBy === 'price_asc') return a.price - b.price;
                return b.last_score - a.last_score;
            });
    }, [athletes, search, filterPos, sortBy]);

    if (!currentLeagueId) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center animate-fade-in">
                <div className="w-28 h-28 bg-volt/5 rounded-[3rem] border border-volt/10 flex items-center justify-center mb-10 rotate-[15deg]">
                    <ShoppingCart className="text-volt opacity-50" size={48} />
                </div>
                <h2 className="text-3xl font-bebas text-white uppercase italic tracking-tight">Arena Fechada</h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.25em] mt-4 max-w-[260px] leading-relaxed">
                    Sua jornada começa em uma liga. Entre agora para escalar seus primeiros craques.
                </p>
                <button
                    onClick={() => navigate('/')}
                    className="mt-12 px-12 py-6 bg-volt text-black rounded-[2.5rem] font-black text-[10px] uppercase shadow-2xl hover:scale-105 active:scale-95 transition-all"
                >
                    Voltar para Início
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 pb-36 animate-fade-in">
            <header className="px-1 flex flex-col gap-6">
                <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                        <h1 className="text-4xl font-bebas italic text-white leading-none tracking-tighter">MERCADO de <span className="text-volt">CRAQUES</span></h1>
                        <div className="flex items-center gap-2 mt-2">
                            <motion.div 
                                animate={{ opacity: [0.3, 1, 0.3] }} 
                                transition={{ repeat: Infinity, duration: 2 }}
                                className={`w-1.5 h-1.5 rounded-full ${isMarketOpen ? 'bg-volt' : 'bg-electric-crimson'}`}
                            />
                            <span className={`text-[9px] font-black uppercase tracking-widest ${isMarketOpen ? 'text-volt' : 'text-electric-crimson'}`}>
                                {isMarketOpen ? 'NEGOCIAÇÕES ABERTAS' : 'MERCADO FECHADO'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-volt transition-colors" size={18} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar goleiro, fixo, ala..."
                            className="w-full bg-deep-charcoal border border-white/5 rounded-[2rem] py-5 pl-16 pr-6 text-[10px] font-black text-white placeholder:text-gray-700 outline-none focus:border-volt/20 transition-all uppercase tracking-widest"
                        />
                    </div>
                    
                    <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
                        {['TODOS', 'GOLEIRO', 'FIXO', 'ALA', 'PIVO'].map(pos => (
                            <button
                                key={pos}
                                onClick={() => setFilterPos(pos)}
                                className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.15em] transition-all whitespace-nowrap ${filterPos === pos ? 'bg-volt text-black shadow-xl shadow-volt/20' : 'bg-white/5 text-gray-500 border border-white/5 hover:border-white/10'}`}
                            >
                                {pos}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <div className="flex flex-col gap-4">
                {loading ? (
                    Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)
                ) : filteredAthletes.length === 0 ? (
                    <div className="py-24 text-center flex flex-col items-center gap-8 opacity-20">
                        <ShoppingCart size={80} />
                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhum atleta disponível</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-5">
                        {filteredAthletes.map((athlete, idx) => {
                            const valProjection = ((athlete.price - (athlete.last_score || 0)) / 10).toFixed(1);
                            const isValPositive = parseFloat(valProjection) >= 0;
                            const isHired = Object.values(draftSquad).includes(athlete.id);

                            return (
                                <motion.div
                                    key={athlete.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    className="bg-deep-charcoal/40 p-6 rounded-[2.5rem] border border-white/5 flex items-center justify-between group hover:bg-black/60 transition-all shadow-xl relative overflow-hidden"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 rounded-2xl bg-black border border-white/5 flex items-center justify-center text-3xl group-hover:scale-105 transition-transform shadow-inner relative">
                                            {athlete.pos === 'GOLEIRO' ? '🧤' : athlete.pos === 'FIXO' ? '🛡️' : athlete.pos === 'ALA' ? '⚡' : '🔥'}
                                            {isHired && (
                                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-volt rounded-lg flex items-center justify-center text-black border-2 border-black rotate-12">
                                                    <ShoppingCart size={10} strokeWidth={3} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-base font-black text-white italic tracking-tighter uppercase leading-none">
                                                {athlete.name}
                                            </span>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-[9px] font-black text-gray-700 uppercase tracking-widest">{teams.find(t => t.id === athlete.team_id)?.name || 'AVULSO'}</span>
                                                <div className="w-1 h-1 rounded-full bg-white/10" />
                                                <span className="text-[9px] font-bold text-volt uppercase tracking-widest">{athlete.pos}</span>
                                            </div>
                                            <div className="mt-4 flex items-center gap-3">
                                                <Sparkline data={[2, 4, 3, 6, 5]} color={isHired ? '#DFFF00' : '#333'} />
                                                <span className={`text-[8px] font-black ${isValPositive ? 'text-volt' : 'text-electric-crimson'}`}>
                                                    {isValPositive ? '▲' : '▼'} {valProjection}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-3">
                                        <div className="flex flex-col items-end">
                                            <span className="text-2xl font-bebas text-white italic leading-none">C$ {athlete.price?.toFixed(1)}</span>
                                            <span className="text-[8px] font-black text-gray-800 uppercase mt-1">VALOR</span>
                                        </div>
                                        
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => {
                                                if (isMarketOpen && !isHired) {
                                                    addToDraftSquad(athlete);
                                                }
                                            }}
                                            className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                                isHired 
                                                ? 'bg-volt/10 text-volt border border-volt/20 cursor-default' 
                                                : isMarketOpen 
                                                    ? 'bg-volt text-black shadow-[0_10px_20px_rgba(223,255,0,0.2)] hover:shadow-volt/30' 
                                                    : 'bg-white/5 text-gray-700 border border-white/5 cursor-not-allowed'
                                            }`}
                                        >
                                            {isHired ? 'ESCALADO' : 'CONTRATAR'}
                                        </motion.button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
