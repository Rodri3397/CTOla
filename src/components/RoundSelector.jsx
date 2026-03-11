import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, Plus } from 'lucide-react';

export default function RoundSelector({ isAdmin = false }) {
    const { rounds, activeRoundId, setActiveRound, fetchRounds, createRound, loading } = useStore();

    useEffect(() => {
        fetchRounds();
    }, [fetchRounds]);

    if (rounds.length === 0 && !isAdmin) return null;

    return (
        <div className="w-full overflow-x-auto no-scrollbar py-2">
            <div className="flex items-center gap-2 px-1">
                {rounds.map((r) => (
                    <button
                        key={r.id}
                        onClick={() => setActiveRound(r.id)}
                        className={`flex-shrink-0 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border
                            ${activeRoundId === r.id
                                ? 'bg-neon text-black border-neon shadow-[0_0_15px_rgba(0,245,255,0.3)]'
                                : 'bg-white/5 text-gray-500 border-white/5 hover:border-white/10'}`}
                    >
                        R{r.number}
                    </button>
                ))}

                {isAdmin && (
                    <button
                        onClick={createRound}
                        disabled={loading}
                        className="flex-shrink-0 w-10 h-10 rounded-2xl bg-white/5 border border-dashed border-white/10 flex items-center justify-center text-gray-500 hover:text-neon hover:border-neon/30 transition-all"
                    >
                        <Plus size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}
