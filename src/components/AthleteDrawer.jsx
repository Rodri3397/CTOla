import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Filter, TrendingUp, Zap, UserPlus } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function AthleteDrawer({ isOpen, onClose, position, onSelect, currentAthleteId }) {
    const { athletes, teams, currentLeagueId } = useStore();
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('price'); // 'price', 'points'

    const filteredAthletes = useMemo(() => {
        return athletes
            .filter(a => a.league_id === currentLeagueId && a.pos === position)
            .filter(a => a.name.toLowerCase().includes(search.toLowerCase()))
            .sort((a, b) => sortBy === 'price' ? b.price - a.price : b.last_score - a.last_score);
    }, [athletes, position, search, sortBy, currentLeagueId]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 z-[70] max-w-md mx-auto glass-premium rounded-t-[3rem] border-t border-white/10 flex flex-col h-[85vh] overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-6 flex flex-col gap-4 border-b border-white/5 bg-black/20">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <h3 className="text-2xl font-bebas text-white tracking-tight uppercase">
                                        Escalando <span className="text-volt">{position}</span>
                                    </h3>
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                        {filteredAthletes.length} atletas disponíveis
                                    </span>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Search & Filters */}
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Buscar craque..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold text-white placeholder:text-gray-600 outline-none focus:border-volt/30 transition-all"
                                    />
                                </div>
                                <button className="w-12 h-12 bg-black/40 border border-white/10 rounded-2xl flex items-center justify-center text-gray-400">
                                    <Filter size={18} />
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 no-scrollbar">
                            {filteredAthletes.map((athlete) => {
                                const isSelected = athlete.id === currentAthleteId;
                                return (
                                    <motion.div
                                        key={athlete.id}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => {
                                            onSelect(athlete);
                                            onClose();
                                        }}
                                        className={`p-4 rounded-[2rem] border transition-all flex items-center justify-between group ${
                                            isSelected 
                                            ? 'bg-volt border-volt text-black' 
                                            : 'bg-deep-charcoal border-white/5 text-white hover:border-white/10'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${isSelected ? 'bg-black/10 border-black/10' : 'bg-black border-white/5'}`}>
                                                <span className="text-xl">🏃</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black uppercase italic tracking-tighter">
                                                    {athlete.name}
                                                </span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${isSelected ? 'bg-black/20 text-black' : 'bg-white/5 text-gray-500'}`}>
                                                        {teams.find(t => t.id === athlete.team_id)?.name || 'S/T'}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <TrendingUp size={8} className={isSelected ? 'text-black' : 'text-volt'} />
                                                        <span className={`text-[9px] font-bold ${isSelected ? 'text-black' : 'text-gray-400'}`}>
                                                            Média: {athlete.last_score || '0.0'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-lg font-bebas italic leading-none">
                                                C$ {athlete.price}
                                            </span>
                                            {isSelected ? (
                                                <span className="text-[7px] font-black uppercase mt-1">Já escalado</span>
                                            ) : (
                                                <div className="flex items-center gap-1 mt-1 text-volt">
                                                    <UserPlus size={10} />
                                                    <span className="text-[8px] font-black uppercase">Escalar</span>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}

                            {filteredAthletes.length === 0 && (
                                <div className="py-20 text-center flex flex-col items-center gap-4 opacity-30">
                                    <Search size={40} />
                                    <p className="text-[10px] font-black uppercase tracking-widest max-w-[200px]">Nenhum atleta encontrado para esta posição.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
