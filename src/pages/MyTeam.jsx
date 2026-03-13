import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Shield, Loader2 } from 'lucide-react';
import Pitch from '../components/Pitch';
import AthleteDrawer from '../components/AthleteDrawer';

const MyTeam = () => {
    const {
        athletes, currentLeagueId,
        saveUserSquad, fetchUserSquad, activeRoundId, rounds,
        draftSquad, draftCaptainId, setDraftSquad, setDraftCaptain,
        myFollowedLeaguesDetails, updateTeamName
    } = useStore();
    const navigate = useNavigate();

    const [isSaving, setIsSaving] = useState(false);
    const [drawer, setDrawer] = useState({ isOpen: false, slot: null, pos: null });
    const [tempTeamName, setTempTeamName] = useState('');
    const [isNamingTeam, setIsNamingTeam] = useState(false);

    const activeRound = rounds.find(r => r.id === activeRoundId);
    const isMarketOpen = activeRound?.status === 'open' || !activeRound;

    const squadObjects = {};
    Object.entries(draftSquad).forEach(([slot, id]) => {
        squadObjects[slot] = athletes.find(a => String(a.id) === String(id)) || null;
    });

    const currentLeagueMember = myFollowedLeaguesDetails.find(l => l.id === currentLeagueId);
    const hasTeamName = !!currentLeagueMember?.team_name;

    useEffect(() => {
        if (currentLeagueId) {
            useStore.getState().fetchLeagueData();
            loadDbSquad();
        }
    }, [currentLeagueId]);

    const loadDbSquad = async () => {
        const dbSquad = await fetchUserSquad();
        if (dbSquad) {
            setDraftSquad(dbSquad.squad_data || {});
            setDraftCaptain(dbSquad.captain_id);
        }
    };

    const handleSaveSquad = async () => {
        if (!isMarketOpen) return;
        setIsSaving(true);
        const { error } = await saveUserSquad(draftSquad, draftCaptainId);
        if (!error) {
            alert('Escalação salva!');
        }
        setIsSaving(false);
    };

    const handleSelectSlot = (slot, pos) => {
        if (!isMarketOpen) return;
        setDrawer({ isOpen: true, slot, pos });
    };

    const handleSelectAthlete = (athlete) => {
        const newDraft = { ...draftSquad, [drawer.slot]: athlete.id };
        setDraftSquad(newDraft);
        if (drawer.slot === 'line3' || !draftCaptainId) {
            setDraftCaptain(athlete.id);
        }
    };

    if (!currentLeagueId) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in px-8">
                <div className="w-24 h-24 bg-volt/10 rounded-[2.5rem] flex items-center justify-center mb-8 border border-volt/20">
                    <Users className="text-volt opacity-50" size={40} />
                </div>
                <h2 className="text-2xl font-bebas text-white uppercase tracking-tight">Escalação Inativa</h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-3 text-center leading-loose">
                    Selecione uma liga no início para começar a montar seu esquadrão de futsal.
                </p>
                <button
                    onClick={() => navigate('/')}
                    className="mt-10 px-10 py-5 bg-volt text-black rounded-2xl font-black text-[10px] uppercase shadow-2xl hover:scale-105 transition-all"
                >
                    Voltar para Início
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 animate-fade-in pb-32">
            <header className="flex justify-between items-end px-1">
                <div className="flex flex-col">
                    <h1 className="text-4xl font-bebas italic text-white leading-none tracking-tighter">MEU <span className="text-volt">TIME</span></h1>
                    <div className="flex items-center gap-2 mt-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${isMarketOpen ? 'bg-volt animate-pulse' : 'bg-electric-crimson'}`}></div>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${isMarketOpen ? 'text-volt' : 'text-electric-crimson'}`}>
                            MERCADO {isMarketOpen ? 'ABERTO' : 'FECHADO'}
                        </span>
                    </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                    <span className="text-[10px] font-bebas text-white uppercase tracking-widest">
                        {myFollowedLeaguesDetails.find(l => l.id === currentLeagueId)?.name}
                    </span>
                    <span className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">
                        {activeRound ? `Rodada #${activeRound.number}` : 'Pre-Season'}
                    </span>
                </div>
            </header>

            <Pitch
                squad={squadObjects}
                onSelectSlot={handleSelectSlot}
                captainId={draftCaptainId}
            />

            <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="bento-card flex flex-col gap-1 py-4">
                    <span className="text-[8px] font-black uppercase text-gray-500 tracking-widest leading-none">Valor Total</span>
                    <span className="text-xl font-bebas text-white italic">
                        C$ {Object.values(squadObjects).reduce((acc, curr) => acc + (curr?.price || 0), 0).toFixed(1)}
                    </span>
                </div>
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSaveSquad}
                    disabled={!isMarketOpen || isSaving}
                    className={`rounded-[2rem] border font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center ${
                        !isMarketOpen ? 'bg-deep-charcoal text-gray-600 border-white/5' : 'bg-volt text-black shadow-2xl shadow-volt/20 border-volt'
                    }`}
                >
                    {isSaving ? 'Salvando...' : 'Confirmar'}
                </motion.button>
            </div>

            <AthleteDrawer 
                isOpen={drawer.isOpen}
                onClose={() => setDrawer({ ...drawer, isOpen: false })}
                position={drawer.pos}
                onSelect={handleSelectAthlete}
                currentAthleteId={draftSquad[drawer.slot]}
            />

            <AnimatePresence>
                {!hasTeamName && currentLeagueId && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/95 backdrop-blur-2xl"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="w-full max-w-sm glass-premium p-10 rounded-[3.5rem] border border-white/10 flex flex-col gap-10 text-center"
                        >
                            <div className="flex flex-col items-center gap-6">
                                <div className="w-24 h-24 bg-volt/10 rounded-[3rem] flex items-center justify-center border border-volt/20 shadow-2xl shadow-volt/5">
                                    <Shield className="text-volt" size={48} />
                                </div>
                                <div className="space-y-3">
                                    <h2 className="text-3xl font-bebas text-white italic tracking-tight uppercase">Batize sua Equipe</h2>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                                        Escolha um nome de impacto para sua jornada.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                <input
                                    type="text"
                                    value={tempTeamName}
                                    onChange={(e) => setTempTeamName(e.target.value.toUpperCase())}
                                    placeholder="NOME DO TIME"
                                    className="w-full bg-deep-charcoal border border-white/10 rounded-[1.5rem] py-5 px-6 text-center text-sm font-black text-volt placeholder:text-gray-700 outline-none focus:border-volt/40 transition-all uppercase"
                                />
                                <button
                                    onClick={async () => {
                                        if (!tempTeamName.trim()) return;
                                        setIsNamingTeam(true);
                                        await updateTeamName(currentLeagueId, tempTeamName.trim());
                                        setIsNamingTeam(false);
                                    }}
                                    disabled={isNamingTeam || !tempTeamName.trim()}
                                    className="w-full bg-volt text-black py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-all disabled:opacity-30"
                                >
                                    {isNamingTeam ? <Loader2 className="animate-spin mx-auto" /> : 'Começar Agora'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MyTeam;
