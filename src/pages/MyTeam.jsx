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
            useStore.getState().fetchMyFollowedLeagues(); // Force member data sync
            useStore.getState().fetchLeagueData();
            loadDbSquad();
        }
    }, [currentLeagueId, activeRoundId]); // Reload squad on round change too

    const loadDbSquad = async () => {
        // Clear draft before loading from DB to avoid "ghosting" between rounds
        setDraftSquad({});
        setDraftCaptain(null);
        
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
            // No alert for better UX, or a less intrusive one
            get().setNotification({ message: 'Escalação salva!', type: 'success' });
        }
        setIsSaving(false);
    };

    const [actionModal, setActionModal] = useState({ isOpen: false, slot: null, athlete: null });

    const totalCost = Object.values(squadObjects).reduce((acc, curr) => acc + (curr?.price || 0), 0);
    const patrimony = 100.0; // This should ideally come from user profile/wallet
    const balance = patrimony - totalCost;

    const handleSelectSlot = (slot, pos) => {
        if (!isMarketOpen) return;
        setDrawer({ isOpen: true, slot, pos });
    };

    const handleRemoveAthlete = (slot) => {
        const newDraft = { ...draftSquad };
        const removedAthleteId = newDraft[slot];
        newDraft[slot] = null;
        setDraftSquad(newDraft);
        if (String(draftCaptainId) === String(removedAthleteId)) {
            setDraftCaptain(null);
        }
    };

    const handleSelectAthlete = (athlete) => {
        // Check budget
        const currentSlotPrice = squadObjects[drawer.slot]?.price || 0;
        if (balance + currentSlotPrice < athlete.price) {
            alert('Saldo insuficiente para contratar este craque!');
            return;
        }

        const newDraft = { ...draftSquad, [drawer.slot]: athlete.id };
        setDraftSquad(newDraft);
        if (!draftCaptainId) {
            setDraftCaptain(athlete.id);
        }
    };

    const handleActionClick = (slot) => {
        if (!isMarketOpen) return;
        const athlete = squadObjects[slot];
        if (athlete) {
            setActionModal({ isOpen: true, slot, athlete });
        } else {
            handleSelectSlot(slot, slot.includes('ala') ? 'ALA' : slot.includes('pivo') ? 'PIVO' : slot.toUpperCase());
        }
    };

    if (!currentLeagueId) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-8">
                <Users className="text-volt opacity-20 mb-6" size={64} />
                <h2 className="text-2xl font-bebas text-white uppercase tracking-tight">Escalação Inativa</h2>
                <button
                    onClick={() => navigate('/')}
                    className="mt-8 px-8 py-4 bg-volt text-black rounded-2xl font-black text-[10px] uppercase shadow-2xl"
                >
                    Selecionar Liga
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 animate-fade-in pb-32">
            {/* Sticky Budget Bar - consistent with MyTeam */}
            <div className="sticky top-0 z-[60] bg-pure-black/60 backdrop-blur-xl -mx-5 px-5 py-4 border-b border-white/5">
                <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1 items-center">
                        <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest">Patrimônio</span>
                        <span className="text-sm font-bebas text-white">C$ {patrimony.toFixed(1)}</span>
                    </div>
                    <div className="flex flex-col gap-1 items-center border-x border-white/10">
                        <span className="text-[7px] font-black text-volt/60 uppercase tracking-widest">Custo</span>
                        <span className="text-sm font-bebas text-volt">C$ {totalCost.toFixed(1)}</span>
                    </div>
                    <div className="flex flex-col gap-1 items-center">
                        <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest">Saldo</span>
                        <span className={`text-sm font-bebas ${balance < 0 ? 'text-electric-crimson' : 'text-white'}`}>C$ {balance.toFixed(1)}</span>
                    </div>
                </div>
            </div>

            <header className="px-1 flex justify-between items-center mt-2">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bebas italic text-white tracking-tighter">MEU <span className="text-volt">TIME</span></h1>
                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em]">{activeRound ? `RODADA ${activeRound.number}` : 'CARREGANDO...'}</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSaveSquad}
                        disabled={!isMarketOpen || isSaving || balance < 0}
                        className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                            !isMarketOpen || balance < 0 ? 'bg-deep-charcoal text-gray-600' : 'bg-volt text-black shadow-xl shadow-volt/20'
                        }`}
                    >
                        {isSaving ? '...' : 'Confirmar'}
                    </button>
                </div>
            </header>

            <div className="px-1 -mt-2">
                <RoundSelector />
            </div>

            <Pitch
                squad={squadObjects}
                onSelectSlot={handleActionClick}
                onRemoveSlot={handleRemoveAthlete}
                captainId={draftCaptainId}
            />

            {/* Action Selection Modal */}
            <AnimatePresence>
                {actionModal.isOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
                            onClick={() => setActionModal({ ...actionModal, isOpen: false })}
                        />
                        <motion.div 
                            initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
                            className="fixed bottom-10 left-6 right-6 z-[101] glass-premium p-8 rounded-[3rem] border border-white/10 flex flex-col gap-4 text-center"
                        >
                            <h3 className="text-xl font-bebas text-white uppercase tracking-tight">O que deseja fazer com <span className="text-volt">{actionModal.athlete?.name}</span>?</h3>
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <button
                                    onClick={() => {
                                        setDraftCaptain(actionModal.athlete.id);
                                        setActionModal({ ...actionModal, isOpen: false });
                                    }}
                                    className="bg-white/5 border border-white/10 text-white py-4 rounded-2xl font-black text-[9px] uppercase hover:bg-volt hover:text-black transition-all flex flex-col items-center gap-2"
                                >
                                    <Shield size={20} />
                                    Ser Capitão
                                </button>
                                <button
                                    onClick={() => {
                                        handleRemoveAthlete(actionModal.slot);
                                        setActionModal({ ...actionModal, isOpen: false });
                                    }}
                                    className="bg-electric-crimson/10 border border-electric-crimson/20 text-electric-crimson py-4 rounded-2xl font-black text-[9px] uppercase flex flex-col items-center gap-2"
                                >
                                    <Plus size={20} className="rotate-45" />
                                    Vender
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

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
