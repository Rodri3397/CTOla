import React, { useState, useEffect } from 'react';
import { Plus, UserPlus, Loader2, Trophy, Shield, Users, Trash2, Search, Info, LayoutDashboard, Calendar, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { supabase } from '../../lib/supabase';
import RoundSelector from '../../components/RoundSelector';

export default function AdminDashboard() {
    const {
        addTeam, addAthlete, deleteTeam, deleteAthlete, updateAthlete, updateTeam,
        teams, fetchTeams, athletes, fetchAthletes, loading, error, notification, setNotification,
        createLeague, myLeagues, fetchMyLeagues, currentLeagueId, setCurrentLeague,
        updateRoundStatus, finishRound, startNextRound, activeRoundId, rounds, fetchRounds, user,
        fetchLeagueMembers, updateMemberRole, leagueMembers
    } = useStore();

    const activeRound = (rounds || []).find(r => r.id === activeRoundId);

    const [activeTab, setActiveTab] = useState('overview');
    const [teamName, setTeamName] = useState('');
    const [editingTeam, setEditingTeam] = useState(null);
    const [editingAthlete, setEditingAthlete] = useState(null);
    const [athlete, setAthlete] = useState({ name: '', pos: 'ALA', price: '5.00', team_id: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateLeague, setShowCreateLeague] = useState(false);
    const [newLeagueName, setNewLeagueName] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [leagueAdminCode, setLeagueAdminCode] = useState('');
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [password, setPassword] = useState('');
    const [passError, setPassError] = useState(false);

    const [selectedAthleteId, setSelectedAthleteId] = useState('');
    const [scoutData, setScoutData] = useState({
        id: null,
        gols: 0,
        assistencias: 0,
        finalizacoes_defendidas: 0,
        desarmes: 0,
        gols_goleiro_linha: 0,
        cartao_amarelo: 0,
        cartao_vermelho: 0,
        gol_contra: 0,
        faltas_cometidas: 0,
        gols_sofridos: 0,
        equipe_sofreu_gol: false,
        participou: true
    });
    const [scoutFeed, setScoutFeed] = useState([]);

    useEffect(() => {
        const checkAuthorization = async () => {
            if (!Array.isArray(myLeagues)) {
                await fetchMyLeagues();
                return;
            }

            if (!currentLeagueId || currentLeagueId === 'null') return;

            const leagueDetails = (myLeagues || []).find(l => l.id === currentLeagueId);
            const role = leagueDetails?.role || leagueDetails?.user_role;
            
            if (role === 'OWNER' || role === 'ADMIN') {
                setIsAuthorized(true);
            } else {
                setIsAuthorized(false);
                setPassword('');
                setPassError(false);
            }
            
            fetchTeams();
            fetchAthletes();
            fetchRounds();
            fetchLeagueMembers(currentLeagueId);
        };

        checkAuthorization();
    }, [currentLeagueId, myLeagues]);

    if (!user) return <div className="p-20 text-center font-bebas text-volt">AUTENTICANDO...</div>;
    
    if (!currentLeagueId || currentLeagueId === 'null') {
        return (
            <div className="min-h-screen bg-black pt-32 px-6 flex flex-col items-center gap-8">
                <div className="w-20 h-20 rounded-[2.5rem] bg-volt/10 border border-volt/20 flex items-center justify-center animate-pulse">
                    <Shield className="text-volt" size={32} />
                </div>
                <div className="text-center">
                    <h2 className="text-4xl font-bebas italic text-white tracking-tight">DIRETORIA BLOQUEADA</h2>
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.3em] mt-3">SELECIONE UMA ARENA NO SEU PERFIL</p>
                </div>
                <button 
                    onClick={() => window.location.href = '/perfil'}
                    className="mt-6 px-10 py-5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-volt hover:text-black transition-all"
                >
                    IR PARA MEU PERFIL
                </button>
            </div>
        );
    }

    const handleCreateLeague = async () => {
        if (!newLeagueName) return setNotification({ message: 'DÊ UM NOME À LIGA!', type: 'error' });
        if (!leagueAdminCode) return setNotification({ message: 'DEFINA UMA SENHA MESTRE!', type: 'error' });
        
        const { error, data } = await createLeague(newLeagueName, isPublic, leagueAdminCode.toUpperCase());
        
        if (error) {
            setNotification({ message: error, type: 'error' });
        } else if (data) {
            setNotification({ message: 'LIGA LANÇADA COM SUCESSO!', type: 'success' });
            setNewLeagueName('');
            setLeagueAdminCode('');
            setShowCreateLeague(false);
            setIsPublic(true);
            setIsAuthorized(true);
            // navigate to dashboard or refresh is handled by store setting currentLeagueId
        }
    };

    const handleAuthorize = async () => {
        const enteredCode = password.trim();
        if (!enteredCode) return;

        try {
            const { data: memberWithCode } = await supabase
                .from('league_members')
                .select('id, user_id, role, admin_code')
                .eq('league_id', currentLeagueId)
                .eq('admin_code', enteredCode)
                .maybeSingle();

            const ADMIN_CODE = import.meta.env.VITE_ADMIN_CODE || 'CTOLA';
            const currentLeague = (myLeagues || []).find(l => l.id === currentLeagueId);
            const isMasterCode = enteredCode === ADMIN_CODE || enteredCode === currentLeague?.invite_code;

            if (memberWithCode || isMasterCode) {
                if (user?.id && isMasterCode) {
                    const { data: currentMember } = await supabase
                        .from('league_members')
                        .select('role')
                        .eq('league_id', currentLeagueId)
                        .eq('user_id', user.id)
                        .maybeSingle();

                    if (!currentMember || (currentMember.role !== 'OWNER' && currentMember.role !== 'ADMIN')) {
                        await supabase
                            .from('league_members')
                            .upsert({ league_id: currentLeagueId, user_id: user.id, role: 'ADMIN' });
                    }
                }
                setIsAuthorized(true);
                setPassError(false);
            } else {
                setPassError(true);
                setPassword('');
            }
        } catch (e) {
            console.error('Erro na autorização:', e);
            setPassError(true);
        }
    };

    const handleAddTeam = async () => {
        if (!teamName || !currentLeagueId) return;
        await addTeam({ name: teamName });
        setTeamName('');
    };

    const handleAddAthlete = async () => {
        if (!athlete.name || !athlete.price || !athlete.team_id || !currentLeagueId) return;
        await addAthlete({
            name: athlete.name,
            pos: athlete.pos,
            price: parseFloat(athlete.price.replace(',', '.')),
            team_id: athlete.team_id
        });
        setAthlete({ name: '', pos: 'ALA', price: '5.00', team_id: '' });
    };

    const handleSaveScout = async () => {
        if (!selectedAthleteId || !activeRoundId || !currentLeagueId) return;
        const payload = { ...scoutData };
        if (!payload.id) delete payload.id;

        const { error } = await useStore.getState().saveStats({
            ...payload,
            athlete_id: selectedAthleteId,
            round_id: activeRoundId,
            league_id: currentLeagueId
        });

        if (!error) {
            setSelectedAthleteId('');
            setScoutData({
        id: null,
        gols: 0,
        assistencias: 0,
        finalizacoes_defendidas: 0,
        desarmes: 0,
        gols_goleiro_linha: 0,
        cartao_amarelo: 0,
        cartao_vermelho: 0,
        gol_contra: 0,
        faltas_cometidas: 0,
        gols_sofridos: 0,
        equipe_sofreu_gol: false,
        participou: true
            });
            const { data, error } = await supabase.from('match_stats').select('*')
                .eq('round_id', activeRoundId).eq('league_id', currentLeagueId);
            
            if (error) {
                console.error("Dashboard Scout Fetch Error:", error);
                return;
            }

            // JOIN CLIENT-SIDE: Enriquecer com dados dos atletas do store
            const { athletes } = useStore.getState();
            const enrichedScouts = (data || []).map(scout => {
                const athlete = (athletes || []).find(a => a.id === scout.athlete_id);
                return {
                    ...scout,
                    athletes: athlete ? { name: athlete.name, pos: athlete.pos } : null
                };
            });

            setScoutFeed(enrichedScouts);
        }
    };

    const handleEditScout = (scout) => {
        setSelectedAthleteId(scout.athlete_id);
        setScoutData({
            id: scout.id, 
            gols: scout.gols, 
            assistencias: scout.assistencias,
            finalizacoes_defendidas: scout.finalizacoes_defendidas, 
            desarmes: scout.desarmes,
            gols_goleiro_linha: scout.gols_goleiro_linha, 
            cartao_amarelo: scout.cartao_amarelo,
            cartao_vermelho: scout.cartao_vermelho, 
            gol_contra: scout.gol_contra, 
            faltas_cometidas: scout.faltas_cometidas,
            gols_sofridos: scout.gols_sofridos,
            equipe_sofreu_gol: scout.equipe_sofreu_gol,
            participou: scout.participou
        });
        setActiveTab('scouts');
    };

    const filteredAthletes = (athletes || []).filter(a =>
        a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.teams?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Render Logic
    if (loading && (myLeagues || []).length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-neon mb-4" />
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest italic">Carregando Arena...</span>
            </div>
        );
    }

    if (!currentLeagueId && (myLeagues || []).length === 0 && !showCreateLeague) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="w-24 h-24 bg-neon/10 rounded-[2.5rem] flex items-center justify-center border border-neon/20 shadow-2xl shadow-neon/10 animate-pulse mb-10">
                    <Trophy className="text-neon" size={42} />
                </div>
                <h2 className="text-3xl font-black italic uppercase text-white tracking-tighter">Prepare a Arena</h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em] mt-4 max-w-[200px] leading-loose">
                    Você ainda não fundou nenhuma liga. Comece agora!
                </p>
                <button 
                    onClick={() => setShowCreateLeague(true)} 
                    className="mt-12 px-12 py-6 bg-neon text-black rounded-3xl font-black uppercase text-xs shadow-[0_20px_40px_rgba(223,255,0,0.2)] hover:scale-105 active:scale-95 transition-all tracking-widest"
                >
                    Criar Minha Liga
                </button>
            </div>
        );
    }
    const currentLeague = (myLeagues || []).find(l => l.id === currentLeagueId);
    
    // Final Loading Guard
    if (loading && !currentLeague) return <div className="flex items-center justify-center h-screen bg-pure-black"><Loader2 className="animate-spin text-volt" /></div>;

    return (
        <div className="min-h-screen max-h-screen flex flex-col bg-pure-black text-white relative overflow-hidden">
            {/* Header / Tabs - Fixed */}
            <div className="shrink-0 p-6 flex flex-col gap-8 bg-black/60 backdrop-blur-3xl border-b border-white/5 z-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-[1.25rem] bg-volt flex items-center justify-center text-black">
                            <Settings size={20} />
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-xl font-bebas italic uppercase tracking-widest text-white leading-none">Gestão Arena</h1>
                            <span className="text-[8px] font-black text-volt uppercase mt-1 tracking-widest">{currentLeague?.name || 'SELECIONE UMA LIGA'}</span>
                        </div>
                    </div>

                    <button 
                        onClick={() => setShowCreateLeague(true)} 
                        className="p-3 glass rounded-2xl text-gray-500 hover:text-neon border-white/5 transition-all"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                {isAuthorized && (
                    <div className="flex p-1 bg-black rounded-[1.5rem] border border-white/5 gap-1 overflow-x-auto no-scrollbar">
                        {['overview', 'scouts', 'teams', 'athletes', 'members', 'guia'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 py-4 px-6 rounded-[1.25rem] text-[9px] font-black uppercase transition-all whitespace-nowrap ${activeTab === tab ? 'bg-volt text-black shadow-lg shadow-volt/20 translate-y-[-1px]' : 'text-gray-600 hover:text-gray-400'}`}
                            >
                                {tab === 'scouts' ? 'Scouter' : tab === 'teams' ? 'Clubs' : tab === 'athletes' ? 'Atletas' : tab === 'members' ? 'Membros' : tab === 'guia' ? 'Guia' : 'Overview'}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Notification Toast */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`fixed bottom-10 left-6 right-6 z-[200] p-6 rounded-[2.5rem] border shadow-[0_20px_50px_rgba(0,0,0,0.4)] backdrop-blur-2xl flex items-center justify-between ${
                            notification.type === 'success' ? 'bg-volt/10 border-volt/20 text-volt' : 'bg-red-500/10 border-red-500/20 text-red-500'
                        }`}
                    >
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{notification.message}</span>
                        <button onClick={() => setNotification(null)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all">✕</button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modals Layer */}
            <AnimatePresence>
                {editingTeam && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
                        <div className="w-full max-w-sm glass p-10 rounded-[3rem] border border-white/10 flex flex-col gap-8 shadow-2xl">
                            <div className="flex flex-col gap-2">
                                <h3 className="text-2xl font-bebas italic uppercase text-white tracking-widest">Editar Equipe</h3>
                                <div className="h-0.5 w-10 bg-volt rounded-full" />
                            </div>
                            <input
                                type="text"
                                value={editingTeam.name}
                                onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-[11px] font-bold text-white outline-none focus:border-volt/30 transition-all"
                            />
                            <div className="flex gap-4">
                                <button onClick={() => setEditingTeam(null)} className="flex-1 py-5 text-[10px] font-black uppercase text-gray-500 hover:text-white transition-all">Sair</button>
                                <button
                                    onClick={async () => {
                                        const { error } = await updateTeam(editingTeam.id, editingTeam.name);
                                        if (!error) {
                                            setEditingTeam(null);
                                            setNotification({ message: 'EQUIPE RENOMADA!', type: 'success' });
                                        }
                                    }}
                                    className="flex-[2] bg-volt text-black py-5 rounded-2xl font-black text-[11px] uppercase shadow-[0_10px_25px_rgba(223,255,0,0.3)] hover:scale-105 active:scale-95 transition-all"
                                >
                                    Atualizar
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {editingAthlete && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
                        <div className="w-full max-w-sm glass p-10 rounded-[3rem] border border-white/10 flex flex-col gap-8 shadow-2xl">
                            <div className="flex flex-col gap-2">
                                <h3 className="text-2xl font-bebas italic uppercase text-white tracking-widest">Painel do Atleta</h3>
                                <div className="h-0.5 w-10 bg-volt rounded-full" />
                            </div>
                            <div className="flex flex-col gap-5">
                                <div className="flex flex-col gap-2">
                                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest ml-2">Identificação</span>
                                    <input
                                        type="text"
                                        value={editingAthlete.name}
                                        onChange={(e) => setEditingAthlete({ ...editingAthlete, name: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-[11px] font-bold text-white outline-none focus:border-volt/30 transition-all"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest ml-2">Posição</span>
                                        <select
                                            value={editingAthlete.pos}
                                            onChange={(e) => setEditingAthlete({ ...editingAthlete, pos: e.target.value })}
                                            className="bg-white/5 border border-white/10 rounded-2xl px-5 py-5 text-[10px] font-black uppercase text-white outline-none focus:border-volt/30"
                                        >
                                            <option value="GOLEIRO">Goleiro</option><option value="FIXO">Fixo</option><option value="ALA">Ala</option><option value="PIVO">Pivô</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest ml-2">Passe (C$)</span>
                                        <input
                                            type="text"
                                            value={editingAthlete.price}
                                            onChange={(e) => setEditingAthlete({ ...editingAthlete, price: e.target.value })}
                                            className="bg-volt/5 border border-volt/20 rounded-2xl px-5 py-5 text-[11px] font-black text-center text-volt outline-none focus:border-volt transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setEditingAthlete(null)} className="flex-1 py-5 text-[10px] font-black uppercase text-gray-500 hover:text-white transition-all">Cancelar</button>
                                <button
                                    onClick={async () => {
                                        const { error } = await updateAthlete(editingAthlete.id, {
                                            name: editingAthlete.name,
                                            pos: editingAthlete.pos,
                                            price: parseFloat(String(editingAthlete.price).replace(',', '.'))
                                        });
                                        if (!error) {
                                            setEditingAthlete(null);
                                            setNotification({ message: 'CONTRATO ATUALIZADO!', type: 'success' });
                                        }
                                    }}
                                    className="flex-[2] bg-volt text-black py-5 rounded-2xl font-black text-[11px] uppercase shadow-[0_10px_25px_rgba(223,255,0,0.3)] hover:scale-105 active:scale-95 transition-all"
                                >
                                    Salvar
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Scrollable Main Region */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 pb-40 no-scrollbar">
                <AnimatePresence mode="wait">
                {showCreateLeague ? (
                    <motion.div
                        key="create"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl"
                    >
                        <div className="w-full max-w-sm glass p-10 rounded-[3rem] border border-white/10 flex flex-col gap-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                            <div className="text-center">
                                <h3 className="text-2xl font-bebas italic uppercase text-white tracking-tighter">Nova Arena</h3>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2 border-t border-white/5 pt-2">Expanda sua liga</p>
                            </div>
                            <div className="flex flex-col gap-5">
                                <input
                                    type="text"
                                    value={newLeagueName}
                                    onChange={(e) => setNewLeagueName(e.target.value)}
                                    placeholder="NOME DA LIGA"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-xs font-bold outline-none focus:border-volt/30 text-white placeholder:text-gray-700 transition-all"
                                />
                                <input
                                    type="text"
                                    value={leagueAdminCode}
                                    onChange={(e) => setLeagueAdminCode(e.target.value.toUpperCase())}
                                    placeholder="SENHA MESTRE"
                                    className="w-full bg-volt/5 border border-volt/20 rounded-2xl px-6 py-5 text-xs font-black tracking-[0.3em] outline-none focus:border-volt text-white transition-all shadow-inner"
                                />
                                <div className="flex p-1 bg-black rounded-2xl border border-white/5 gap-1">
                                    <button onClick={() => setIsPublic(true)} className={`flex-1 py-3.5 rounded-xl text-[9px] font-black uppercase transition-all ${isPublic ? 'bg-volt text-black shadow-lg' : 'text-gray-500'}`}>Pública</button>
                                    <button onClick={() => setIsPublic(false)} className={`flex-1 py-3.5 rounded-xl text-[9px] font-black uppercase transition-all ${!isPublic ? 'bg-red-500 text-white shadow-lg' : 'text-gray-500'}`}>Privada</button>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setShowCreateLeague(false)} className="flex-1 py-5 rounded-2xl text-[10px] font-black text-gray-600 uppercase hover:text-white transition-all">Sair</button>
                                <button 
                                    onClick={handleCreateLeague} 
                                    disabled={loading || !newLeagueName || !leagueAdminCode} 
                                    className="flex-[2] bg-volt text-black py-5 rounded-2xl font-black text-[11px] uppercase shadow-[0_10px_25px_rgba(223,255,0,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="animate-spin" size={16} />
                                            <span>PROCESSANDO...</span>
                                        </>
                                    ) : (
                                        'Lançar Liga'
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ) : !isAuthorized ? (
                    <motion.div
                        key="locked"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="px-1 py-20 flex flex-col items-center justify-center gap-10"
                    >
                        <div className="w-24 h-24 bg-volt/5 rounded-[2.5rem] border border-volt/10 flex items-center justify-center text-volt shadow-[0_0_50px_rgba(223,255,0,0.05)] rotate-12">
                            <Shield size={42} strokeWidth={1.5} />
                        </div>
                        <div className="text-center flex flex-col gap-2">
                            <h2 className="text-3xl font-bebas italic uppercase text-white tracking-widest leading-none">Acesso Restrito</h2>
                            <p className="text-[9px] font-black text-gray-700 uppercase tracking-[0.4em]">Propriedade do Organizador</p>
                        </div>
                        <div className="w-full max-w-sm flex flex-col gap-6 relative">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value.toUpperCase()); setPassError(false); }}
                                onKeyDown={(e) => e.key === 'Enter' && handleAuthorize()}
                                placeholder="••••••••"
                                className={`w-full bg-deep-charcoal border ${passError ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-white/5'} rounded-2xl px-6 py-6 text-center text-lg font-black tracking-[0.6em] outline-none focus:border-volt transition-all shadow-2xl`}
                            />
                            {passError && <span className="absolute -bottom-8 left-0 w-full text-center text-[9px] font-black text-red-500 uppercase tracking-widest animate-vibrate">Código Inválido</span>}
                            <button onClick={handleAuthorize} className="mt-4 w-full bg-volt text-black py-6 rounded-[2rem] font-black text-[11px] uppercase shadow-[0_15px_30px_rgba(223,255,0,0.2)] hover:scale-[1.03] active:scale-95 transition-all tracking-[0.1em]">Validar Credenciais</button>
                        </div>
                    </motion.div>
                ) : activeTab === 'overview' ? (
                    <motion.div key="overview" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="px-1 py-8 flex flex-col gap-8">
                        {/* Bento Grid Admin */}
                        <div className="grid grid-cols-2 gap-5">
                            <div className="col-span-2 glass p-8 rounded-[2.5rem] border-volt/20 bg-volt/5 flex flex-col gap-8 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-volt group-hover:scale-125 transition-transform">
                                    <Calendar size={120} />
                                </div>
                                <div className="flex items-center gap-3 relative z-10">
                                    <div className="w-8 h-8 rounded-xl bg-volt flex items-center justify-center text-black">
                                        <Calendar size={16} strokeWidth={3} />
                                    </div>
                                    <h3 className="text-[10px] font-black uppercase text-volt tracking-[0.3em]">Gestão de Rodada</h3>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10 pt-4">
                                    <div className="bg-black/60 backdrop-blur-xl p-8 rounded-[2rem] border border-white/5 flex flex-col gap-6 shadow-2xl">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black uppercase text-gray-500 italic tracking-[0.2em]">Mercado do App</span>
                                            <div className={`w-2.5 h-2.5 rounded-full shadow-lg ${activeRound?.status === 'open' ? 'bg-volt animate-pulse shadow-volt/20' : 'bg-red-500 shadow-red-500/20'}`} />
                                        </div>
                                        <span className="text-3xl font-bebas uppercase italic text-white tracking-[0.1em]">
                                            {!activeRound ? 'AGUARDANDO' : activeRound?.status === 'open' ? 'ABERTO' : 'FECHADO'}
                                        </span>
                                        <button 
                                            disabled={loading || !activeRound}
                                            onClick={() => updateRoundStatus(activeRoundId, activeRound?.status === 'open' ? 'locked' : 'open')} 
                                            className={`w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${!activeRound ? 'bg-white/5 text-gray-400 border border-white/5 opacity-50 cursor-not-allowed' : activeRound?.status === 'open' ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white' : 'bg-volt text-black shadow-lg shadow-volt/20 hover:scale-[1.02]'}`}
                                        >
                                            {!activeRound ? 'SEM RODADA ATIVA' : activeRound?.status === 'open' ? 'TRAVAR MERCADO' : 'ABRIR PARA ESCALACAO'}
                                        </button>
                                    </div>

                                    <div className="bg-black/60 backdrop-blur-xl p-8 rounded-[2rem] border border-white/5 flex flex-col gap-6 shadow-2xl">
                                        <span className="text-[10px] font-black uppercase text-gray-500 italic tracking-[0.2em]">Fase Atual</span>
                                        <span className="text-3xl font-bebas uppercase italic text-volt flex items-center gap-4 tracking-[0.1em]">
                                            RODADA <span className="text-white">{activeRound?.number || 1}</span>
                                            {loading && <Loader2 className="animate-spin text-volt" size={20} />}
                                        </span>
                                        <button 
                                            disabled={loading}
                                            onClick={async () => {
                                                if (!activeRoundId) { 
                                                    const res = await startNextRound(currentLeagueId); 
                                                    if (!res.error) setNotification({ message: 'PRIMEIRA RODADA INICIADA!', type: 'success' });
                                                    return; 
                                                }
                                                if (window.confirm(`Encerrar Rodada ${activeRound?.number}? Isso salvará os pontos finais e abrirá a próxima.`)) {
                                                    const { error } = await finishRound(activeRoundId);
                                                    if (!error) {
                                                        const nextRes = await startNextRound(currentLeagueId);
                                                        if (!nextRes.error) setNotification({ message: 'RODADA ENCERRADA E NOVA INICIADA!', type: 'success' });
                                                    }
                                                }
                                            }} 
                                            className="w-full py-5 bg-white/5 text-white border border-white/10 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all duration-300 disabled:opacity-50"
                                        >
                                            {loading ? 'PROCESSANDO...' : activeRoundId ? 'VIRAR PARA PROXIMA' : 'INICIAR COMPETIÇÃO'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bento-card flex flex-col gap-4 border-white/5 group">
                                <Users className="text-gray-700 group-hover:text-volt transition-colors" size={20} />
                                <div className="flex flex-col">
                                    <span className="text-3xl font-bebas text-white leading-none">{(athletes || []).length}</span>
                                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest mt-1">ATLETAS ATIVOS</span>
                                </div>
                            </div>

                            <div className="bento-card flex flex-col gap-4 border-white/5 group">
                                <Shield className="text-gray-700 group-hover:text-volt transition-colors" size={20} />
                                <div className="flex flex-col">
                                    <span className="text-3xl font-bebas text-white leading-none">{(teams || []).length}</span>
                                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest mt-1">CLUBES DA LIGA</span>
                                </div>
                            </div>
                        </div>

                        <div className="glass p-8 rounded-[2.5rem] border border-white/5 flex flex-col gap-8">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 border-b border-white/5 pb-4">Configurações Avançadas</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="flex flex-col gap-3 p-5 bg-black rounded-3xl border border-white/5 shadow-inner">
                                    <span className="text-[8px] font-black uppercase text-gray-600 tracking-widest">Código de Convite</span>
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg font-bebas text-volt tracking-widest italic">{currentLeague?.invite_code || '---'}</span>
                                        <button className="text-[8px] font-black text-gray-500 uppercase">Copiar</button>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3 p-4 bg-black rounded-3xl border border-white/5">
                                    <span className="text-[8px] font-black uppercase text-gray-600 tracking-widest">Sua Senha Mestre</span>
                                    <input 
                                        type="text" 
                                        placeholder="Nova Senha..."
                                        className="bg-transparent border-none outline-none text-xs font-black text-volt placeholder:text-gray-800 tracking-widest"
                                        onKeyDown={async (e) => {
                                            if (e.key === 'Enter') {
                                                const code = e.target.value.trim().toUpperCase();
                                                if (!code) return;
                                                const { error } = await supabase.from('league_members').update({ admin_code: code })
                                                    .eq('league_id', currentLeagueId).eq('user_id', user.id);
                                                if (!error) {
                                                    setNotification({ message: 'Senha Mestre Atualizada!', type: 'success' });
                                                    e.target.value = '';
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="px-1"><RoundSelector isAdmin /></div>
                    </motion.div>
                ) : activeTab === 'scouts' ? (
                    <motion.div key="scouts" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="px-1 py-8 flex flex-col gap-8">
                        <div className="glass p-8 rounded-[2.5rem] border border-volt/20 bg-volt/5 flex flex-col gap-8">
                            <div className="flex flex-col gap-2">
                                <h3 className="text-2xl font-bebas italic uppercase text-volt tracking-widest">Painel de Arbitragem</h3>
                                <p className="text-[9px] font-black text-gray-700 uppercase tracking-[0.4em]">Registro oficial de eventos</p>
                            </div>

                            <div className="flex flex-col gap-5">
                                <div className="flex flex-col gap-2">
                                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest ml-2">Atleta em Campo</span>
                                    <select 
                                        value={selectedAthleteId} 
                                        onChange={(e) => setSelectedAthleteId(e.target.value)} 
                                        className="w-full bg-black/50 border border-white/5 rounded-2xl px-6 py-5 text-sm font-bold text-white outline-none focus:border-volt/30 transition-all appearance-none"
                                    >
                                        <option value="">SELECIONE O CRAQUE</option>
                                        {(athletes || []).map(a => <option key={a.id} value={a.id} className="bg-black">{a.name.toUpperCase()} ({a.teams?.name?.toUpperCase()})</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 border-t border-white/5 pt-4">
                                    {[
                                        { key: 'gols', label: 'GOLS', icon: '⚽', color: 'text-volt' },
                                        { key: 'assistencias', label: 'ASSIST.', icon: '👟', color: 'text-volt' },
                                        { key: 'finalizacoes_defendidas', label: 'FIN. DEF', icon: '🎯', color: 'text-volt' },
                                        { key: 'desarmes', label: 'DESARMES', icon: '🛡️', color: 'text-volt' },
                                        { key: 'gols_goleiro_linha', label: 'GÓL. LINHA', icon: '🔥', color: 'text-volt' },
                                        { key: 'cartao_amarelo', label: 'C. AMARELO', icon: '🟨', color: 'text-red-500' },
                                        { key: 'cartao_vermelho', label: 'C. VERMELHO', icon: '🟥', color: 'text-red-500' },
                                        { key: 'gol_contra', label: 'G. CONTRA', icon: '🤦', color: 'text-red-500' },
                                        { key: 'faltas_cometidas', label: 'FALTAS', icon: '⚠️', color: 'text-red-500' },
                                    ].map(s => (
                                        <div key={s.key} className="flex flex-col gap-2 p-4 bg-black/40 rounded-2xl border border-white/5 hover:border-volt/20 transition-all group">
                                            <label className="text-[8px] font-black uppercase text-gray-600 tracking-widest flex items-center gap-2">
                                                <span>{s.icon}</span> {s.label}
                                            </label>
                                            <input 
                                                type="number" 
                                                value={scoutData[s.key] || 0} 
                                                onChange={(e) => setScoutData({ ...scoutData, [s.key]: parseInt(e.target.value) || 0 })} 
                                                className={`w-full bg-transparent border-none text-center text-2xl font-bebas outline-none ${s.color} transition-colors`} 
                                            />
                                        </div>
                                    ))}
                                    
                                    {/* Campos Específicos Goleiro / Equipe */}
                                    <div className="col-span-full grid grid-cols-2 gap-4 mt-2 border-t border-white/5 pt-4">
                                        <div className="flex flex-col gap-2 p-4 bg-red-500/5 rounded-2xl border border-red-500/10">
                                            <label className="text-[8px] font-black uppercase text-red-400 tracking-widest flex items-center gap-2">
                                                <span>🥅</span> GOLS SOFRIDOS (Goleiro)
                                            </label>
                                            <input 
                                                type="number" 
                                                value={scoutData.gols_sofridos || 0} 
                                                onChange={(e) => setScoutData({ ...scoutData, gols_sofridos: parseInt(e.target.value) || 0 })} 
                                                className="w-full bg-transparent border-none text-center text-2xl font-bebas outline-none text-red-500" 
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                                            <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest flex flex-col gap-1">
                                                <span>CLUBE SOFREU GOL?</span>
                                                <span className="text-[7px] text-gray-600">Perde bônus SG</span>
                                            </label>
                                            <button 
                                                onClick={() => setScoutData({ ...scoutData, equipe_sofreu_gol: !scoutData.equipe_sofreu_gol })}
                                                className={`w-14 h-8 rounded-full flex items-center p-1 transition-all ${scoutData.equipe_sofreu_gol ? 'bg-red-500 justify-end' : 'bg-white/10 justify-start'}`}
                                            >
                                                <div className="w-6 h-6 bg-white rounded-full shadow-md" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <button 
                                onClick={handleSaveScout} 
                                disabled={!selectedAthleteId || loading} 
                                className="w-full bg-volt text-black py-6 rounded-[2rem] font-black text-[11px] uppercase shadow-[0_15px_30px_rgba(223,255,0,0.2)] hover:scale-[1.02] active:scale-95 transition-all tracking-widest disabled:opacity-20 disabled:grayscale"
                            >
                                {loading ? 'PROCESSANDO...' : 'REGISTRAR SCOUT'}
                            </button>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between px-2">
                                <h4 className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Feed de Lançamentos</h4>
                                <span className="text-[8px] font-bold text-gray-800 uppercase">{(scoutFeed || []).length} EVENTOS</span>
                            </div>
                            {(scoutFeed || []).map(s => (
                                <motion.div 
                                    key={s.id} 
                                    initial={{ opacity: 0, x: -10 }} 
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-deep-charcoal/40 p-5 rounded-[2.5rem] border border-white/5 flex items-center justify-between group hover:bg-black/60 transition-all shadow-xl"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 rounded-2xl bg-black border border-white/5 flex items-center justify-center text-lg shadow-inner group-hover:scale-110 transition-transform">
                                            {s.gols > 0 ? '⚽' : s.assistencias > 0 ? '👟' : '🛡️'}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-white italic tracking-tighter uppercase leading-none">{s.athletes?.name}</span>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-[12px] font-black text-volt uppercase bg-volt/10 px-2 py-0.5 rounded flex items-center gap-1">
                                                    {s.points?.toFixed(1) || '0.0'} <span className="text-[8px] text-volt/70">PTS</span>
                                                </span>
                                                <div className="w-1 h-1 rounded-full bg-white/10" />
                                                <span className="text-[9px] font-black text-white uppercase tracking-widest pt-0.5">{s.gols}G | {s.assistencias}A</span>
                                                <div className="w-1 h-1 rounded-full bg-white/10" />
                                                <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">{s.athletes?.pos}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => handleEditScout(s)} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-600 hover:text-volt hover:bg-white/10 transition-all">
                                        <Info size={14} />
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                ) : activeTab === 'teams' ? (
                    <motion.div key="teams" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-1 py-8 flex flex-col gap-8">
                        <div className="glass p-6 rounded-[2.5rem] border border-white/5 flex gap-4 p-4 shadow-2xl">
                            <input 
                                type="text" 
                                value={teamName} 
                                onChange={(e) => setTeamName(e.target.value)} 
                                placeholder="NOME DA NOVA EQUIPE..." 
                                className="flex-1 bg-white/5 border border-white/10 rounded-[1.8rem] px-8 py-5 text-[11px] font-bold text-white outline-none focus:border-volt/30 transition-all" 
                            />
                            <button 
                                onClick={handleAddTeam} 
                                className="w-14 h-14 bg-volt rounded-[1.8rem] flex items-center justify-center text-black shadow-[0_10px_20px_rgba(223,255,0,0.3)] hover:scale-110 active:scale-90 transition-all"
                            >
                                <Plus size={24} strokeWidth={3} />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                            {(teams || []).map(t => (
                                <motion.div 
                                    key={t.id} 
                                    whileHover={{ x: 5 }}
                                    className="bg-deep-charcoal/40 p-6 rounded-[2.5rem] border border-white/5 flex items-center justify-between group hover:bg-black/60 transition-all shadow-xl"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 rounded-2xl bg-volt/5 border border-volt/20 flex items-center justify-center text-volt italic font-bebas text-lg">
                                            {t.name.substring(0, 1)}
                                        </div>
                                        <span className="text-sm font-black text-white italic tracking-tighter uppercase">{t.name}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setEditingTeam(t)} className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center text-gray-500 hover:text-volt hover:bg-volt/10 transition-all">
                                            <Info size={18} />
                                        </button>
                                        <button onClick={() => deleteTeam(t.id)} className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center text-gray-800 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                ) : activeTab === 'athletes' ? (
                    <motion.div key="athletes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-1 py-8 flex flex-col gap-8">
                        <div className="glass p-8 rounded-[3rem] border border-white/5 flex flex-col gap-6 shadow-2xl">
                            <div className="flex flex-col gap-3">
                                <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest ml-2">Novo Contrato</span>
                                <input 
                                    type="text" 
                                    value={athlete.name} 
                                    onChange={(e) => setAthlete({ ...athlete, name: e.target.value })} 
                                    placeholder="NOME DO ATLETA" 
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-[11px] font-bold text-white outline-none focus:border-volt/30 transition-all" 
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="flex flex-col gap-3">
                                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest ml-2">Posição</span>
                                    <select 
                                        value={athlete.pos} 
                                        onChange={(e) => setAthlete({ ...athlete, pos: e.target.value })} 
                                        className="bg-black/50 border border-white/10 rounded-2xl px-5 py-5 text-[10px] font-black uppercase text-white outline-none"
                                    >
                                        <option value="GOLEIRO">GOLEIRO</option><option value="FIXO">FIXO</option><option value="ALA">ALA</option><option value="PIVO">PIVÔ</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest ml-2">Preço (C$)</span>
                                    <input 
                                        type="text" 
                                        value={athlete.price} 
                                        onChange={(e) => setAthlete({ ...athlete, price: e.target.value })} 
                                        placeholder="10.0" 
                                        className="bg-volt/5 border border-volt/20 rounded-2xl px-5 py-5 text-[11px] font-black text-center text-volt outline-none" 
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-3">
                                <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest ml-2">Vínculo</span>
                                <select 
                                    value={athlete.team_id} 
                                    onChange={(e) => setAthlete({ ...athlete, team_id: e.target.value })} 
                                    className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-5 text-[10px] font-black uppercase text-white outline-none"
                                >
                                    <option value="">SELECIONE O CLUBE</option>
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>)}
                                </select>
                            </div>
                            <button 
                                onClick={handleAddAthlete} 
                                className="w-full bg-volt text-black py-6 rounded-[2rem] font-black text-[11px] uppercase shadow-[0_15px_30px_rgba(223,255,0,0.2)] hover:scale-[1.02] active:scale-95 transition-all tracking-widest"
                            >
                                EFETIVAR CONTRATAÇÃO
                            </button>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between px-2">
                                <h4 className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Atletas Registrados</h4>
                                <span className="text-[8px] font-bold text-gray-800 uppercase">{filteredAthletes.length} TOTAL</span>
                            </div>
                            {filteredAthletes.map(a => (
                                <motion.div 
                                    key={a.id} 
                                    whileHover={{ x: 5 }}
                                    className="bg-deep-charcoal/40 p-6 rounded-[2.5rem] border border-white/5 flex items-center justify-between group hover:bg-black/60 transition-all shadow-xl"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 rounded-2xl bg-black border border-white/5 flex items-center justify-center font-bebas italic text-volt shadow-inner">
                                            {a.pos.substring(0, 1)}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-white italic tracking-tighter uppercase leading-none">{a.name}</span>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-[8px] font-bold text-gray-700 uppercase tracking-[0.2em]">{a.teams?.name}</span>
                                                <div className="w-1 h-1 rounded-full bg-volt/30" />
                                                <span className="text-[8px] font-black text-volt uppercase">C$ {a.price?.toFixed(1)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setEditingAthlete(a)} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-600 hover:text-volt hover:bg-volt/10 transition-all">
                                            <Info size={14} />
                                        </button>
                                        <button onClick={() => deleteAthlete(a.id)} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-800 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                ) : activeTab === 'guia' ? (
                    <motion.div key="guide" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-1 py-8 flex flex-col gap-10">
                        <div className="flex flex-col gap-3">
                            <h3 className="text-3xl font-bebas italic uppercase text-white tracking-widest pl-2">Guia do Organizador</h3>
                            <div className="h-1 w-12 bg-volt rounded-full ml-2" />
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2 pl-2">Passo a passo para gerir sua liga</p>
                        </div>

                        <div className="flex flex-col gap-8">
                            {[
                                { step: '01', title: 'Configurar Clubes', desc: 'Cadastre os times que participarão da rodada real na aba "Clubs".' },
                                { step: '02', title: 'Convocar Atletas', desc: 'Adicione os jogadores de cada time na aba "Atletas". Eles ficarão disponíveis para compra no mercado.' },
                                { step: '03', title: 'Abrir Mercado', desc: 'Na "Overview", garanta que a rodada está como "Aberta". Os usuários poderão escalar seus times.' },
                                { step: '04', title: 'Fechar Mercado', desc: 'Antes dos jogos começarem, mude o status para "Fechada". Isso bloqueia novas escalações.' },
                                { step: '05', title: 'Lançar Scouts', desc: 'Na aba "Scouter", selecione o atleta e lance os gols, assistências e scouts. Os pontos são calculados em tempo real.' },
                                { step: '06', title: 'Virar Rodada', desc: 'Após todos os jogos, clique em "Finalizar Rodada". O sistema valoriza os atletas e prepara a próxima.' },
                            ].map((item, i) => (
                                <div key={i} className="flex gap-6 items-start group">
                                    <span className="text-2xl font-bebas italic text-white/20 group-hover:text-volt transition-colors pt-1">{item.step}</span>
                                    <div className="flex flex-col gap-2">
                                        <h4 className="text-xs font-black text-white uppercase tracking-wider">{item.title}</h4>
                                        <p className="text-xs text-gray-500 leading-relaxed font-medium">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-volt/5 border border-volt/10 p-8 rounded-[2.5rem] mt-4 flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="text-volt" size={20} />
                                <span className="text-[10px] font-black text-volt uppercase tracking-widest">Dica de Segurança</span>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Compartilhe o <strong>Código de Convite</strong> para os jogadores entrarem. Use a <strong>Senha de Gestão</strong> apenas com pessoas de confiança que te ajudarão a lançar os pontos.
                            </p>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div key="members" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="px-1 py-8 flex flex-col gap-6">
                        <div className="flex flex-col gap-2 mb-2">
                            <h3 className="text-2xl font-bebas italic uppercase text-white tracking-widest pl-2">Membros da Liga</h3>
                            <div className="h-0.5 w-10 bg-volt rounded-full ml-2" />
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            {leagueMembers.map(member => (
                                <motion.div 
                                    key={member.id} 
                                    className="bg-deep-charcoal/40 p-6 rounded-[3rem] border border-white/5 flex items-center justify-between group hover:bg-black/60 transition-all shadow-xl"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-black border border-white/5 flex items-center justify-center relative shadow-inner">
                                            <span className="text-xl font-bebas italic text-volt">{member.profiles?.name?.substring(0, 1).toUpperCase()}</span>
                                            {member.role === 'ADMIN' || member.role === 'OWNER' ? (
                                                <div className="absolute -top-2 -right-2 w-7 h-7 bg-volt rounded-xl flex items-center justify-center text-black border-2 border-black rotate-12 shadow-lg shadow-volt/20">
                                                    <Trophy size={12} strokeWidth={3} />
                                                </div>
                                            ) : null}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-base font-black text-white italic tracking-tighter uppercase leading-none">{member.profiles?.name}</span>
                                            <div className="flex items-center gap-2 mt-2">
                                                <div className={`w-1 h-1 rounded-full ${member.role === 'OWNER' ? 'bg-volt' : 'bg-gray-700'}`} />
                                                <span className="text-[9px] font-black text-gray-700 uppercase tracking-[0.3em] italic">{member.role === 'OWNER' ? 'FUNDADOR' : member.role}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {currentLeague?.owner_id === user.id && member.user_id !== user.id && (
                                        <button 
                                            onClick={() => updateMemberRole(currentLeagueId, member.user_id, member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN')} 
                                            className="px-6 py-4 bg-white/5 text-[9px] font-black uppercase text-gray-500 rounded-[1.25rem] hover:bg-volt hover:text-black transition-all border border-white/5 active:scale-95"
                                        >
                                            {member.role === 'ADMIN' ? 'REMOVER ADMIN' : 'PROMOVER'}
                                        </button>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            </div>
        </div>
    );
}
