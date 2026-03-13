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
        fetchMyFollowedLeagues, currentLeagueId, updateProfile
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

    const handleUpdateAvatar = async (url) => {
        await updateProfile({ avatar_url: url });
        setIsAvatarModalOpen(false);
    };

    return (
        <div className="flex flex-col gap-10 animate-fade-in pb-32">
            <header className="flex justify-between items-end px-1">
                <h1 className="text-4xl font-bebas italic text-white tracking-tighter leading-none">MEU <span className="text-volt">PERFIL</span></h1>
                <motion.button
                    whileHover={{ rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-4 bento-card text-gray-500 hover:text-white transition-all"
                >
                    <Settings className="w-5 h-5" />
                </motion.button>
            </header>

            <div className="flex flex-col items-center gap-8 py-4">
                <div className="relative group">
                    <div className="absolute inset-0 bg-volt/10 blur-[60px] rounded-full scale-150 group-hover:bg-volt/20 transition-all duration-1000" />
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        onClick={() => setIsAvatarModalOpen(true)}
                        className="w-40 h-40 rounded-[4.5rem] bg-black border-4 border-white/5 flex items-center justify-center text-5xl font-black shadow-2xl relative z-10 uppercase overflow-hidden hover:border-volt/40 transition-all"
                    >
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} className="w-full h-full object-cover" />
                        ) : (
                            <span className="font-bebas italic text-volt">{initials}</span>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                            <Plus className="text-volt" size={32} />
                        </div>
                    </motion.button>
                    {canManage && (
                        <div className="absolute -bottom-2 -right-2 bg-volt p-3.5 rounded-[1.5rem] border-[6px] border-pure-black shadow-2xl z-20">
                            <ShieldCheck className="w-6 h-6 text-black" />
                        </div>
                    )}
                </div>
                
                <div className="text-center z-10 space-y-2">
                    <h2 className="text-4xl font-bebas italic text-white tracking-tight uppercase leading-none">{profile?.name || 'Usuário'}</h2>
                    <div className="flex items-center justify-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${canManage ? 'bg-volt animate-pulse' : 'bg-gray-700'}`} />
                        <span className="text-[9px] text-gray-500 font-black uppercase tracking-[0.3em]">
                            {isGlobalAdmin ? 'MASTER ADMIN' : hasLeagueManagement ? 'DIRETOR DE LIGA' : 'COMANDANTE'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Premium Bento Stats */}
            <div className="grid grid-cols-6 grid-rows-2 gap-4 h-[220px]">
                <div className="col-span-4 row-span-2 bento-card flex flex-col justify-between p-6">
                    <div className="flex justify-between items-start">
                        <div className="w-12 h-12 rounded-2xl bg-volt/10 flex items-center justify-center border border-volt/20">
                            <Trophy className="text-volt" size={24} />
                        </div>
                        <span className="text-[8px] font-black uppercase text-gray-600 tracking-widest">Ranking Global</span>
                    </div>
                    <div>
                        <div className="text-5xl font-bebas italic text-white leading-none">#--</div>
                        <div className="flex items-center gap-1.5 mt-2">
                            <TrendingUp className="text-volt" size={12} />
                            <span className="text-[10px] font-bold text-volt">TOP 0.1%</span>
                        </div>
                    </div>
                </div>
                <div className="col-span-2 row-span-1 bento-card p-5 flex flex-col justify-between bg-volt/5 border-volt/20">
                    <Wallet className="text-volt" size={20} />
                    <div>
                        <div className="text-xs font-black text-gray-500 uppercase tracking-widest leading-none mb-1">C$</div>
                        <div className="text-xl font-bebas text-white leading-none">100.0</div>
                    </div>
                </div>
                <div className="col-span-2 row-span-1 bento-card p-5 flex flex-col justify-between">
                    <Zap className="text-volt" size={20} />
                    <div>
                        <div className="text-xs font-black text-gray-500 uppercase tracking-widest leading-none mb-1">PONTOS</div>
                        <div className="text-xl font-bebas text-white leading-none">0.00</div>
                    </div>
                </div>
            </div>

            {/* Actions Grid */}
            <div className="flex flex-col gap-4">
                <ProfileAction
                    icon={Award}
                    title="Arena de Ligas"
                    onClick={() => navigate('/explorar')}
                    color="text-volt"
                />

                <ProfileAction
                    icon={History}
                    title="Linha do Tempo"
                    onClick={() => alert('Em breve!')}
                    color="text-white/40"
                />

                {canManage && (
                    <ProfileAction
                        icon={ShieldCheck}
                        title="Gestão de Arena"
                        onClick={() => navigate('/admin/dashboard')}
                        color="text-volt"
                        restricted
                    />
                )}

                <button
                    onClick={handleSignOut}
                    className="w-full mt-10 py-8 text-[11px] font-bebas italic uppercase text-gray-700 hover:text-white transition-all tracking-[0.4em] flex items-center justify-center gap-4"
                >
                    <div className="w-8 h-px bg-white/5" />
                    ENCERRAR SESSÃO
                    <div className="w-8 h-px bg-white/5" />
                </button>
            </div>

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

                            <div className="flex flex-col gap-6">
                                <span className="text-[10px] font-black uppercase text-volt tracking-[0.3em]">Minhas Ligas Ativas</span>
                                <div className="flex flex-col gap-3 overflow-y-auto no-scrollbar max-h-[40vh]">
                                    {myFollowedLeaguesDetails.map((league) => (
                                        <button
                                            key={league.id}
                                            onClick={() => navigate(`/league/${league.id}`)}
                                            className={`bento-card p-5 flex items-center justify-between border-white/5 ${currentLeagueId === league.id ? 'bg-volt/10 border-volt/30 shadow-2xl shadow-volt/5' : 'bg-white/5'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 rounded-xl bg-black border border-white/10">
                                                    <Shield className={currentLeagueId === league.id ? 'text-volt' : 'text-gray-500'} size={20} />
                                                </div>
                                                <div className="text-left">
                                                    <h4 className={`text-sm font-black uppercase tracking-tight leading-none ${currentLeagueId === league.id ? 'text-volt' : 'text-white'}`}>{league.name}</h4>
                                                    <p className="text-[7px] text-gray-600 font-black uppercase tracking-widest mt-1.5">{league.role}</p>
                                                </div>
                                            </div>
                                            {currentLeagueId === league.id && <div className="w-2 h-2 rounded-full bg-volt shadow-glow shadow-volt" />}
                                        </button>
                                    ))}
                                </div>
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
