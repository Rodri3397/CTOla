import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Pitch from '../components/Pitch';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, User, Plus, Users } from 'lucide-react';

const MyTeam = () => {
    const {
        athletes, teams, fetchAthletes, fetchTeams, currentLeagueId,
        saveUserSquad, fetchUserSquad, activeRoundId, rounds,
        draftSquad, draftCaptainId, setDraftSquad, setDraftCaptain,
        myFollowedLeaguesDetails, updateTeamName
    } = useStore();
    const navigate = useNavigate();

    const [isSaving, setIsSaving] = useState(false);
    const [modalData, setModalData] = useState({ isOpen: false, slot: null, pos: null, step: 'teams', selectedTeamId: null });
    const [tempTeamName, setTempTeamName] = useState('');
    const [isNamingTeam, setIsNamingTeam] = useState(false);

    const activeRound = rounds.find(r => r.id === activeRoundId);
    const isMarketOpen = activeRound?.status === 'open' || !activeRound;

    // Map athlete IDs in draftSquad to objects for rendering
    const squadObjects = {};
    Object.entries(draftSquad).forEach(([slot, id]) => {
        squadObjects[slot] = athletes.find(a => a.id === id) || null;
    });

    const currentLeagueMember = myFollowedLeaguesDetails.find(l => l.id === currentLeagueId);
    const hasTeamName = !!currentLeagueMember?.team_name;

    useEffect(() => {
        if (currentLeagueId) {
            fetchAthletes();
            fetchTeams();
            loadDbSquad();
        }
    }, [currentLeagueId, activeRoundId]);

    const loadDbSquad = async () => {
        const dbSquad = await fetchUserSquad();
        if (dbSquad) {
            // Priority: DB squad if it exists
            setDraftSquad(dbSquad.squad_data || {});
            setDraftCaptain(dbSquad.captain_id);
        }
        // If no DB squad, draftSquad in store already has localStorage fallback
    };

    const handleSaveSquad = async () => {
        if (!isMarketOpen) return;
        setIsSaving(true);

        const { error } = await saveUserSquad(draftSquad, draftCaptainId);
        if (!error) {
            alert('Escalação salva com sucesso!');
        } else {
            alert('Erro ao salvar: ' + error);
        }
        setIsSaving(false);
    };


    const handleRemovePlayer = (slot) => {
        if (!isMarketOpen) return;
        const newDraft = { ...draftSquad };
        delete newDraft[slot];
        setDraftSquad(newDraft);
        if (draftCaptainId === draftSquad[slot]) setDraftCaptain(null);
    };

    const handleSelectSlot = (slot, pos) => {
        if (draftSquad[slot]) {
            handleRemovePlayer(slot);
        } else {
            setModalData({ isOpen: true, slot, pos, step: 'teams', selectedTeamId: null });
        }
    };

    const handleSelectTeam = (teamId) => {
        setModalData(prev => ({ ...prev, step: 'athletes', selectedTeamId: teamId }));
    };

    const handleSelectAthlete = (athlete) => {
        const newDraft = { ...draftSquad, [modalData.slot]: athlete.id };
        setDraftSquad(newDraft);

        // Auto-set captain if it's the captain slot (line3)
        if (modalData.slot === 'line3') {
            setDraftCaptain(athlete.id);
        }

        setModalData({ isOpen: false, slot: null, pos: null, step: 'teams', selectedTeamId: null });
    };

    const handleSetCaptain = (slot) => {
        // Only line3 is captain
    };

    // Filter athletes for the second step
    const filteredAthletes = athletes.filter(a => {
        const samePos = a.pos === modalData.pos;
        const fromTeam = a.team_id === modalData.selectedTeamId;
        const alreadyInSquad = Object.values(draftSquad).some(id => id === a.id);
        return samePos && fromTeam && !alreadyInSquad;
    });

    if (!currentLeagueId) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-fade">
                <div className="w-20 h-20 bg-neon/10 rounded-full flex items-center justify-center mb-6">
                    <Users className="text-neon opacity-50" size={32} />
                </div>
                <h2 className="text-lg font-black uppercase italic">Escalação Inativa</h2>
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-2 px-10 text-center">
                    Selecione uma liga no menu Explorar para começar a escalar seu time de craques.
                </p>
                <button
                    onClick={() => navigate('/explorar')}
                    className="mt-8 px-8 py-4 bg-neon text-black rounded-2xl font-black text-[10px] uppercase shadow-xl hover:scale-105 transition-all"
                >
                    Explorar Ligas
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 animate-fade pb-24">
            <header className="flex justify-between items-start px-1">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-black italic uppercase tracking-tighter leading-none mt-1">Meu Time</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${isMarketOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className={`text-[8px] font-black uppercase tracking-widest ${isMarketOpen ? 'text-green-500' : 'text-red-500'}`}>
                            Mercado {isMarketOpen ? 'Aberto' : 'Fechado'}
                        </span>
                    </div>
                </div>
                <div className="text-right flex flex-col items-end">
                    <span className="text-[7px] font-black uppercase text-gray-600 tracking-widest mb-1">Esquema 1-1-4</span>
                    <span className="text-neon font-black text-sm italic">
                        {useStore.getState().myFollowedLeaguesDetails.find(l => l.id === currentLeagueId)?.name || 'CTOlá FC'}
                    </span>
                    <span className="text-[7px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                        Rodada {activeRound?.number || 1}
                    </span>
                </div>
            </header>

            <Pitch
                squad={squadObjects}
                onSelectSlot={handleSelectSlot}
                onSetCaptain={handleSetCaptain}
                captainId={draftCaptainId}
            />

            <div className="glass p-6 rounded-[2.5rem] flex items-center justify-between border-white/5 bg-white/5 mt-2">
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Valor do Elenco</span>
                <span className="text-lg font-black text-neon">C$ {Object.values(squadObjects).reduce((acc, curr) => acc + (curr?.price || 0), 0).toFixed(2)}</span>
            </div>

            <button
                onClick={handleSaveSquad}
                disabled={!isMarketOpen || isSaving}
                className={`w-full py-6 rounded-[2rem] font-black text-xs uppercase shadow-2xl transition-all mt-4 mb-10 ${!isMarketOpen
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'bg-neon text-black hover:scale-[1.02] active:scale-95'
                    }`}
            >
                {isSaving ? 'Salvando...' : !isMarketOpen ? 'Mercado Fechado' : 'Confirmar Escalação'}
            </button>

            {/* Selection Modal */}
            <AnimatePresence>
                {modalData.isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-sm glass-dark rounded-[3rem] border border-white/10 flex flex-col max-h-[70vh] overflow-hidden shadow-2xl shadow-neon/10"
                        >
                            <header className="p-6 border-b border-white/5 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <h2 className="text-sm font-black italic uppercase">{modalData.step === 'teams' ? 'Escolha o Time' : 'Escolha o Craque'}</h2>
                                    <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">
                                        Vaga: {modalData.slot === 'line3' ? 'Capitão' : modalData.slot === 'line6' ? 'Pivô' : 'Jogador de Linha'}
                                    </span>
                                </div>
                                <button onClick={() => setModalData({ isOpen: false })} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                                    <X size={16} />
                                </button>
                            </header>

                            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 no-scrollbar">
                                {modalData.step === 'teams' ? (
                                    teams.map((team, idx) => (
                                        <button
                                            key={team.id}
                                            onClick={() => handleSelectTeam(team.id)}
                                            className="w-full glass p-5 rounded-2xl flex items-center justify-between hover:border-neon/30 transition-all text-left group"
                                        >
                                            <span className="text-[10px] font-black uppercase tracking-widest">{team.name}</span>
                                            <ChevronRight size={16} className="text-gray-700 group-hover:text-neon" />
                                        </button>
                                    ))
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setModalData(prev => ({ ...prev, step: 'teams' }))}
                                            className="text-[8px] font-black uppercase text-neon mb-2 ml-2 hover:underline"
                                        >
                                            ← Voltar para Times
                                        </button>
                                        {filteredAthletes.length > 0 ? (
                                            filteredAthletes.map(a => (
                                                <button
                                                    key={a.id}
                                                    onClick={() => handleSelectAthlete(a)}
                                                    className="w-full glass p-5 rounded-2xl flex items-center justify-between hover:border-neon/30 transition-all text-left group"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                                            <User size={20} className="text-gray-600" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-black uppercase tracking-widest">{a.name}</span>
                                                            <span className="text-[8px] font-bold text-neon uppercase">C$ {a.price.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                    <Plus size={16} className="text-gray-700 group-hover:text-neon" />
                                                </button>
                                            ))
                                        ) : (
                                            <div className="py-10 text-center text-gray-600 text-[10px] font-bold uppercase tracking-widest">
                                                Nenhum {modalData.pos} disponível neste time.
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Team Naming Modal */}
            <AnimatePresence>
                {!hasTeamName && currentLeagueId && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full max-w-sm glass-dark p-10 rounded-[3rem] border border-neon/20 flex flex-col gap-8 shadow-2xl shadow-neon/5"
                        >
                            <div className="flex flex-col items-center gap-6">
                                <div className="w-20 h-20 bg-neon/10 rounded-[2.5rem] flex items-center justify-center border border-neon/20">
                                    <Shield className="text-neon" size={36} />
                                </div>
                                <div className="text-center">
                                    <h2 className="text-xl font-black italic uppercase text-white tracking-tighter">Batize seu Time</h2>
                                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-2 leading-relaxed">
                                        Como sua equipe será conhecida nesta liga?
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                <input
                                    type="text"
                                    value={tempTeamName}
                                    onChange={(e) => setTempTeamName(e.target.value)}
                                    placeholder="NOME DO TIME (EX: MITOS FC)"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-center text-sm font-black uppercase tracking-widest outline-none focus:border-neon transition-all"
                                />
                                <button
                                    onClick={async () => {
                                        if (!tempTeamName.trim()) return;
                                        setIsNamingTeam(true);
                                        await updateTeamName(currentLeagueId, tempTeamName.trim());
                                        setIsNamingTeam(false);
                                    }}
                                    disabled={isNamingTeam || !tempTeamName.trim()}
                                    className="w-full bg-neon text-black py-5 rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {isNamingTeam ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Começar a Escalar'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MyTeam;
