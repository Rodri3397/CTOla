import React, { useState, useEffect } from 'react';
import { Plus, UserPlus, Loader2, Trophy, Shield, Users, Trash2, Search, Info, LayoutDashboard, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/useStore';
import RoundSelector from '../../components/RoundSelector';

export default function AdminDashboard() {
    const {
        addTeam, addAthlete, deleteTeam, deleteAthlete, updateAthlete, updateTeam,
        teams, fetchTeams, athletes, fetchAthletes, loading, error, notification, setNotification,
        createLeague, myLeagues, fetchMyLeagues, currentLeagueId, setCurrentLeague,
        updateRoundStatus, finishRound, startNextRound, activeRoundId, rounds, fetchRounds, supabase, user,
        fetchLeagueMembers, updateMemberRole, leagueMembers
    } = useStore();

    const activeRound = rounds.find(r => r.id === activeRoundId);

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
        setIsAuthorized(false); // Reset auth on league change
        setPassword('');
        setPassError(false);
        
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
        const { error, data } = await createLeague(newLeagueName, isPublic, leagueAdminCode.toUpperCase());
        if (!error && data) {
            setNewLeagueName('');
            setLeagueAdminCode('');
            setShowCreateLeague(false);
            setIsPublic(true);
            setCurrentLeague(data[0].id); // Select the new league immediately
            setIsAuthorized(true);
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
            const currentLeague = myLeagues.find(l => l.id === currentLeagueId);
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
                id: null, goals: 0, assistencias: 0, penaltisperdidos: 0, tiroslivresdefendidos: 0,
                penaltisdefendidos: 0, golssofridos: 0, melhorgoleiro: false, participou: true, equipesofreugol: false
            });
            const { data } = await supabase.from('match_stats').select('*, athletes(name, pos)')
                .eq('round_id', activeRoundId).eq('league_id', currentLeagueId);
            setScoutFeed(data || []);
        }
    };

    const handleEditScout = (scout) => {
        setSelectedAthleteId(scout.athlete_id);
        setScoutData({
            id: scout.id, goals: scout.gols, assistencias: scout.assistencias,
            penaltisperdidos: scout.penaltisperdidos, tiroslivresdefendidos: scout.tiroslivresdefendidos,
            penaltisdefendidos: scout.penaltisdefendidos, golssofridos: scout.golssofridos,
            melhorgoleiro: scout.melhorgoleiro, participou: scout.participou, equipesofreugol: scout.equipesofreugol
        });
        setActiveTab('scouts');
    };

    const filteredAthletes = (athletes || []).filter(a =>
        a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.teams?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Render Logic
    if (loading && myLeagues.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-neon mb-4" />
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest italic">Carregando Arena...</span>
            </div>
        );
    }

    if (!currentLeagueId && myLeagues.length === 0 && !showCreateLeague) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-6">
                <Trophy className="text-neon mb-8" size={64} />
                <h2 className="text-2xl font-black italic uppercase text-white text-center">Nenhuma Liga Encontrada</h2>
                <button onClick={() => setShowCreateLeague(true)} className="mt-10 px-10 py-5 bg-neon text-black rounded-2xl font-black uppercase shadow-xl hover:scale-105 active:scale-95 transition-all">Criar Minha Liga</button>
            </div>
        );
    }

    const currentLeague = myLeagues.find(l => l.id === currentLeagueId);

    return (
        <div className="relative min-h-[80vh]">
            {/* Header stays visible unless in global loading/empty state */}
            <header className="px-1 flex flex-col gap-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">
                            {currentLeague?.name || 'Arena do Adm'}
                        </h2>
                        <span className="text-[8px] font-black uppercase text-neon tracking-[0.2em]">Gestão da Competição</span>
                    </div>
                    <button
                        onClick={() => setShowCreateLeague(true)}
                        className="p-3 glass rounded-2xl text-gray-500 hover:text-neon border-white/5 transition-all"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                {isAuthorized && (
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
                )}
            </header>

            {/* Notification Toast */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`fixed bottom-10 left-6 right-6 z-[200] p-5 rounded-3xl border shadow-2xl backdrop-blur-xl flex items-center justify-between ${
                            notification.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'
                        }`}
                    >
                        <span className="text-[10px] font-black uppercase tracking-widest">{notification.message}</span>
                        <button onClick={() => setNotification(null)} className="p-2 hover:scale-110">✕</button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Team Modal */}
            <AnimatePresence>
                {editingTeam && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
                        <div className="w-full max-w-sm glass p-8 rounded-[2.5rem] border border-white/10 flex flex-col gap-6">
                            <h3 className="text-xl font-black italic uppercase text-white">Editar Time</h3>
                            <input
                                type="text"
                                value={editingTeam.name}
                                onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white"
                            />
                            <div className="flex gap-3">
                                <button onClick={() => setEditingTeam(null)} className="flex-1 py-4 text-[10px] font-black uppercase text-gray-500">Cancelar</button>
                                <button
                                    onClick={async () => {
                                        const { error } = await updateTeam(editingTeam.id, editingTeam.name);
                                        if (!error) {
                                            setEditingTeam(null);
                                            setNotification({ message: 'Time atualizado!', type: 'success' });
                                        }
                                    }}
                                    className="flex-[2] bg-neon text-black py-4 rounded-2xl font-black text-[10px] uppercase"
                                >
                                    Salvar Alterações
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Athlete Modal */}
            <AnimatePresence>
                {editingAthlete && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
                        <div className="w-full max-w-sm glass p-8 rounded-[2.5rem] border border-white/10 flex flex-col gap-6">
                            <h3 className="text-xl font-black italic uppercase text-white">Editar Atleta</h3>
                            <div className="flex flex-col gap-4">
                                <input
                                    type="text"
                                    value={editingAthlete.name}
                                    onChange={(e) => setEditingAthlete({ ...editingAthlete, name: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white"
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <select
                                        value={editingAthlete.pos}
                                        onChange={(e) => setEditingAthlete({ ...editingAthlete, pos: e.target.value })}
                                        className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-[10px] font-black uppercase text-white"
                                    >
                                        <option value="GOLEIRO">Goleiro</option><option value="FIXO">Fixo</option><option value="ALA">Ala</option><option value="PIVO">Pivô</option>
                                    </select>
                                    <input
                                        type="text"
                                        value={editingAthlete.price}
                                        onChange={(e) => setEditingAthlete({ ...editingAthlete, price: e.target.value })}
                                        className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-[10px] font-black text-center text-neon"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setEditingAthlete(null)} className="flex-1 py-4 text-[10px] font-black uppercase text-gray-500">Cancelar</button>
                                <button
                                    onClick={async () => {
                                        const { error } = await updateAthlete(editingAthlete.id, {
                                            name: editingAthlete.name,
                                            pos: editingAthlete.pos,
                                            price: parseFloat(String(editingAthlete.price).replace(',', '.'))
                                        });
                                        if (!error) {
                                            setEditingAthlete(null);
                                            setNotification({ message: 'Atleta atualizado!', type: 'success' });
                                        }
                                    }}
                                    className="flex-[2] bg-neon text-black py-4 rounded-2xl font-black text-[10px] uppercase"
                                >
                                    Salvar Alterações
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
                {showCreateLeague ? (
                    <motion.div
                        key="create"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl"
                    >
                        <div className="w-full max-w-sm glass-dark p-10 rounded-[3rem] border border-white/10 flex flex-col gap-8">
                            <div className="text-center">
                                <h3 className="text-xl font-black italic uppercase text-white tracking-tighter">Nova Competição</h3>
                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-2">Personalize sua liga agora</p>
                            </div>
                            <div className="flex flex-col gap-5">
                                <input
                                    type="text"
                                    value={newLeagueName}
                                    onChange={(e) => setNewLeagueName(e.target.value)}
                                    placeholder="NOME DA LIGA"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:border-neon text-white"
                                />
                                <input
                                    type="text"
                                    value={leagueAdminCode}
                                    onChange={(e) => setLeagueAdminCode(e.target.value.toUpperCase())}
                                    placeholder="SENHA MESTRE DE ADMIN"
                                    className="w-full bg-neon/5 border border-neon/30 rounded-2xl px-6 py-4 text-xs font-black tracking-widest outline-none focus:border-neon text-white"
                                />
                                <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5 gap-1">
                                    <button onClick={() => setIsPublic(true)} className={`flex-1 py-3 rounded-xl text-[8px] font-black uppercase transition-all ${isPublic ? 'bg-neon text-black' : 'text-gray-500'}`}>Pública</button>
                                    <button onClick={() => setIsPublic(false)} className={`flex-1 py-3 rounded-xl text-[8px] font-black uppercase transition-all ${!isPublic ? 'bg-red-500 text-white' : 'text-gray-500'}`}>Privada</button>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowCreateLeague(false)} className="flex-1 py-5 rounded-2xl text-[9px] font-black text-gray-500 uppercase">Cancelar</button>
                                <button onClick={handleCreateLeague} disabled={loading || !newLeagueName || !leagueAdminCode} className="flex-[2] bg-neon text-black py-5 rounded-2xl font-black text-xs uppercase shadow-xl">Criar Liga</button>
                            </div>
                        </div>
                    </motion.div>
                ) : !isAuthorized ? (
                    <motion.div
                        key="locked"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="px-1 py-20 flex flex-col items-center justify-center gap-8"
                    >
                        <Shield className="text-neon" size={48} />
                        <h2 className="text-xl font-black italic uppercase text-white tracking-tighter">Área Restrita</h2>
                        <div className="w-full max-w-sm flex flex-col gap-4 relative">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value.toUpperCase()); setPassError(false); }}
                                onKeyDown={(e) => e.key === 'Enter' && handleAuthorize()}
                                placeholder="CÓDIGO DE ACESSO"
                                className={`w-full bg-white/5 border ${passError ? 'border-red-500' : 'border-white/10'} rounded-2xl px-6 py-5 text-center text-xs font-black tracking-[0.3em] outline-none focus:border-neon transition-all`}
                            />
                            {passError && <span className="absolute -bottom-6 left-0 w-full text-center text-[8px] font-black text-red-500 uppercase">Acesso Negado</span>}
                            <button onClick={handleAuthorize} className="mt-4 w-full bg-neon text-black py-5 rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all">Acessar Painel</button>
                        </div>
                    </motion.div>
                ) : activeTab === 'overview' ? (
                    <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-1 py-6 flex flex-col gap-6">
                        <div className="glass p-8 rounded-[2.5rem] border border-neon/20 bg-neon/5 flex flex-col gap-6">
                            <div className="flex items-center gap-3">
                                <Calendar className="text-neon" size={20} />
                                <h3 className="text-xs font-black uppercase text-neon tracking-widest">Controle de Rodada</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white/5 p-6 rounded-3xl border border-white/5 flex flex-col gap-4">
                                    <span className="text-[8px] font-black uppercase text-gray-500 italic">Status do Mercado</span>
                                    <span className="text-lg font-black uppercase italic text-white">
                                        {activeRound?.status === 'open' ? (
                                            <span className="text-green-500">Aberto</span>
                                        ) : (
                                            <span className="text-red-500 text-opacity-50">Fechado</span>
                                        )}
                                    </span>
                                    <button 
                                        onClick={() => updateRoundStatus(activeRoundId, activeRound?.status === 'open' ? 'locked' : 'open')} 
                                        className={`w-full py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all ${activeRound?.status === 'open' ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-black'}`}
                                    >
                                        {activeRound?.status === 'open' ? 'Fechar Mercado' : 'Abrir Mercado'}
                                    </button>
                                </div>
                                <div className="bg-white/5 p-6 rounded-3xl border border-white/5 flex flex-col gap-4">
                                    <span className="text-[8px] font-black uppercase text-gray-500 italic">Rodada Atual</span>
                                    <span className="text-lg font-black uppercase italic text-white flex items-center gap-2">
                                        Rodada {activeRound?.number || 1}
                                        {loading && <Loader2 className="animate-spin text-neon" size={14} />}
                                    </span>
                                    <button onClick={async () => {
                                        if (!activeRoundId) { await startNextRound(currentLeagueId); return; }
                                        if (window.confirm('Encerrar rodada? Isso salvará os pontos finais.')) {
                                            const { error } = await finishRound(activeRoundId);
                                            if (!error) await startNextRound(currentLeagueId);
                                        }
                                    }} className="w-full py-4 bg-neon text-black rounded-2xl font-black text-[9px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all">Finalizar e Próxima</button>
                                </div>
                            </div>
                        </div>
                        <div className="glass p-6 rounded-[2.5rem] border border-white/5 flex flex-col gap-6">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Configurações da Liga</h3>
                            <div className="flex gap-4">
                                <div className="flex-1 flex flex-col gap-1 p-3 bg-white/5 rounded-xl">
                                    <span className="text-[7px] font-black uppercase text-gray-400">Invite Code</span>
                                    <span className="text-sm font-black text-neon tracking-widest">{currentLeague?.invite_code || '---'}</span>
                                </div>
                                <div className="flex-1 flex flex-col gap-1 p-3 bg-white/5 rounded-xl">
                                    <span className="text-[7px] font-black uppercase text-gray-400">Minha Senha</span>
                                    <input 
                                        type="text" 
                                        placeholder="Atualizar Senha"
                                        className="bg-transparent border-none outline-none text-[10px] font-black text-neon"
                                        onKeyDown={async (e) => {
                                            if (e.key === 'Enter') {
                                                const code = e.target.value.trim().toUpperCase();
                                                if (!code) return;
                                                const { error } = await supabase.from('league_members').update({ admin_code: code })
                                                    .eq('league_id', currentLeagueId).eq('user_id', user.id);
                                                if (!error) alert('Senha atualizada!');
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                        <RoundSelector isAdmin />
                    </motion.div>
                ) : activeTab === 'scouts' ? (
                    <motion.div key="scouts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-1 py-6 flex flex-col gap-6">
                        <div className="glass p-8 rounded-[2.5rem] border border-neon/20 bg-neon/5 flex flex-col gap-6">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-neon">Lançar Pontuação</h3>
                            <select value={selectedAthleteId} onChange={(e) => setSelectedAthleteId(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-sm font-bold text-white outline-none">
                                <option value="">Selecione o Atleta</option>
                                {athletes.map(a => <option key={a.id} value={a.id}>{a.name} ({a.teams?.name})</option>)}
                            </select>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {['gols', 'assistencias', 'penaltisperdidos', 'tiroslivresdefendidos', 'penaltisdefendidos', 'golssofridos'].map(s => (
                                    <div key={s} className="flex flex-col gap-2">
                                        <label className="text-[8px] font-black uppercase text-gray-500 ml-2">{s}</label>
                                        <input type="number" value={scoutData[s]} onChange={(e) => setScoutData({ ...scoutData, [s]: parseInt(e.target.value) || 0 })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-center text-xs font-black text-neon outline-none" />
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleSaveScout} disabled={!selectedAthleteId} className="w-full bg-neon text-black py-5 rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all">Salvar Scout</button>
                        </div>
                        <div className="flex flex-col gap-2">
                            {scoutFeed.map(s => (
                                <div key={s.id} className="glass p-5 rounded-[2rem] border border-white/5 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-white uppercase">{s.athletes?.name}</span>
                                        <span className="text-[7px] font-black text-neon uppercase italic">{s.gols} Gols | {s.assistencias} Ast</span>
                                    </div>
                                    <button onClick={() => handleEditScout(s)} className="p-3 bg-white/5 rounded-xl text-gray-400 hover:text-neon transition-all"><Info size={14} /></button>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                ) : activeTab === 'teams' ? (
                    <motion.div key="teams" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-1 py-6 flex flex-col gap-6">
                        <div className="glass p-6 rounded-[2.5rem] border border-white/5 flex gap-2">
                            <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Nome do Time" className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white outline-none" />
                            <button onClick={handleAddTeam} className="w-14 h-14 bg-neon rounded-2xl flex items-center justify-center text-black shadow-lg"><Plus size={24} strokeWidth={3} /></button>
                        </div>
                        {teams.map(t => (
                            <div key={t.id} className="glass p-5 rounded-[2rem] border border-white/5 flex items-center justify-between group">
                                <span className="text-xs font-bold text-white uppercase">{t.name}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setEditingTeam(t)} className="p-3 bg-white/5 rounded-xl text-gray-500 hover:text-neon transition-all"><Info size={16} /></button>
                                    <button onClick={() => deleteTeam(t.id)} className="p-3 text-gray-700 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                ) : activeTab === 'athletes' ? (
                    <motion.div key="athletes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-1 py-6 flex flex-col gap-6">
                        <div className="glass p-6 rounded-[2.5rem] border border-white/5 flex flex-col gap-4">
                            <input type="text" value={athlete.name} onChange={(e) => setAthlete({ ...athlete, name: e.target.value })} placeholder="Nome do Atleta" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white outline-none" />
                            <div className="grid grid-cols-2 gap-4">
                                <select value={athlete.pos} onChange={(e) => setAthlete({ ...athlete, pos: e.target.value })} className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-[10px] font-black uppercase text-white outline-none">
                                    <option value="GOLEIRO">Goleiro</option><option value="FIXO">Fixo</option><option value="ALA">Ala</option><option value="PIVO">Pivô</option>
                                </select>
                                <input type="text" value={athlete.price} onChange={(e) => setAthlete({ ...athlete, price: e.target.value })} placeholder="Preço" className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-[10px] font-black text-center text-neon" />
                            </div>
                            <select value={athlete.team_id} onChange={(e) => setAthlete({ ...athlete, team_id: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-[10px] font-black uppercase text-white outline-none">
                                <option value="">Selecione o Time</option>
                                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <button onClick={handleAddAthlete} className="bg-neon text-black py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl">Salvar Atleta</button>
                        </div>
                        <div className="flex flex-col gap-2">
                            {filteredAthletes.map(a => (
                                <div key={a.id} className="glass p-5 rounded-[2rem] border border-white/5 flex items-center justify-between group">
                                    <div className="flex flex-col font-bold">
                                        <span className="text-xs text-white uppercase">{a.name}</span>
                                        <span className="text-[8px] text-gray-600 uppercase tracking-widest">{a.teams?.name} | {a.pos}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setEditingAthlete(a)} className="p-3 bg-white/5 rounded-xl text-gray-500 hover:text-neon transition-all"><Info size={14} /></button>
                                        <button onClick={() => deleteAthlete(a.id)} className="p-2 text-gray-700 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div key="members" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-1 py-6 flex flex-col gap-4">
                        {leagueMembers.map(member => (
                            <div key={member.id} className="glass p-5 rounded-[2rem] border border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center uppercase font-black text-neon text-[10px]">
                                        {member.profiles?.name?.substring(0, 2) || '??'}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-white uppercase">{member.profiles?.name}</span>
                                        <span className="text-[7px] font-black text-gray-600 uppercase">{member.role}</span>
                                    </div>
                                </div>
                                {currentLeague?.owner_id === user.id && member.user_id !== user.id && (
                                    <button onClick={() => updateMemberRole(currentLeagueId, member.user_id, member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN')} className="px-3 py-2 bg-white/5 text-gray-500 rounded-xl text-[7px] font-black uppercase hover:text-neon transition-all">
                                        {member.role === 'ADMIN' ? 'Remover Admin' : 'Tornar Admin'}
                                    </button>
                                )}
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
