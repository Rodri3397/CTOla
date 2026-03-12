import React, { useState, useEffect } from 'react';
import { Plus, UserPlus, Loader2, Trophy, Shield, Users, Trash2, Search, Info, LayoutDashboard, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/useStore';
import RoundSelector from '../../components/RoundSelector';

export default function AdminDashboard() {
    const {
        addTeam, addAthlete, deleteTeam, deleteAthlete,
        teams, fetchTeams, athletes, fetchAthletes, loading, error,
        createLeague, myLeagues, fetchMyLeagues, currentLeagueId, setCurrentLeague,
        updateRoundStatus, finishRound, startNextRound, activeRoundId, rounds, fetchRounds, supabase, user,
        fetchLeagueMembers, updateMemberRole, leagueMembers
    } = useStore();

    const activeRound = rounds.find(r => r.id === activeRoundId);

    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'teams', 'athletes'
    const [teamName, setTeamName] = useState('');
    const [athlete, setAthlete] = useState({ name: '', pos: 'ALA', price: '5.00', team_id: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [newLeagueName, setNewLeagueName] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [leagueAdminCode, setLeagueAdminCode] = useState('');
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [password, setPassword] = useState('');
    const [passError, setPassError] = useState(false);

    // Scouts State
    const [selectedAthleteId, setSelectedAthleteId] = useState('');
    const [scoutData, setScoutData] = useState({
        id: null,
        gols: 0,
        assistencias: 0,
        penaltisperdidos: 0,
        tiroslivresdefendidos: 0,
        penaltisdefendidos: 0,
        golssofridos: 0,
        melhorgoleiro: false,
        participou: true,
        equipesofreugol: false
    });
    const [scoutFeed, setScoutFeed] = useState([]);

    useEffect(() => {
        fetchMyLeagues();
        if (currentLeagueId) {
            fetchTeams();
            fetchAthletes();
            fetchRounds();
            fetchLeagueMembers(currentLeagueId);
        }
    }, [fetchMyLeagues, fetchTeams, fetchAthletes, fetchRounds, fetchLeagueMembers, currentLeagueId]);

    const handleCreateLeague = async () => {
        if (!newLeagueName || !leagueAdminCode) return;
        const { error } = await createLeague(newLeagueName, isPublic, leagueAdminCode.toUpperCase());
        if (!error) {
            setNewLeagueName('');
            setLeagueAdminCode('');
            setShowCreateLeague(false);
            setIsPublic(true);
            setIsAuthorized(true); // Auto-authorize for the newly created league
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
                penaltisperdidos: 0,
                tiroslivresdefendidos: 0,
                penaltisdefendidos: 0,
                golssofridos: 0,
                melhorgoleiro: false,
                participou: true,
                equipesofreugol: false
            });
            const { data } = await supabase
                .from('match_stats')
                .select('*, athletes(name, pos)')
                .eq('round_id', activeRoundId)
                .eq('league_id', currentLeagueId);
            setScoutFeed(data || []);
        } else {
            alert("Erro ao salvar scout: " + (error.message || JSON.stringify(error)));
        }
    };

    const handleEditScout = (scout) => {
        setSelectedAthleteId(scout.athlete_id);
        setScoutData({
            id: scout.id,
            gols: scout.gols,
            assistencias: scout.assistencias,
            penaltisperdidos: scout.penaltisperdidos,
            tiroslivresdefendidos: scout.tiroslivresdefendidos,
            penaltisdefendidos: scout.penaltisdefendidos,
            golssofridos: scout.golssofridos,
            melhorgoleiro: scout.melhorgoleiro,
            participou: scout.participou,
            equipesofreugol: scout.equipesofreugol
        });
        setActiveTab('scouts');
    };

    useEffect(() => {
        if (activeRoundId && currentLeagueId) {
            supabase
                .from('match_stats')
                .select('*, athletes(name, pos)')
                .eq('round_id', activeRoundId)
                .eq('league_id', currentLeagueId)
                .then(({ data }) => setScoutFeed(data || []));
        }
    }, [activeRoundId, currentLeagueId, supabase]);

    const handleDeleteTeam = async (id, name) => {
        if (window.confirm(`Tem certeza que deseja excluir o time "${name}" e todos os seus atletas?`)) {
            await deleteTeam(id);
        }
    };

    const handleDeleteAthlete = async (id, name) => {
        if (window.confirm(`Excluir atleta "${name}"?`)) {
            await deleteAthlete(id);
        }
    };

    const filteredAthletes = (athletes || []).filter(a =>
        a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.teams?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 0. CREATE MODAL (Must be at the very top to bypass all locks)
    if (showCreateLeague) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-sm glass-dark p-10 rounded-[3rem] border border-white/10 flex flex-col gap-8 shadow-2xl"
                >
                    <div className="text-center">
                        <h3 className="text-xl font-black italic uppercase text-white tracking-tighter">Nova Competição</h3>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-2">Personalize sua liga agora</p>
                    </div>

                    <div className="flex flex-col gap-5">
                        <div className="flex flex-col gap-2">
                            <span className="text-[7px] font-black uppercase text-gray-400 tracking-widest px-2">Nome da Liga</span>
                            <input
                                type="text"
                                value={newLeagueName}
                                onChange={(e) => setNewLeagueName(e.target.value)}
                                placeholder="EX: COPA DOS CAMPEÕES"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:border-neon transition-all"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <span className="text-[7px] font-black uppercase text-neon tracking-widest px-2 italic">Sua Senha Mestre de Admin</span>
                            <input
                                type="text"
                                value={leagueAdminCode}
                                onChange={(e) => setLeagueAdminCode(e.target.value.toUpperCase())}
                                placeholder="EX: BOSS2024"
                                className="w-full bg-neon/5 border border-neon/30 rounded-2xl px-6 py-4 text-xs font-black tracking-widest outline-none focus:border-neon transition-all placeholder:text-[8px] placeholder:font-bold placeholder:tracking-normal"
                            />
                            <p className="text-[6px] text-gray-600 font-bold uppercase tracking-widest px-2">Essa será a sua chave pessoal para acessar o painel de gestão desta liga.</p>
                        </div>

                        <div className="flex flex-col gap-2">
                            <span className="text-[7px] font-black uppercase text-gray-400 tracking-widest px-2">Privacidade</span>
                            <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5 gap-1">
                                <button
                                    onClick={() => setIsPublic(true)}
                                    className={`flex-1 py-3 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${isPublic ? 'bg-neon text-black' : 'text-gray-500'}`}
                                >
                                    Pública
                                </button>
                                <button
                                    onClick={() => setIsPublic(false)}
                                    className={`flex-1 py-3 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${!isPublic ? 'bg-red-500 text-white' : 'text-gray-500'}`}
                                >
                                    Privada
                                </button>
                            </div>
                            <p className="text-[7px] text-gray-600 font-bold uppercase tracking-[0.05em] px-2 italic mt-1 leading-tight">
                                {isPublic ? 'Ligas públicas aparecem na aba Explorar para todos.' : 'Ligas privadas só podem ser acessadas com o Código de Convite.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={() => setShowCreateLeague(false)}
                            className="flex-1 py-5 rounded-2xl text-[9px] font-black uppercase text-gray-500 tracking-widest"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleCreateLeague}
                            disabled={loading || !newLeagueName || !leagueAdminCode}
                            className="flex-[2] bg-neon text-black py-5 rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Criar Liga'}
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Definitive Loading State
    if (loading && myLeagues.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-fade">
                <Loader2 className="animate-spin text-neon mb-4" />
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest italic tracking-widest">Carregando Arena...</span>
            </div>
        );
    }

    if (!currentLeagueId && myLeagues.length === 0 && !showCreateLeague) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-fade">
                <div className="w-24 h-24 bg-neon/10 rounded-[3rem] flex items-center justify-center border border-neon/20 mb-8">
                    <Trophy className="text-neon" size={48} />
                </div>
                <h2 className="text-2xl font-black italic uppercase text-center text-white">Nenhuma Liga Encontrada</h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-4 text-center max-w-[200px]">
                    Você ainda não gerencia nenhuma liga. Vamos criar a sua primeira?
                </p>
                <button
                    onClick={() => setShowCreateLeague(true)}
                    className="mt-10 px-10 py-5 bg-neon text-black rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-105 active:scale-95 transition-all"
                >
                    Criar Minha Liga
                </button>
            </div>
        );
    }

    const currentLeague = myLeagues.find(l => l.id === currentLeagueId);


    if (!isAuthorized) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="w-full max-w-sm glass-dark p-10 rounded-[3rem] border border-white/10 flex flex-col items-center gap-8 shadow-2xl shadow-neon/10"
                >
                    <div className="w-20 h-20 bg-neon/10 rounded-[2.5rem] flex items-center justify-center border border-neon/20">
                        <Shield className="text-neon" size={32} />
                    </div>

                    <div className="text-center">
                        <h2 className="text-xl font-black italic uppercase text-white tracking-tighter">Área Restrita</h2>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-2 leading-relaxed px-4">
                            Insira o código de acesso para gerenciar esta liga
                        </p>
                    </div>

                    <div className="w-full flex flex-col gap-4">
                        <div className="relative">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value.toUpperCase());
                                    setPassError(false);
                                }}
                                placeholder="CÓDIGO DE ACESSO"
                                className={`w-full bg-white/5 border ${passError ? 'border-red-500/50' : 'border-white/10'} rounded-2xl px-6 py-5 text-center text-sm font-black tracking-[0.3em] outline-none focus:border-neon transition-all placeholder:tracking-normal placeholder:font-bold`}
                            />
                            {passError && (
                                <span className="absolute -bottom-6 left-0 w-full text-center text-[8px] font-black text-red-500 uppercase tracking-widest">
                                    Código Incorreto
                                </span>
                            )}
                        </div>
                        <button
                            onClick={async () => {
                                const enteredCode = password.trim();
                                if (!enteredCode) return;

                                try {
                                    // 1. Check if code matches an admin_code in league_members for this league
                                    const { data: memberWithCode, error: codeError } = await supabase
                                        .from('league_members')
                                        .select('id, user_id, role, admin_code')
                                        .eq('league_id', currentLeagueId)
                                        .eq('admin_code', enteredCode)
                                        .maybeSingle();

                                    const ADMIN_CODE = import.meta.env.VITE_ADMIN_CODE || 'CTOLA';
                                    const isMasterCode = enteredCode === ADMIN_CODE || enteredCode === currentLeague?.invite_code;

                                    if (memberWithCode || isMasterCode) {
                                        // If using master code, ensure current user is promoted to ADMIN if not already
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
                                                    .upsert({
                                                        league_id: currentLeagueId,
                                                        user_id: user.id,
                                                        role: 'ADMIN'
                                                    });
                                            }
                                        }
                                        setIsAuthorized(true);
                                    } else {
                                        setPassError(true);
                                        setPassword('');
                                    }
                                } catch (e) {
                                    console.error('Erro na autorização:', e);
                                    setPassError(true);
                                }
                            }}
                            className="bg-neon text-black py-5 rounded-2xl font-black text-xs uppercase shadow-xl shadow-neon/10"
                        >
                            Acessar
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (!currentLeagueId && myLeagues.length > 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-fade">
                <Loader2 className="animate-spin text-neon mb-4" />
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest italic italic">Selecionando Liga Principal...</span>
            </div>
        );
    }
    return (
        <div className="relative min-h-[80vh]">
            <div className={`flex flex-col gap-6 animate-fade pb-24 ${!isAuthorized ? 'blur-md pointer-events-none' : ''}`}>
                {error && (
                    <div className="mx-1 bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-[10px] font-black uppercase text-red-400 text-center">
                        Erro: {error}
                    </div>
                )}

                <header className="px-1 flex flex-col gap-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">
                                {myLeagues.find(l => l.id === currentLeagueId)?.name || 'Arena do Adm'}
                            </h2>
                            <span className="text-[8px] font-black uppercase text-neon tracking-[0.2em]">Gestão da Competição</span>
                        </div>
                        <button
                            onClick={() => setShowCreateLeague(!showCreateLeague)}
                            className="p-3 glass rounded-2xl text-gray-500 hover:text-neon border-white/5 transition-all"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    <div className="flex gap-2 p-1 bg-[#1a1d23] rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
                        {[
                            { id: 'overview', label: 'Geral', icon: LayoutDashboard },
                            { id: 'scouts', label: 'Pontuar', icon: Trophy },
                            { id: 'teams', label: `Times (${teams.length})`, icon: Shield },
                            { id: 'athletes', label: `Atletas (${athletes.length})`, icon: Users },
                            { id: 'members', label: 'Membros', icon: UserPlus }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-neon text-black neo-shadow' : 'text-gray-500 hover:text-white'}`}
                            >
                                <tab.icon size={12} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </header>

                <AnimatePresence mode="wait">
                    {showCreateLeague ? (
                        <motion.section
                            key="create"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="px-1"
                        >
                            <div className="glass p-8 rounded-[2.5rem] border border-neon/20 flex flex-col gap-6 bg-neon/5">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-neon">Nova Competição</h3>
                                <input
                                    type="text"
                                    value={newLeagueName}
                                    onChange={(e) => setNewLeagueName(e.target.value)}
                                    placeholder="Nome da Liga"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-sm font-bold outline-none focus:border-neon transition-all"
                                />
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowCreateLeague(false)}
                                        className="flex-1 py-5 rounded-2xl text-[9px] font-black uppercase text-gray-500 tracking-widest"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleCreateLeague}
                                        disabled={loading || !newLeagueName}
                                        className="flex-[2] bg-neon text-black py-5 rounded-2xl font-black text-xs uppercase shadow-xl"
                                    >
                                        Criar Liga
                                    </button>
                                </div>
                            </div>
                        </motion.section>
                    ) : activeTab === 'overview' ? (
                        <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-1 flex flex-col gap-6">
                            {/* Controle de Rodada Section */}
                            <div className="glass p-8 rounded-[2.5rem] border border-neon/20 bg-neon/5 flex flex-col gap-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-neon/10 flex items-center justify-center border border-neon/20">
                                        <Calendar className="text-neon" size={20} />
                                    </div>
                                    <div className="flex flex-col">
                                        <h3 className="text-xs font-black uppercase text-neon tracking-widest">Controle de Rodada</h3>
                                        <span className="text-[7px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-0.5">Gestão de Rodada e Mercado</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white/5 p-6 rounded-3xl border border-white/5 flex flex-col gap-4">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[8px] font-black uppercase text-gray-500 italic">Status do Mercado</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className={`w-2 h-2 rounded-full animate-pulse ${activeRound?.status === 'open' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}></div>
                                                <span className="text-lg font-black uppercase italic tracking-tighter text-white">
                                                    {activeRound?.status === 'open' ? 'Aberto' : activeRound?.status === 'locked' ? 'Fechado' : 'Encerrado'}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={async () => {
                                                if (!activeRoundId) return;
                                                const newStatus = activeRound?.status === 'open' ? 'locked' : 'open';
                                                const { error } = await updateRoundStatus(activeRoundId, newStatus);
                                                if (error) alert("Erro ao atualizar status: " + error);
                                            }}
                                            className={`w-full py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all ${activeRound?.status === 'open'
                                                ? 'bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white'
                                                : 'bg-green-500/10 text-green-500 border border-green-500/30 hover:bg-green-500 hover:text-white'
                                                }`}
                                        >
                                            {activeRound?.status === 'open' ? 'Fechar Mercado' : 'Abrir Mercado'}
                                        </button>
                                    </div>

                                    <div className="bg-white/5 p-6 rounded-3xl border border-white/5 flex flex-col gap-4">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[8px] font-black uppercase text-gray-500 italic">Rodada Atual</span>
                                            <span className="text-lg font-black uppercase italic tracking-tighter text-white mt-1">
                                                Rodada {activeRound?.number || 1}
                                            </span>
                                        </div>

                                        <button
                                            onClick={async () => {
                                                if (!activeRoundId) {
                                                    await startNextRound(currentLeagueId);
                                                    return;
                                                }
                                                if (window.confirm(`Deseja REALMENTE encerrar a Rodada ${activeRound.number} e iniciar a próxima?`)) {
                                                    const { error: fErr } = await finishRound(activeRoundId);
                                                    if (!fErr) await startNextRound(currentLeagueId);
                                                    else alert("Erro ao finalizar: " + fErr);
                                                }
                                            }}
                                            className="w-full py-4 bg-neon text-black rounded-2xl font-black text-[9px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
                                        >
                                            Finalizar e Próxima
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 p-1 bg-[#1a1d23] rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
                                    <div className="flex flex-col flex-1 gap-1 p-3">
                                        <span className="text-[7px] font-black uppercase text-gray-600 tracking-widest">Meu Código de Acesso</span>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="CRIAR CHAVE"
                                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] font-black text-neon outline-none focus:border-neon"
                                                onKeyDown={async (e) => {
                                                    if (e.key === 'Enter') {
                                                        const code = e.target.value.trim().toUpperCase();
                                                        if (!code) return;
                                                        const { error } = await supabase
                                                            .from('league_members')
                                                            .update({ admin_code: code })
                                                            .eq('league_id', currentLeagueId)
                                                            .eq('user_id', user.id);
                                                        if (!error) alert('Código atualizado!');
                                                        else alert('Erro: ' + error.message);
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col flex-1 gap-1 p-3">
                                        <span className="text-[7px] font-black uppercase text-gray-600 tracking-widest">Código de Convite</span>
                                        <span className="text-sm font-black text-neon tracking-[0.1em]">{myLeagues.find(l => l.id === currentLeagueId)?.invite_code || '---'}</span>
                                    </div>
                                </div>

                                <div className="glass p-6 rounded-[2.5rem] border border-white/5 flex flex-col gap-6">
                                    <div className="flex items-center gap-2">
                                        <Trophy size={14} className="text-neon" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Histórico de Rodadas</h3>
                                    </div>
                                    <RoundSelector isAdmin />
                                    <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest leading-loose">
                                        A rodada marcada em <span className="text-neon">ciano</span> é a rodada ativa. Novos scouts serão lançados nela.
                                    </p>
                                </div>
                            </motion.div>
                    ) : activeTab === 'scouts' ? (
                        <motion.div key="scouts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-1 flex flex-col gap-6">
                            <div className="glass p-8 rounded-[2.5rem] border border-neon/20 bg-neon/5 flex flex-col gap-6">
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-neon">Lançar Pontuação</h3>
                                    <p className="text-[7px] font-bold text-gray-500 uppercase tracking-widest mt-1">Selecione o atleta e preencha as estatísticas da rodada</p>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <select
                                        value={selectedAthleteId}
                                        onChange={(e) => setSelectedAthleteId(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-sm font-bold outline-none focus:border-neon transition-all text-white"
                                    >
                                        <option value="" className="bg-[#0f1115]">Selecione o Atleta</option>
                                        {athletes.sort((a, b) => a.name.localeCompare(b.name)).map(a => (
                                            <option key={a.id} value={a.id} className="bg-[#0f1115]">{a.name} ({a.teams?.name || 'Sem Time'})</option>
                                        ))}
                                    </select>

                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {[
                                            { key: 'gols', label: 'Gols' },
                                            { key: 'assistencias', label: 'Assist.' },
                                            { key: 'penaltisperdidos', label: 'Pên. Perdido' },
                                            { key: 'tiroslivresdefendidos', label: 'T.L. Defend.' },
                                            { key: 'penaltisdefendidos', label: 'Pên. Defend.' },
                                            { key: 'golssofridos', label: 'Gols Sofr.' },
                                        ].map(stat => (
                                            <div key={stat.key} className="flex flex-col gap-2">
                                                <label className="text-[8px] font-black uppercase text-gray-500 ml-2 tracking-widest">{stat.label}</label>
                                                <input
                                                    type="number"
                                                    value={scoutData[stat.key]}
                                                    onChange={(e) => setScoutData({ ...scoutData, [stat.key]: parseInt(e.target.value) || 0 })}
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-center text-xs font-black text-neon outline-none focus:border-neon"
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                                        {[
                                            { key: 'melhorgoleiro', label: 'Melhor Goleiro' },
                                            { key: 'participou', label: 'Participou?' },
                                            { key: 'equipesofreugol', label: 'Equipe Sofreu Gol?' },
                                        ].map(stat => (
                                            <button
                                                key={stat.key}
                                                onClick={() => setScoutData({ ...scoutData, [stat.key]: !scoutData[stat.key] })}
                                                className={`py-3 rounded-2xl text-[8px] font-black uppercase tracking-widest border transition-all ${scoutData[stat.key] ? 'bg-neon/10 border-neon text-neon' : 'bg-white/5 border-white/10 text-gray-500'}`}
                                            >
                                                {stat.label}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={handleSaveScout}
                                        disabled={!selectedAthleteId}
                                        className="w-full bg-neon text-black py-5 rounded-2xl font-black text-xs uppercase shadow-xl shadow-neon/10 mt-4 disabled:opacity-30 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
                                    >
                                        <Trophy size={18} /> Salvar Scout Atual
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <h3 className="text-[8px] font-black uppercase text-gray-600 tracking-[0.3em] ml-2 mb-2">Scores Registrados (Rodada {activeRound?.number})</h3>
                                <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto no-scrollbar pb-10">
                                    {scoutFeed.map((s) => (
                                        <div key={s.id} className="glass p-5 rounded-[2rem] border border-white/5 flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                                    <span className="text-[8px] font-black text-neon">{s.athletes?.pos}</span>
                                                </div>
                                                <div className="flex flex-col leading-tight">
                                                    <span className="text-xs font-bold text-white uppercase">{s.athletes?.name}</span>
                                                    <div className="flex gap-2 items-center mt-1">
                                                        {s.gols > 0 && <span className="text-[7px] font-black bg-neon/10 text-neon px-2 py-0.5 rounded-full uppercase">{s.gols} Gols</span>}
                                                        {s.assistencias > 0 && <span className="text-[7px] font-black bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full uppercase">{s.assistencias} Ast</span>}
                                                        {s.melhorGoleiro && <span className="text-[7px] font-black bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full uppercase">Melhor Gol.</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => handleEditScout(s)} className="p-3 bg-white/5 rounded-xl border border-white/5 text-gray-400 hover:text-neon transition-all">
                                                <Info size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    {scoutFeed.length === 0 && (
                                        <div className="py-20 text-center opacity-30 text-[10px] uppercase font-black tracking-widest">Nenhuma pontuação registrada</div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ) : activeTab === 'teams' ? (
                        <motion.div key="teams" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-1 flex flex-col gap-6">
                            <div className="glass p-6 rounded-[2.5rem] border border-white/5 flex flex-col gap-6">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Adicionar Novo Time</h3>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={teamName}
                                        onChange={(e) => setTeamName(e.target.value)}
                                        placeholder="Ex: Futsal Juniors"
                                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:border-neon transition-all"
                                    />
                                    <button onClick={handleAddTeam} className="w-14 h-14 bg-neon rounded-2xl flex items-center justify-center text-black shadow-lg">
                                        <Plus size={24} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <h3 className="text-[8px] font-black uppercase text-gray-600 tracking-[0.3em] ml-2 mb-2">Times Cadastrados</h3>
                                {teams.map((t) => (
                                    <div key={t.id} className="glass p-5 rounded-[2rem] border border-white/5 flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-gray-600">
                                                <Shield size={18} />
                                            </div>
                                            <span className="text-xs font-bold text-white uppercase">{t.name}</span>
                                        </div>
                                        <button onClick={() => handleDeleteTeam(t.id, t.name)} className="p-3 text-gray-700 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                {teams.length === 0 && (
                                    <div className="py-10 text-center opacity-30 text-[10px] uppercase font-black tracking-widest">Nenhum time cadastrado</div>
                                )}
                            </div>
                        </motion.div>
                    ) : activeTab === 'athletes' ? (
                        <motion.div key="athletes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-1 flex flex-col gap-6">
                            <div className="glass p-6 rounded-[2.5rem] border border-white/5 flex flex-col gap-6">
                                <div className="flex flex-col gap-1">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Gestão de Atletas</h3>
                                    <p className="text-[7px] font-bold text-gray-600 uppercase tracking-widest leading-none mt-1">Cadastre ou remova os craques do campeonato</p>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <input
                                        type="text"
                                        value={athlete.name}
                                        onChange={(e) => setAthlete({ ...athlete, name: e.target.value })}
                                        placeholder="Nome do Atleta"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:border-neon transition-all"
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <select
                                            value={athlete.pos}
                                            onChange={(e) => setAthlete({ ...athlete, pos: e.target.value })}
                                            className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-[10px] font-black uppercase text-white outline-none"
                                        >
                                            <option value="GOLEIRO" className="bg-[#0f1115]">Goleiro</option>
                                            <option value="FIXO" className="bg-[#0f1115]">Fixo</option>
                                            <option value="ALA" className="bg-[#0f1115]">Ala</option>
                                            <option value="PIVO" className="bg-[#0f1115]">Pivô</option>
                                        </select>
                                        <input
                                            type="text"
                                            value={athlete.price}
                                            onChange={(e) => setAthlete({ ...athlete, price: e.target.value })}
                                            placeholder="Preço"
                                            className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-[10px] font-black text-center text-neon"
                                        />
                                    </div>
                                    <select
                                        value={athlete.team_id}
                                        onChange={(e) => setAthlete({ ...athlete, team_id: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-[10px] font-black uppercase text-white outline-none"
                                    >
                                        <option value="" className="bg-[#0f1115]">Selecione o Time</option>
                                        {teams.map(t => <option key={t.id} value={t.id} className="bg-[#0f1115]">{t.name}</option>)}
                                    </select>
                                    <button onClick={handleAddAthlete} className="bg-white text-black py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-neon transition-all flex items-center justify-center gap-2 mt-2">
                                        <UserPlus size={16} /> Salvar Atleta
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between px-2 mb-2">
                                    <h3 className="text-[8px] font-black uppercase text-gray-600 tracking-[0.3em]">Lista de Atletas</h3>
                                    <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                                        <Search size={12} className="text-gray-600" />
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="BUSCAR..."
                                            className="bg-transparent border-none outline-none text-[8px] font-black uppercase text-white placeholder:text-gray-700 w-20"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto no-scrollbar pb-10">
                                    {filteredAthletes.map((a) => (
                                        <div key={a.id} className="glass p-5 rounded-[2rem] border border-white/5 flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center leading-none">
                                                    <span className="text-[8px] font-black text-neon">{a.pos}</span>
                                                </div>
                                                <div className="flex flex-col leading-tight">
                                                    <span className="text-xs font-bold text-white uppercase">{a.name}</span>
                                                    <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">{a.teams?.name}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-[10px] font-black text-neon italic">C$ {a.price}</span>
                                                <button onClick={() => handleDeleteAthlete(a.id, a.name)} className="p-2 text-gray-700 hover:text-red-500 transition-all">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="members" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-1 flex flex-col gap-6">
                            <div className="glass p-6 rounded-[2.5rem] border border-white/5 flex flex-col gap-2">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Membros da Liga</h3>
                                <p className="text-[7px] font-bold text-gray-600 uppercase tracking-widest leading-none mt-1">Gerencie quem pode administrar a liga com você</p>
                            </div>

                            <div className="flex flex-col gap-2">
                                {leagueMembers.map((member) => (
                                    <div key={member.id} className="glass p-5 rounded-[2rem] border border-white/5 flex items-center justify-between group bg-white/[0.02]">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 uppercase font-black text-neon text-[10px]">
                                                {member.profiles?.avatar_url ? (
                                                    <img src={member.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    member.profiles?.name?.substring(0, 2) || '??'
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-xs font-bold text-white uppercase">{member.profiles?.name || 'Sem nome'}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest ${
                                                        member.role === 'OWNER' ? 'bg-neon/20 text-neon' : 
                                                        member.role === 'ADMIN' ? 'bg-blue-500/20 text-blue-400' : 
                                                        'bg-gray-500/20 text-gray-500'
                                                    }`}>
                                                        {member.role === 'OWNER' ? 'Dono' : member.role === 'ADMIN' ? 'Admin' : 'Membro'}
                                                    </span>
                                                    {member.admin_code && member.role === 'ADMIN' && (
                                                        <span className="text-[6px] font-black text-gray-600 uppercase">Code: {member.admin_code}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {currentLeague?.owner_id === user.id && member.user_id !== user.id && (
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                {member.role === 'MEMBER' ? (
                                                    <button 
                                                        onClick={() => updateMemberRole(currentLeagueId, member.user_id, 'ADMIN')}
                                                        className="px-3 py-2 bg-blue-500/10 text-blue-400 rounded-xl text-[7px] font-black uppercase hover:bg-blue-500 hover:text-white transition-all border border-blue-500/20"
                                                    >
                                                        Tornar Admin
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => updateMemberRole(currentLeagueId, member.user_id, 'MEMBER')}
                                                        className="px-3 py-2 bg-red-500/10 text-red-500 rounded-xl text-[7px] font-black uppercase hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                                                    >
                                                        Remover Admin
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {leagueMembers.length === 0 && (
                                    <div className="py-20 text-center animate-pulse">
                                        <Loader2 className="animate-spin text-neon mx-auto mb-4" size={24} />
                                        <span className="text-[10px] uppercase font-black text-gray-600 tracking-[0.3em]">Buscando Membros...</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div >
    );
}
