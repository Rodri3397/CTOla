import React, { useState } from 'react';
import { Shield, Plus, LucideLayout } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PitchSlot = ({ athlete, label, isCaptain, onSelect, position }) => {
    return (
        <motion.div
            layout
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-3 group cursor-pointer"
        >
            <div className="relative">
                {/* Glow Effect Dynamically colored */}
                <div className={`absolute inset-0 blur-2xl rounded-full transition-opacity duration-1000 ${athlete ? 'bg-volt/20 opacity-100' : 'bg-white/5 opacity-0'}`} />

                <motion.div
                    whileHover={{ scale: 1.08, y: -4 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={onSelect}
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-2xl relative z-10 transition-all duration-500 border-2
                               ${athlete
                            ? 'bg-deep-charcoal border-white/20 group-hover:border-volt/60'
                            : 'bg-black/40 border-dashed border-white/10 text-white/5 hover:border-white/20'}`}
                >
                    {athlete ? (
                        <span className="drop-shadow-2xl">{athlete.photo || '👤'}</span>
                    ) : (
                        <Plus size={16} className="opacity-20 group-hover:opacity-100 group-hover:text-volt transition-all" />
                    )}

                    {athlete && isCaptain && (
                        <div className="absolute -top-1 -right-1 bg-volt p-1 rounded-lg border-2 border-black shadow-[0_4px_10px_rgba(223,255,0,0.5)]">
                            <Shield className="w-3 h-3 text-black" />
                        </div>
                    )}
                </motion.div>
            </div>

            <div className="flex flex-col items-center gap-1.5">
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-500 group-hover:text-volt transition-colors">
                    {label}
                </span>
                {athlete && (
                    <div className="bg-black/60 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
                        <span className="text-[10px] font-bold italic uppercase leading-none text-white tracking-widest">
                            {athlete.name.split(' ')[0]}
                        </span>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default function Pitch({ squad, onSetCaptain, onSelectSlot, captainId }) {
    const [formation, setFormation] = useState('2-2'); // '2-2', '3-1', '4-0'

    const renderFormation = () => {
        switch (formation) {
            case '3-1':
                return (
                    <div className="flex flex-col justify-between h-full py-4 relative z-10">
                        <div className="flex justify-center"><PitchSlot athlete={squad.goleiro} label="Goleiro" position="GOLEIRO" onSelect={() => onSelectSlot('goleiro', 'GOLEIRO')} /></div>
                        <div className="flex justify-center"><PitchSlot athlete={squad.fixo} label="Fixo" position="FIXO" onSelect={() => onSelectSlot('fixo', 'FIXO')} /></div>
                        <div className="flex justify-center gap-16"><PitchSlot athlete={squad.line3} label="Ala Esq." position="ALA" onSelect={() => onSelectSlot('line3', 'ALA')} /><PitchSlot athlete={squad.line4} label="Ala Dir." position="ALA" onSelect={() => onSelectSlot('line4', 'ALA')} /></div>
                        <div className="flex justify-center"><PitchSlot athlete={squad.line5} label="Pivô" position="PIVO" onSelect={() => onSelectSlot('line5', 'PIVO')} /></div>
                    </div>
                );
            case '4-0':
                return (
                    <div className="flex flex-col justify-between h-full py-4 relative z-10">
                        <div className="flex justify-center"><PitchSlot athlete={squad.goleiro} label="Goleiro" position="GOLEIRO" onSelect={() => onSelectSlot('goleiro', 'GOLEIRO')} /></div>
                        <div className="grid grid-cols-2 gap-y-12 gap-x-8 px-4 mt-8">
                             <PitchSlot athlete={squad.fixo} label="Linha 1" position="FIXO" onSelect={() => onSelectSlot('fixo', 'FIXO')} />
                             <PitchSlot athlete={squad.line3} label="Linha 2" position="ALA" onSelect={() => onSelectSlot('line3', 'ALA')} />
                             <PitchSlot athlete={squad.line4} label="Linha 3" position="ALA" onSelect={() => onSelectSlot('line4', 'ALA')} />
                             <PitchSlot athlete={squad.line5} label="Linha 4" position="PIVO" onSelect={() => onSelectSlot('line5', 'PIVO')} />
                        </div>
                    </div>
                );
            default: // 2-2
                return (
                    <div className="flex flex-col justify-between h-full py-4 relative z-10">
                        <div className="flex justify-center"><PitchSlot athlete={squad.goleiro} label="Goleiro" position="GOLEIRO" onSelect={() => onSelectSlot('goleiro', 'GOLEIRO')} /></div>
                        <div className="flex justify-around mt-4"><PitchSlot athlete={squad.fixo} label="Defesa Esq." position="FIXO" onSelect={() => onSelectSlot('fixo', 'FIXO')} /><PitchSlot athlete={squad.line3} label="Defesa Dir." position="ALA" onSelect={() => onSelectSlot('line3', 'ALA')} /></div>
                        <div className="flex justify-around mb-4"><PitchSlot athlete={squad.line4} label="Ataque Esq." position="ALA" onSelect={() => onSelectSlot('line4', 'ALA')} /><PitchSlot athlete={squad.line5} label="Ataque Dir." position="PIVO" onSelect={() => onSelectSlot('line5', 'PIVO')} /></div>
                    </div>
                );
        }
    };

    return (
        <div className="relative w-full">
            {/* Seletor de Tática Premium */}
            <div className="absolute -top-16 left-0 right-0 flex justify-center gap-3 z-30">
                {['2-2', '3-1', '4-0'].map(f => (
                    <motion.button
                        key={f}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setFormation(f)}
                        className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-2xl ${formation === f ? 'bg-volt text-black shadow-volt/20' : 'bg-deep-charcoal text-gray-500 border border-white/5 mt-1'}`}
                    >
                        {f}
                    </motion.button>
                ))}
            </div>

            <div className="h-[540px] w-full rounded-[4rem] bg-gradient-to-b from-[#0a0a0a] to-[#000000] border border-white/10 p-8 relative overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)]">
                {/* Field Lines (Apple-styled Clean) */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
                    <div className="absolute inset-6 border-[3px] border-white rounded-[2rem]" />
                    <div className="absolute top-1/2 left-0 right-0 h-[3px] bg-white -translate-y-1/2" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-[3px] border-white rounded-full" />
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 w-64 h-32 border-[3px] border-white border-t-0 rounded-b-[6rem]" />
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-64 h-32 border-[3px] border-white border-b-0 rounded-t-[6rem]" />
                </div>

                <div className="relative z-10 h-full">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={formation}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="h-full"
                        >
                            {renderFormation()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
