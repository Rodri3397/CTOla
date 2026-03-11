import React, { useState, useEffect } from 'react';
import { ChevronRight, Loader2, X, Plus, Minus, Trophy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/useStore';
import RoundSelector from '../../components/RoundSelector';

export default function Scouter() {
    const {
        teams, fetchTeams, athletes, fetchAthletes,
        saveStats, loading, rounds, activeRoundId, currentLeagueId
    } = useStore();
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [matchStats, setMatchStats] = useState({}); // athleteId -> stats

    useEffect(() => {
        if (currentLeagueId) {
            fetchTeams();
            fetchAthletes();
        } else {
            setSelectedTeam(null);
        }
    }, [fetchTeams, fetchAthletes, currentLeagueId]);

    const activeRound = rounds.find(r => r.id === activeRoundId);

    const handleSelectTeam = (team) => {
        setSelectedTeam(team);
        // Initialize stats for players of this team
        const teamAthletes = athletes.filter(a => a.team_id === team.id);
        const initial = {};
        teamAthletes.forEach(a => {
            initial[a.id] = { gols: 0, assistencias: 0, penaltisDefendidos: 0, equipeSofreuGol: false, participou: true };
        });
        setMatchStats(initial);
    };

    const updateStat = (athleteId, field, value) => {
        setMatchStats(prev => ({
            ...prev,
            [athleteId]: { ...prev[athleteId], [field]: Math.max(0, (prev[athleteId][field] || 0) + value) }
        }));
    };

    const toggleBoolean = (athleteId, field) => {
        setMatchStats(prev => ({
            ...prev,
            [athleteId]: { ...prev[athleteId], [field]: !prev[athleteId][field] }
        }));
    };

    const handleFinalize = async () => {
        if (!activeRoundId) {
            alert("Selecione uma rodada no topo primeiro!");
            return;
        }

        const promises = Object.entries(matchStats).map(([athleteId, stats]) => {
            return saveStats({ athlete_id: athleteId, ...stats });
        });
        await Promise.all(promises);
        setSelectedTeam(null);
        alert(`Dados salvos na Rodada ${activeRound?.number || ''} com sucesso!`);
    };

    const teamAthletes = athletes.filter(a => a.team_id === selectedTeam?.id);

    return (
        <div className="flex flex-col gap-8 animate-fade pb-24">
            <header className="px-1 text-center flex flex-col gap-4">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-black italic uppercase tracking-tighter">Lançar Rodada</h1>
                    <div className="h-1 w-12 bg-neon mx-auto mt-2 rounded-full shadow-[0_0_10px_#00f5ff]"></div>
                </div>

                <RoundSelector isAdmin />
            </header>

            {!selectedTeam ? (
                <div className="flex flex-col gap-3">
                    <div className="px-2 pb-2">
                        <span className="text-[8px] font-black uppercase text-gray-600 tracking-widest">
                            {activeRound ? `Selecionado: Rodada ${activeRound.number}` : "Selecione uma rodada no topo"}
                        </span>
                    </div>

                    {loading && teams.length === 0 ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-neon opacity-50" />
                        </div>
                    ) : (
                        teams.map((team, idx) => (
                            <motion.button
                                key={team.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => handleSelectTeam(team)}
                                className="glass p-6 rounded-[2rem] flex items-center justify-between group border-white/5 hover:border-neon/20 transition-all text-left"
                            >
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300 group-hover:text-white transition-colors">
                                    {team.name}
                                </span>
                                <ChevronRight size={18} className="text-gray-700 group-hover:text-neon group-hover:translate-x-1 transition-all" />
                            </motion.button>
                        ))
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between px-2">
                        <button onClick={() => setSelectedTeam(null)} className="text-[10px] font-black uppercase text-gray-500 hover:text-white">← Voltar</button>
                        <div className="flex flex-col items-end">
                            <h2 className="text-xs font-black uppercase text-neon tracking-widest leading-none">{selectedTeam.name}</h2>
                            <span className="text-[8px] font-bold text-gray-600 uppercase mt-1">Rodada {activeRound?.number}</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        {teamAthletes.map((a, idx) => (
                            <motion.div
                                key={a.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="glass p-6 rounded-[2rem] border-white/5 flex flex-col gap-4"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-widest">{a.name}</span>
                                        <span className="text-[8px] font-bold text-gray-600 uppercase pt-0.5">{a.pos}</span>
                                    </div>
                                    <button
                                        onClick={() => toggleBoolean(a.id, 'participou')}
                                        className={`px-3 py-1 rounded-full text-[8px] font-black uppercase transition-all ${matchStats[a.id]?.participou ? 'bg-neon text-black' : 'bg-white/5 text-gray-700'}`}
                                    >
                                        {matchStats[a.id]?.participou ? 'Em Campo' : 'Ausente'}
                                    </button>
                                </div>

                                {matchStats[a.id]?.participou && (
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                                            <span className="text-[8px] font-black uppercase text-gray-500">Gols</span>
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => updateStat(a.id, 'gols', -1)} className="text-gray-600 hover:text-white"><Minus size={14} /></button>
                                                <span className="text-xs font-black text-neon w-4 text-center">{matchStats[a.id]?.gols || 0}</span>
                                                <button onClick={() => updateStat(a.id, 'gols', 1)} className="text-gray-600 hover:text-neon"><Plus size={14} /></button>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                                            <span className="text-[8px] font-black uppercase text-gray-500">Asist.</span>
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => updateStat(a.id, 'assistencias', -1)} className="text-gray-600 hover:text-white"><Minus size={14} /></button>
                                                <span className="text-xs font-black text-neon w-4 text-center">{matchStats[a.id]?.assistencias || 0}</span>
                                                <button onClick={() => updateStat(a.id, 'assistencias', 1)} className="text-gray-600 hover:text-neon"><Plus size={14} /></button>
                                            </div>
                                        </div>

                                        {a.pos === 'GOLEIRO' && (
                                            <div className="col-span-2 flex items-center justify-between bg-[#00f5ff]/5 p-3 rounded-2xl border border-neon/10">
                                                <span className="text-[8px] font-black uppercase text-neon/50">Defesas Pênalti</span>
                                                <div className="flex items-center gap-3">
                                                    <button onClick={() => updateStat(a.id, 'penaltisDefendidos', -1)} className="text-neon/30 hover:text-white"><Minus size={14} /></button>
                                                    <span className="text-xs font-black text-neon w-4 text-center">{matchStats[a.id]?.penaltisDefendidos || 0}</span>
                                                    <button onClick={() => updateStat(a.id, 'penaltisDefendidos', 1)} className="text-neon/30 hover:text-white"><Plus size={14} /></button>
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => toggleBoolean(a.id, 'equipeSofreuGol')}
                                            className={`col-span-2 py-3 rounded-2xl text-[8px] font-black uppercase border transition-all ${!matchStats[a.id]?.equipeSofreuGol ? 'border-green-500/30 bg-green-500/10 text-green-500' : 'border-red-500/30 bg-red-500/10 text-red-500'}`}
                                        >
                                            {!matchStats[a.id]?.equipeSofreuGol ? 'Invicto (SG)' : 'Sofreu Gol'}
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>

                    <button
                        onClick={handleFinalize}
                        disabled={loading}
                        className="w-full bg-neon text-black py-5 rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <Check size={18} strokeWidth={3} />}
                        Finalizar Lançamento
                    </button>
                </div>
            )}
        </div>
    );
}
