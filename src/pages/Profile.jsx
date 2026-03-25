import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User,
    Settings,
    History,
    ShieldCheck,
    Award,
    LogOut,
    ChevronRight,
    Shield,
    Lock,
    Wallet,
    Trophy,
    Zap,
    Search,
    X,
    Plus,
    CreditCard,
    TrendingUp
} from 'lucide-react';

const ProfileAction = ({ icon: Icon, title, onClick, color = "text-gray-500", restricted = false }) => (
    <motion.button
        whileHover={{ scale: 1.02, x: 8 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="w-full bento-card p-5 flex items-center justify-between group group-hover:border-volt/30 transition-all border-white/5"
    >
        <div className="flex items-center gap-5">
            <div className={`p-4 rounded-2xl bg-black border border-white/5 transition-transform duration-500 group-hover:rotate-[15deg] group-hover:scale-110 ${color}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="flex flex-col items-start text-left">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90">{title}</span>
                {restricted ? (
                    <div className="flex items-center gap-1.5 mt-1">
                        <Lock className="w-2.5 h-2.5 text-electric-crimson" />
                        <span className="text-[7px] text-electric-crimson font-black uppercase tracking-widest">Restrito à Diretoria</span>
                    </div>
                ) : (
                    <span className="text-[7px] text-gray-600 font-bold uppercase tracking-widest leading-none mt-1.5">Acessar Painel</span>
                )}
            </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-volt group-hover:text-black transition-all">
            <ChevronRight className="w-4 h-4" />
        </div>
    </motion.button>
);

const Profile = () => {
    const {
        user, profile, signOut, myFollowedLeaguesDetails,
        fetchMyLeagues, currentLeagueId, updateProfile, supabase,
        setNotification, loading
    } = useStore();
    const navigate = useNavigate();
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const avatars = [
        'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=Mimi',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=Buddy',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=Pepper',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=Bear',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=Scooter',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=Boots',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=Salem'
    ];

    const [adminAuth, setAdminAuth] = useState({ isOpen: false, leagueId: null, code: '' });
    const [isCreatingLeague, setIsCreatingLeague] = useState(false);
    const [newLeagueName, setNewLeagueName] = useState('');
    const [newLeaguePassword, setNewLeaguePassword] = useState('');

    useEffect(() => {
        fetchMyLeagues();
    }, [fetchMyLeagues]);

    const isGlobalAdmin = profile?.role === 'ADMIN';
    const hasLeagueManagement = (myFollowedLeaguesDetails || []).some(l => l.role === 'OWNER' || l.role === 'ADMIN');
    const canManage = isGlobalAdmin || hasLeagueManagement;

    const name = profile?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
    const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??';

    const handleSignOut = async () => {
        await signOut();
        navigate('/auth');
    };

    const handleUpdateAvatar = async (url) => {
        await updateProfile({ avatar_url: url });
        setIsAvatarModalOpen(false);
    };

    const handleOpenAdmin = (leagueId) => {
        const league = (myFollowedLeaguesDetails || []).find(l => l.id === leagueId);
        if (league?.role === 'OWNER') {
            useStore.getState().setCurrentLeague(leagueId);
            navigate('/admin/dashboard');
            return;
        }
        setAdminAuth({ isOpen: true, leagueId, code: '' });
    };

    const handleAdminSubmit = async () => {
        try {
            const { data: memberData } = await supabase
                .from('league_members')
                .select('admin_code')
                .eq('league_id', adminAuth.leagueId)
                .eq('user_id', user.id)
                .maybeSingle();

            const league = (myFollowedLeaguesDetails || []).find(l => l.id === adminAuth.leagueId);
            const MASTER_CODE = 'CTOLA'; // Global override
            
            const isAuthorized = (memberData?.admin_code && memberData.admin_code === adminAuth.code) || 
                               adminAuth.code === MASTER_CODE || 
                               adminAuth.code === league?.invite_code ||
                               adminAuth.code === league?.management_password;

            if (isAuthorized) {
                useStore.getState().setCurrentLeague(adminAuth.leagueId);
                setAdminAuth({ isOpen: false, leagueId: null, code: '' });
                navigate('/admin/dashboard');
            } else {
                alert('Código ou Senha de gestão incorretos!');
            }
        } catch (err) {
            console.error('Admin Auth Error:', err);
            alert('Erro ao validar acesso.');
        }
    };

    const handleCreateLeague = async () => {
        if (!newLeagueName) return;
        const { error, data } = await useStore.getState().createLeague(newLeagueName, true, newLeaguePassword);
        
        if (error) {
            setNotification({ message: error, type: 'error' });
        } else if (data) {
            setNotification({ message: 'ARENA FUNDADA COM SUCESSO!', type: 'success' });
            setIsCreatingLeague(false);
            setNewLeagueName('');
            setNewLeaguePassword('');
            fetchMyLeagues();
            // Redirecionar para o Dashboard da nova liga
            navigate('/admin/dashboard');
        }
    };

    return (
        <div className="flex flex-col gap-10 animate-fade-in pb-32">
            <header className="flex justify-between items-end px-1">
                <h1 className="text-4xl font-bebas italic text-white tracking-tighter leading-none">HUB DE <span className="text-volt">LIGAS</span></h1>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setIsCreatingLeague(true)}
                    className="p-4 bento-card text-volt bg-volt/10 border-volt/20 flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase tracking-widest px-2">Nova Liga</span>
                </motion.button>
            </header>

            <div className="flex items-center gap-6 bento-card p-6 bg-white/5 border-white/5">
                 <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setIsAvatarModalOpen(true)}
                    className="w-20 h-20 rounded-3xl bg-black border-2 border-white/5 flex items-center justify-center relative overflow-hidden group"
                >
                    {profile?.avatar_url ? (
                        <img src={profile.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                        <span className="font-bebas text-volt text-2xl">{initials}</span>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                        <Plus className="text-volt" size={16} />
                    </div>
                </motion.button>
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-bebas italic text-white tracking-tight uppercase leading-none">{profile?.name || 'Usuário'}</h2>
                    <span className="text-[8px] text-gray-600 font-bold uppercase tracking-[0.3em]">Comandante de Ligas</span>
                </div>
                <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsSettingsOpen(true)}
                    className="ml-auto p-4 text-gray-600 hover:text-white"
                >
                    <Settings size={20} />
                </motion.button>
            </div>

            {/* My Leagues List */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-[10px] font-black uppercase text-gray-500 tracking-[0.3em]">Minhas Participações</h3>
                    <div className="h-px flex-1 bg-white/5 ml-4" />
                </div>

                <div className="flex flex-col gap-4">
                    {(myFollowedLeaguesDetails || []).map((league) => (
                        <div key={league.id} className="bento-card p-6 flex flex-col gap-6 bg-[#0a0a0a] border-white/5 hover:border-white/10 transition-all">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-black border border-white/5 flex items-center justify-center">
                                        <Shield className="text-volt opacity-50" size={20} />
                                    </div>
                                    <div className="flex flex-col">
                                        <h4 className="text-lg font-bebas italic text-white tracking-tight leading-none uppercase">{league.name}</h4>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className="text-[7px] font-black text-gray-600 uppercase tracking-widest">ID: {league.invite_code || '---'}</span>
                                            <div className="w-1 h-1 rounded-full bg-gray-600" />
                                            <span className="text-[7px] font-black text-volt uppercase tracking-widest">{league.role}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                     <button
                                        onClick={() => {
                                            useStore.getState().setCurrentLeague(league.id);
                                            navigate(`/league/${league.id}`);
                                        }}
                                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-gray-400 hover:text-white"
                                    >
                                        <Search size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        useStore.getState().setCurrentLeague(league.id);
                                        navigate(`/league/${league.id}`);
                                    }}
                                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all text-white border border-white/5"
                                >
                                    Abrir Arena
                                </button>
                                {(league.role === 'OWNER' || league.role === 'ADMIN') && (
                                    <button
                                        onClick={() => handleOpenAdmin(league.id)}
                                        className="flex-1 py-4 bg-volt text-black rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-2xl shadow-volt/20"
                                    >
                                        Gestão da Liga
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {(myFollowedLeaguesDetails || []).length === 0 && (
                        <div className="py-16 flex flex-col items-center justify-center text-center gap-4 opacity-20">
                            <Search size={48} />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Nenhuma liga encontrada.<br/>Comece agora mesmo!</p>
                        </div>
                    )}
                </div>
            </div>

            <button
                onClick={handleSignOut}
                className="w-full mt-10 py-8 text-[11px] font-bebas italic uppercase text-gray-700 hover:text-white transition-all tracking-[0.4em] flex items-center justify-center gap-4"
            >
                <div className="w-8 h-px bg-white/5" />
                ENCERRAR SESSÃO
                <div className="w-8 h-px bg-white/5" />
            </button>

            {/* Admin Password Modal */}
            <AnimatePresence>
                {adminAuth.isOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-sm glass-premium rounded-[4rem] border border-white/10 p-10 flex flex-col gap-8 shadow-2xl"
                        >
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-[2rem] bg-volt/10 border border-volt/20 flex items-center justify-center mx-auto mb-6">
                                    <Lock className="text-volt" size={24} />
                                </div>
                                <h2 className="text-3xl font-bebas text-white italic tracking-tight uppercase">Diretoria</h2>
                                <p className="text-[9px] text-gray-600 font-bold uppercase tracking-[0.3em] mt-2">Código ou Senha de Gestão</p>
                            </div>
                            
                            <div className="flex flex-col gap-4">
                                <input
                                    type="password"
                                    value={adminAuth.code}
                                    onChange={(e) => setAdminAuth({ ...adminAuth, code: e.target.value.toUpperCase() })}
                                    placeholder="DIGITE O ACESSO"
                                    className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-xl font-bebas tracking-[0.5em] text-center text-volt outline-none focus:border-volt/40 transition-all placeholder:tracking-widest"
                                />
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setAdminAuth({ isOpen: false, leagueId: null, code: '' })}
                                        className="flex-1 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        onClick={handleAdminSubmit}
                                        className="flex-[2] py-5 bg-volt text-black rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-volt/20"
                                    >
                                        ENTRAR
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Create League Modal */}
            <AnimatePresence>
                {isCreatingLeague && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-sm glass-premium rounded-[4rem] border border-white/10 p-10 flex flex-col gap-8 shadow-2xl"
                        >
                            <div className="text-center">
                                <h2 className="text-3xl font-bebas text-white italic tracking-tight">NOVA ARENA</h2>
                                <p className="text-[9px] text-gray-600 font-bold uppercase tracking-[0.3em] mt-2">FUNDAR NOVA LIGA</p>
                            </div>
                            
                            <div className="flex flex-col gap-4">
                                <input
                                    type="text"
                                    value={newLeagueName}
                                    onChange={(e) => setNewLeagueName(e.target.value.toUpperCase())}
                                    placeholder="NOME DA LIGA"
                                    className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm font-black tracking-widest text-center text-white outline-none focus:border-volt/40 transition-all uppercase"
                                />
                                <input
                                    type="password"
                                    value={newLeaguePassword}
                                    onChange={(e) => setNewLeaguePassword(e.target.value.toUpperCase())}
                                    placeholder="SENHA DE GESTÃO (OPCIONAL)"
                                    className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm font-black tracking-widest text-center text-white outline-none focus:border-volt/40 transition-all uppercase placeholder:tracking-widest"
                                />
                                <button 
                                    onClick={handleCreateLeague}
                                    disabled={!newLeagueName || loading}
                                    className={`w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 ${newLeagueName ? 'bg-volt text-black shadow-volt/20' : 'bg-gray-800 text-gray-500'}`}
                                >
                                    {loading ? (
                                        <div className="flex items-center gap-2">
                                            <Zap className="w-4 h-4 animate-pulse" />
                                            <span>PROCESSANDO...</span>
                                        </div>
                                    ) : (
                                        'FUNDAR AGORA'
                                    )}
                                </button>
                                <button 
                                    onClick={() => setIsCreatingLeague(false)}
                                    className="w-full py-4 text-[9px] font-black uppercase tracking-[0.2em] text-gray-600"
                                >
                                    Voltar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Drawers and Modals */}
            <AnimatePresence>
                {isSettingsOpen && (
                    <div className="fixed inset-0 z-[150] flex items-end justify-center px-4 mb-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSettingsOpen(false)}
                            className="absolute inset-0 bg-black/90 backdrop-blur-3xl"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            className="w-full max-w-md glass-premium rounded-[3.5rem] border border-white/10 p-10 flex flex-col gap-10 relative z-10 bg-pure-black/80 max-h-[85vh] overflow-hidden"
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-3xl font-bebas text-white italic leading-none">AJUSTES</h2>
                                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-2">CONFIGURAÇÕES DE CONTA</p>
                                </div>
                                <button onClick={() => setIsSettingsOpen(false)} className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                                    <X size={20} className="text-gray-500" />
                                </button>
                            </div>

                            <div className="pt-6 border-t border-white/5 flex flex-col gap-2">
                                <button className="w-full py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 hover:text-white transition-all">Editar Perfil</button>
                                <button className="w-full py-5 text-[10px] font-black uppercase tracking-[0.2em] text-electric-crimson/60" onClick={handleSignOut}>Sair da Conta</button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {isAvatarModalOpen && (
                    <div className="fixed inset-0 z-[160] flex items-center justify-center p-8 bg-black/95 backdrop-blur-3xl">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-sm glass-premium rounded-[4rem] border border-white/10 p-12 flex flex-col gap-8"
                        >
                            <div className="text-center">
                                <h2 className="text-3xl font-bebas text-white italic tracking-tight">IDENTIDADE VISUAL</h2>
                                <p className="text-[9px] text-gray-600 font-bold uppercase tracking-[0.3em] mt-2">ESCOLHA SEU AVATAR</p>
                            </div>
                            <div className="grid grid-cols-4 gap-4 max-h-[45vh] overflow-y-auto no-scrollbar py-2">
                                {avatars.map((url, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleUpdateAvatar(url)}
                                        className={`aspect-square rounded-3xl overflow-hidden border-2 transition-all group ${profile?.avatar_url === url ? 'border-volt scale-110 shadow-2xl shadow-volt/20' : 'border-white/5 opacity-50 hover:opacity-100'}`}
                                    >
                                        <img src={url} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setIsAvatarModalOpen(false)} className="w-full py-5 text-[10px] font-bebas italic text-gray-600 uppercase tracking-widest">Fechar</button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Profile;
