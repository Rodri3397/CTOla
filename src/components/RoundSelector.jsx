import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, Plus } from 'lucide-react';

export default function RoundSelector({ isAdmin = false }) {
    const { rounds, activeRoundId, setActiveRound, fetchRounds, createRound, loading } = useStore();

    useEffect(() => {
        if ((rounds || []).length === 0) {
            fetchRounds();
        }
    }, [fetchRounds, (rounds || []).length]);

    if ((rounds || []).length === 0 && !isAdmin) return null;

    return (
        <div className="w-full overflow-x-auto no-scrollbar py-2">
            <div className="flex items-center gap-2 px-1">
                {(rounds || []).map((r) => (
                    <button
                        key={r.id}
                        onClick={() => setActiveRound(r.id)}
                        className={`flex-shrink-0 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border
                            ${activeRoundId === r.id
                                ? 'bg-volt text-black border-volt shadow-[0_0_20px_rgba(223,255,0,0.4)] scale-105 z-10'
                                : 'bg-white/5 text-gray-500 border-white/5 hover:border-white/10'}`}
                    >
                        Rodada {r.number}
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
