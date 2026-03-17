const PitchSlot = ({ athlete, label, isCaptain, onSelect, onRemove, position }) => {
    return (
        <motion.div
            layout
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-3 group px-2"
        >
            <div className="relative">
                <div className={`absolute inset-0 blur-2xl rounded-full transition-opacity duration-1000 ${athlete ? 'bg-volt/20 opacity-100' : 'bg-white/5 opacity-0'}`} />

                <motion.div
                    whileHover={{ scale: 1.08, y: -4 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => athlete ? onRemove?.() : onSelect()}
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-2xl relative z-10 transition-all duration-500 border-2
                               ${athlete
                            ? 'bg-deep-charcoal border-white/20 group-hover:border-volt/60'
                            : 'bg-black/40 border-dashed border-white/10 text-white/5 hover:border-white/20'}`}
                >
                    {athlete ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                            <span className="drop-shadow-2xl">{athlete.photo || '👤'}</span>
                            {/* Sell Icon on Hover */}
                            <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Plus size={20} className="text-volt rotate-45" />
                            </div>
                        </div>
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

            <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-500 group-hover:text-volt transition-colors">
                    {athlete ? athlete.pos : label}
                </span>
                {athlete && (
                    <div className="bg-black/60 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md max-w-[90px] overflow-hidden">
                        <span className="text-[9px] font-bold italic uppercase leading-none text-white tracking-widest truncate block">
                            {athlete.name.split(' ')[0]}
                        </span>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default function Pitch({ squad, onSetCaptain, onSelectSlot, onRemoveSlot, captainId }) {
    return (
        <div className="relative w-full">
            <div className="h-[600px] w-full rounded-[4rem] bg-gradient-to-b from-[#0a0a0a] to-[#000000] border border-white/10 p-8 relative overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)]">
                {/* Field Lines */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
                    <div className="absolute inset-6 border-[3px] border-white rounded-[2rem]" />
                    <div className="absolute top-1/2 left-0 right-0 h-[3px] bg-white -translate-y-1/2" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-[3px] border-white rounded-full" />
                </div>

                <div className="relative z-10 h-full flex flex-col justify-between py-6">
                    {/* Goleiro */}
                    <div className="flex justify-center">
                        <PitchSlot 
                            athlete={squad.goleiro} 
                            label="Goleiro" 
                            isCaptain={String(squad.goleiro?.id) === String(captainId)}
                            onSelect={() => onSelectSlot('goleiro', 'GOLEIRO')}
                            onRemove={() => onRemoveSlot('goleiro')}
                        />
                    </div>

                    {/* Fixo e Ala 1 */}
                    <div className="flex justify-around">
                        <PitchSlot 
                            athlete={squad.fixo} 
                            label="Fixo" 
                            isCaptain={String(squad.fixo?.id) === String(captainId)}
                            onSelect={() => onSelectSlot('fixo', 'FIXO')}
                            onRemove={() => onRemoveSlot('fixo')}
                        />
                        <PitchSlot 
                            athlete={squad.ala1} 
                            label="Ala" 
                            isCaptain={String(squad.ala1?.id) === String(captainId)}
                            onSelect={() => onSelectSlot('ala1', 'ALA')}
                            onRemove={() => onRemoveSlot('ala1')}
                        />
                    </div>

                    {/* Ala 2 e Pivo 1 */}
                    <div className="flex justify-around">
                        <PitchSlot 
                            athlete={squad.ala2} 
                            label="Ala" 
                            isCaptain={String(squad.ala2?.id) === String(captainId)}
                            onSelect={() => onSelectSlot('ala2', 'ALA')}
                            onRemove={() => onRemoveSlot('ala2')}
                        />
                        <PitchSlot 
                            athlete={squad.pivo1} 
                            label="Pivô" 
                            isCaptain={String(squad.pivo1?.id) === String(captainId)}
                            onSelect={() => onSelectSlot('pivo1', 'PIVO')}
                            onRemove={() => onRemoveSlot('pivo1')}
                        />
                    </div>

                    {/* Pivo 2 (O 6º Jogador / 5º de Linha) */}
                    <div className="flex justify-center">
                        <PitchSlot 
                            athlete={squad.pivo2} 
                            label="Linha" 
                            isCaptain={String(squad.pivo2?.id) === String(captainId)}
                            onSelect={() => onSelectSlot('pivo2', 'PIVO')}
                            onRemove={() => onRemoveSlot('pivo2')}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
