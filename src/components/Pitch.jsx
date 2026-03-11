import React from 'react';
import { Shield, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

const PitchSlot = ({ athlete, label, isCaptain, onSelect }) => {
    return (
        <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-2 group cursor-pointer"
        >
            <div className="relative">
                <div className={`absolute inset-0 blur-xl rounded-full transition-opacity duration-500 opacity-20 ${athlete ? 'bg-white' : 'bg-black/20'}`} />

                <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onSelect}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-2xl relative z-10 transition-all duration-300
                               ${athlete
                            ? 'bg-white/10 border border-white/20'
                            : 'border border-dashed border-white/10 text-white/20 hover:border-white/20'}`}
                >
                    {athlete ? '👤' : <Plus size={18} />}

                    {athlete && isCaptain && (
                        <div className="absolute -top-2 -right-2 bg-neon p-1.5 rounded-lg border-2 border-[#0f1115] shadow-lg">
                            <Shield className="w-3 h-3 text-black" />
                        </div>
                    )}
                </motion.div>
            </div>

            <div className="flex flex-col items-center">
                <span className="text-[7px] font-black uppercase tracking-widest text-white/40 mb-0.5">
                    {label}
                </span>
                {athlete && (
                    <span className="text-[8px] font-black italic uppercase leading-none transition-colors group-hover:text-neon text-white">
                        {athlete.name.split(' ')[0]}
                    </span>
                )}
            </div>
        </motion.div>
    );
};

export default function Pitch({ squad, onSetCaptain, onSelectSlot, captainId }) {
    return (
        <div className="h-[480px] w-full rounded-[3rem] bg-gradient-to-b from-[#0b543b] to-[#043324] border border-white/10 p-10 flex flex-col justify-between relative overflow-hidden shadow-2xl">
            {/* Field Lines */}
            <div className="absolute inset-0 pointer-events-none opacity-10">
                <div className="absolute inset-5 border border-white rounded-lg" />
                <div className="absolute top-1/2 left-0 right-0 h-px bg-white -translate-y-1/2" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-white rounded-full" />

                {/* Rectangles top/bottom */}
                <div className="absolute top-5 left-1/2 -translate-x-1/2 w-48 h-24 border border-white border-t-0 rounded-b-[4rem]" />
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-48 h-24 border border-white border-b-0 rounded-t-[4rem]" />
            </div>

            {/* Position Layers */}
            <div className="relative z-10 h-full flex flex-col justify-between py-2">
                {/* 1. GOALKEEPER */}
                <div className="flex justify-center">
                    <PitchSlot
                        athlete={squad.goleiro}
                        label="Goleiro"
                        isCaptain={captainId === 'goleiro'}
                        onSelect={() => onSelectSlot('goleiro', 'GOLEIRO')}
                    />
                </div>

                {/* 2. FIXO */}
                <div className="flex justify-center">
                    <PitchSlot
                        athlete={squad.fixo}
                        label="Fixo"
                        isCaptain={captainId === 'fixo'}
                        onSelect={() => onSelectSlot('fixo', 'FIXO')}
                    />
                </div>

                {/* 3. CAPITÃO / JOGADOR DE LINHA / PIVOT */}
                <div className="flex justify-around gap-2 pb-4">
                    <PitchSlot
                        athlete={squad.line3}
                        label="Capitão"
                        isCaptain={captainId === 'line3'}
                        onSelect={() => onSelectSlot('line3', 'ALA')}
                    />
                    <PitchSlot
                        athlete={squad.line4}
                        label="Jogador de Linha"
                        isCaptain={captainId === 'line4'}
                        onSelect={() => onSelectSlot('line4', 'ALA')}
                    />
                    <PitchSlot
                        athlete={squad.line5}
                        label="Pivô"
                        isCaptain={captainId === 'line5'}
                        onSelect={() => onSelectSlot('line5', 'PIVO')}
                    />
                </div>
            </div>
        </div>
    );
}
