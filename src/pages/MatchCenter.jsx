import React from 'react';
import { MATCHES } from '../data/mock';
import { Trophy, Clock, MapPin, ChevronRight, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MatchCenter() {
    return (
        <div className="flex flex-col gap-6 animate-fade pb-24">
            <header className="flex justify-between items-end">
                <h1 className="text-2xl font-black italic uppercase">Match Center</h1>
                <div className="flex items-center gap-2 bg-neon/10 px-3 py-1 rounded-full border border-neon/20">
                    <Zap size={10} className="text-neon fill-neon" />
                    <span className="text-[8px] text-neon font-black uppercase tracking-widest">Rodada 04</span>
                </div>
            </header>

            <div className="flex flex-col gap-4">
                {MATCHES.map((match, idx) => (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        key={match.id}
                        className="glass p-5 rounded-[2rem] flex flex-col gap-4 group cursor-pointer border-white/5"
                    >
                        <div className="flex justify-between items-center text-gray-500">
                            <div className="flex items-center gap-2">
                                <Clock size={12} />
                                <span className="text-[10px] font-bold uppercase">{match.time}</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                <MapPin size={10} />
                                <span className="text-[8px] font-black uppercase tracking-tighter">Quadra Master</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-around relative py-2">
                            <div className="flex flex-col items-center gap-2 w-1/3">
                                <div className="w-14 h-14 rounded-2xl bg-surface-light flex items-center justify-center text-3xl shadow-lg border border-white/5">
                                    🛡️
                                </div>
                                <span className="text-[10px] font-black italic uppercase text-center leading-tight line-clamp-1">{match.home}</span>
                            </div>

                            <div className="flex flex-col items-center gap-1">
                                {match.score ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl font-black">{match.score.split('x')[0]}</span>
                                        <span className="text-gray-600 font-bold italic">x</span>
                                        <span className="text-2xl font-black">{match.score.split('x')[1]}</span>
                                    </div>
                                ) : (
                                    <div className="px-3 py-1 rounded-lg bg-surface-light border border-white/10 text-[10px] font-black text-gray-400 italic">
                                        VS
                                    </div>
                                )}
                                <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${match.score ? 'bg-red-500/10 text-red-500' : 'bg-neon/10 text-neon'}`}>
                                    {match.score ? 'Encerrado' : 'Próximo'}
                                </span>
                            </div>

                            <div className="flex flex-col items-center gap-2 w-1/3">
                                <div className="w-14 h-14 rounded-2xl bg-surface-light flex items-center justify-center text-3xl shadow-lg border border-white/5">
                                    🔥
                                </div>
                                <span className="text-[10px] font-black italic uppercase text-center leading-tight line-clamp-1">{match.away}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-center gap-2 pt-4 border-t border-white/5 group-hover:border-neon/20 transition-all">
                            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-500 group-hover:text-neon">Ver Detalhes</span>
                            <ChevronRight size={12} className="text-gray-500 group-hover:text-neon group-hover:translate-x-1 transition-all" />
                        </div>
                    </motion.div>
                ))}
            </div>

            <section className="flex flex-col gap-4">
                <header className="flex justify-between items-center px-1">
                    <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <Trophy size={14} className="text-neon" />
                        Seleção Parcial
                    </h2>
                </header>

                <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="glass min-w-[120px] p-4 rounded-3xl flex flex-col items-center gap-3 border-white/5 group">
                            <div className="w-12 h-12 rounded-2xl bg-surface-light flex items-center justify-center text-2xl shadow-lg border border-white/5">
                                👤
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] font-bold text-white">Atleta {i}</span>
                                <span className="text-[8px] text-neon font-black italic">Pts: {15 - i}.4</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
