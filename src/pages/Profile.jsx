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
    Plus
} from 'lucide-react';

const ProfileAction = ({ icon: Icon, title, onClick, color = "text-gray-500", restricted = false }) => (
    <motion.button
        whileHover={{ scale: 1.02, x: 5 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="w-full glass p-5 flex items-center justify-between group rounded-[2rem] border-white/5 bg-white/5"
    >
        <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl bg-white/5 transition-transform duration-500 group-hover:rotate-6 ${color}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="flex flex-col items-start">
                <span className="text-sm font-bold tracking-tight text-white">{title}</span>
                {restricted ? (
                    <div className="flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 text-gray-700" />
                        <span className="text-[7px] text-gray-600 font-black uppercase tracking-widest">Restrito</span>
                    </div>
                ) : (
                    <span className="text-[7px] text-gray-500 font-bold uppercase tracking-widest leading-none mt-1">Gerenciar</span>
                )}
            </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-all" />
    </motion.button>
);

const AdminLoginModal = ({ onLogin, onClose }) => {
    const [pass, setPass] = useState('');
    const ADMIN_CODE = import.meta.env.VITE_ADMIN_CODE || "CTOLA2026";

    const handleTry = () => {
        if (pass === ADMIN_CODE) {
            onLogin();
        } else {
            alert('Código incorreto!');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-3xl z-[100] flex items-center justify-center p-6"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="glass w-full max-w-sm p-10 flex flex-col gap-8 text-center shadow-2xl relative border-neon/20 rounded-[3rem]"
            >
                <div>
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">Área Restrita</h2>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2 px-4">Diretoria da Liga</p>
                </div>

                <input
                    autoFocus
                    type="password"
                    value={pass}
                    onChange={e => setPass(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 px-4 py-5 rounded-[1.5rem] text-center font-black text-neon outline-none text-2xl focus:border-neon/50 transition-all uppercase"
                    placeholder="••••"
                />

                <div className="flex flex-col gap-3">
                    <button onClick={handleTry} className="bg-neon text-black py-4 rounded-2xl font-black text-xs uppercase neo-shadow transition-all hover:scale-105 active:scale-95">Habilitar Gestão</button>
                    <button onClick={onClose} className="text-[9px] font-black uppercase text-gray-600 tracking-widest hover:text-white transition-colors py-2">Voltar</button>
                </div>
            </motion.div>
        </motion.div>
    );
};

const Profile = () => {
    const {
        user, profile, signOut, myFollowedLeaguesDetails,
        fetchMyFollowedLeagues, setCurrentLeague, currentLeagueId, updateProfile
    } = useStore();
    const navigate = useNavigate();
    const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

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

    useEffect(() => {
        fetchMyFollowedLeagues();
    }, [fetchMyFollowedLeagues]);

    const isGlobalAdmin = profile?.role === 'ADMIN';
    const hasLeagueManagement = myFollowedLeaguesDetails.some(l => l.role === 'OWNER' || l.role === 'ADMIN');
    const canManage = isGlobalAdmin || hasLeagueManagement;

    const initials = profile?.name ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??';

    const handleSignOut = async () => {
        await signOut();
        navigate('/auth');
    };

    const activeLeague = myFollowedLeaguesDetails.find(l => l.id === currentLeagueId);

    const handleUpdateAvatar = async (url) => {
        await updateProfile({ avatar_url: url });
        setIsAvatarModalOpen(false);
    };

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <div className="flex flex-col gap-10 animate-fade pb-24">
            <header className="flex justify-between items-center px-1">
                <h1 className="text-2xl font-black italic uppercase">Meu Perfil</h1>
                <motion.button
                    whileHover={{ rotate: 90 }}
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-3 glass rounded-2xl text-gray-500 hover:text-white transition-colors border-white/5"
                >
                    <Settings className="w-5 h-5" />
                </motion.button>
            </header>

            <div className="flex flex-col items-center gap-6 py-4 relative group">
                <div className="relative">
                    <div className="absolute inset-0 bg-neon/10 blur-[40px] rounded-full scale-150 transition-all duration-1000" />
                    <button
                        onClick={() => setIsAvatarModalOpen(true)}
                        className="w-32 h-32 rounded-[3.5rem] bg-surface-light text-white border-4 border-white/10 flex items-center justify-center text-4xl font-black shadow-2xl relative z-10 uppercase overflow-hidden hover:border-neon/50 transition-all group"
                    >
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                            initials
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                            <Plus className="text-white" size={24} />
                        </div>
                    </button>
                    {canManage && (
                        <div className="absolute -bottom-2 -right-2 bg-neon p-2.5 rounded-2xl border-4 border-[#0f1115] shadow-xl z-20">
                            <Shield className="w-5 h-5 text-black" />
                        </div>
                    )}
                </div>
                <div className="text-center z-10">
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter">{profile?.name || 'Usuário'}</h2>
                    <div className="flex items-center justify-center gap-2 mt-2">
                        <div className={`w-2 h-2 rounded-full ${canManage ? 'bg-neon shadow-[0_0_10px_#00f5ff]' : 'bg-gray-700'}`} />
                        <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">
                            {isGlobalAdmin ? 'Administrador Master' : hasLeagueManagement ? 'Presidente de Liga' : 'Dono da Equipe'}
                        </span>
                    </div>
                    <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest mt-2">{user?.email}</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="glass py-6 flex flex-col items-center gap-1 border-white/5 rounded-3xl">
                    <Zap size={16} className="text-neon mb-1" />
                    <div className="text-xl font-black text-white">0.0</div>
                    <div className="text-[7px] text-gray-500 font-black uppercase tracking-widest">Scout</div>
                </div>
                <div className="glass py-6 flex flex-col items-center gap-1 border-neon/30 bg-neon/5 rounded-3xl scale-105 neo-shadow shadow-neon/10">
                    <Trophy size={16} className="text-neon mb-1" />
                    <div className="text-xl font-black italic text-white">--</div>
                    <div className="text-[7px] text-neon/60 font-black uppercase tracking-widest">Ranking</div>
                </div>
                <div className="glass py-6 flex flex-col items-center gap-1 border-white/5 rounded-3xl">
                    <Wallet size={16} className="text-neon mb-1" />
                    <div className="text-xl font-black text-white">C$ 100</div>
                    <div className="text-[7px] text-gray-500 font-black uppercase tracking-widest">Saldo</div>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                <ProfileAction
                    icon={Award}
                    title="Explorar Ligas"
                    onClick={() => navigate('/explorar')}
                    color="text-yellow-500"
                />

                <ProfileAction
                    icon={History}
                    title="Histórico de Jogos"
                    onClick={() => alert('Histórico de Jogos em breve! Fique ligado nas próximas rodadas.')}
                    color="text-accent"
                />

                {canManage && (
                    <ProfileAction
                        icon={ShieldCheck}
                        title="Arena de Gestão"
                        onClick={() => navigate('/admin/dashboard')}
                        color="text-neon"
                    />
                )}

                <button
                    onClick={handleSignOut}
                    className="flex items-center justify-center gap-2 py-8 text-[9px] font-black uppercase text-gray-700 hover:text-white transition-all tracking-[0.2em]"
                >
                    <LogOut className="w-4 h-4" /> Finalizar Sessão
                </button>
            </div>

            {/* Settings Menu / Leagues Sheet */}
            <AnimatePresence>
                {isSettingsOpen && (
                    <div className="fixed inset-0 z-[120] flex items-end justify-center">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSettingsOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="w-full max-w-md glass rounded-t-[3rem] border-t border-white/10 p-8 flex flex-col gap-8 relative z-10 bg-[#0f1115]/90 max-h-[85vh]"
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">Configurações</h2>
                                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Minhas Ligas e Preferências</p>
                                </div>
                                <button onClick={() => setIsSettingsOpen(false)} className="p-3 glass rounded-2xl text-gray-500 hover:text-white border-white/5 transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex flex-col gap-4">
                                <h3 className="text-[10px] font-black uppercase text-gray-600 tracking-[0.3em] px-2">Suas Ligas Ativas</h3>
                                <div className="flex flex-col gap-3 overflow-y-auto no-scrollbar max-h-[40vh] pb-4">
                                    {myFollowedLeaguesDetails.map((league) => (
                                        <button
                                            key={league.id}
                                            onClick={() => {
                                                setIsSettingsOpen(false);
                                                navigate(`/league/${league.id}`);
                                            }}
                                            className={`w-full glass p-5 flex items-center justify-between group rounded-[2rem] border-white/5 transition-all ${currentLeagueId === league.id ? 'bg-neon/10 border-neon/30' : 'bg-white/5'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-2xl bg-white/5 ${currentLeagueId === league.id ? 'text-neon' : 'text-gray-500'}`}>
                                                    <Shield className="w-5 h-5" />
                                                </div>
                                                <div className="flex flex-col items-start">
                                                    <span className={`text-sm font-bold tracking-tight ${currentLeagueId === league.id ? 'text-neon text-glow' : 'text-white'}`}>
                                                        {league.name}
                                                    </span>
                                                    <span className="text-[7px] text-gray-600 font-black uppercase tracking-widest">
                                                        {league.role === 'OWNER' ? 'Fundador' : league.role === 'ADMIN' ? 'Administrador' : 'Membro'}
                                                    </span>
                                                </div>
                                            </div>
                                            {currentLeagueId === league.id && (
                                                <div className="bg-neon/20 px-3 py-1 rounded-full border border-neon/30">
                                                    <span className="text-[8px] text-neon font-black uppercase">Ativa</span>
                                                </div>
                                            )}
                                        </button>
                                    ))}

                                    {myFollowedLeaguesDetails.length === 0 && (
                                        <button
                                            onClick={() => {
                                                setIsSettingsOpen(false);
                                                navigate('/explorar');
                                            }}
                                            className="w-full glass p-8 rounded-[2rem] border-dashed border-white/10 flex flex-col items-center gap-3 group hover:border-neon/30 transition-all opacity-50"
                                        >
                                            <Search className="text-gray-600 group-hover:text-neon" size={24} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Buscar novas ligas</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
                                <button
                                    onClick={() => alert('Configurações de conta em breve!')}
                                    className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all"
                                >
                                    Gerenciar Conta
                                </button>
                                <button
                                    onClick={() => alert('Suporte técnico em breve!')}
                                    className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all text-neon/40"
                                >
                                    Ajuda & Suporte
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>


            <button
                onClick={handleSignOut}
                className="flex items-center justify-center gap-2 py-8 text-[9px] font-black uppercase text-gray-700 hover:text-white transition-all tracking-[0.2em]"
            >
                <LogOut className="w-4 h-4" /> Finalizar Sessão
            </button>
            {/* Avatar Modal */}
            <AnimatePresence>
                {isAvatarModalOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-sm glass rounded-[3rem] border border-white/10 p-8 flex flex-col gap-6"
                        >
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-black uppercase italic italic">Escolha o Avatar</h2>
                                <button onClick={() => setIsAvatarModalOpen(false)}><X size={20} /></button>
                            </div>
                            <div className="grid grid-cols-4 gap-4 max-h-[40vh] overflow-y-auto no-scrollbar py-2">
                                {avatars.map((url, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleUpdateAvatar(url)}
                                        className={`w-14 h-14 rounded-2xl overflow-hidden border-2 transition-all ${profile?.avatar_url === url ? 'border-neon scale-110 shadow-lg' : 'border-white/5 opacity-50 hover:opacity-100'}`}
                                    >
                                        <img src={url} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Profile;
