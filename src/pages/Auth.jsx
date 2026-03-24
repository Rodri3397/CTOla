import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Loader2, ArrowRight, Zap, Trophy, TrendingUp, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';

export default function Auth() {
    const navigate = useNavigate();
    const { signIn, signUp, loading, error } = useStore();
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const { user } = useStore();

    useEffect(() => {
        if (user) {
            navigate('/');
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { error: authError } = isLogin
            ? await signIn(formData.email, formData.password)
            : await signUp(formData.email, formData.password, formData.name);

        if (!authError) {
            navigate('/');
        }
    };

    return (
        <div className="flex flex-col min-h-[90vh] pb-10">
            {/* Massive Hero Section */}
            <motion.header 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-10 py-16 relative overflow-hidden"
            >
                {/* Background Glows */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-volt/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[60px] pointer-events-none" />

                <motion.div 
                    whileHover={{ scale: 1.05, rotate: 5 }}
                    className="w-24 h-24 bg-volt rounded-[2.5rem] flex items-center justify-center shadow-[0_0_50px_rgba(223,255,0,0.3)] border border-white/20 relative z-10"
                >
                    <Zap className="text-black" size={48} fill="currentColor" />
                </motion.div>

                <div className="flex flex-col items-center gap-3 relative z-10">
                    <h1 className="text-6xl font-bebas italic text-white leading-none tracking-tighter drop-shadow-2xl">
                        CT<span className="text-volt">OLA</span>
                    </h1>
                    <div className="flex items-center gap-2">
                        <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-white/20" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.5em] italic">Fantasy Futsal</span>
                        <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-white/20" />
                    </div>
                </div>

                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-[11px] text-gray-400 font-bold uppercase tracking-widest max-w-[280px] text-center leading-relaxed"
                >
                    A arena definitiva para os mestres da tática. {isLogin ? 'Entre para comandar.' : 'Crie sua dinastia.'}
                </motion.p>
            </motion.header>

            {/* Form Section */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="px-2"
            >
                <form
                    onSubmit={handleSubmit}
                    className="glass p-10 rounded-[3rem] border border-white/5 flex flex-col gap-6 shadow-[0_25px_60px_rgba(0,0,0,0.5)] relative overflow-hidden"
                >
                    <AnimatePresence mode="wait">
                        {!isLogin && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex flex-col gap-2"
                            >
                                <label className="text-[9px] font-black uppercase text-gray-700 ml-4 tracking-widest">Seu Nome de Guerra</label>
                                <div className="relative">
                                    <User className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ex: Falcão10"
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-[11px] font-bold text-white outline-none focus:border-volt/30 transition-all placeholder:text-gray-800"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-black uppercase text-gray-700 ml-4 tracking-widest">E-mail de Acesso</label>
                        <div className="relative">
                            <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="seu@email.com"
                                className="w-full bg-black/40 border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-[11px] font-bold text-white outline-none focus:border-volt/30 transition-all placeholder:text-gray-800 shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-black uppercase text-gray-700 ml-4 tracking-widest">Chave de Segurança</label>
                        <div className="relative">
                            <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                            <input
                                type="password"
                                required
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="••••••••"
                                className="w-full bg-black/40 border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-[11px] font-bold text-white outline-none focus:border-volt/30 transition-all placeholder:text-gray-800 shadow-inner"
                            />
                        </div>
                    </div>

                    {error && (
                        <motion.p 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-[9px] font-black text-red-500 uppercase text-center py-3 bg-red-500/5 rounded-xl border border-red-500/10 tracking-widest"
                        >
                            {error}
                        </motion.p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-volt text-black py-6 rounded-2xl font-black text-[11px] uppercase shadow-[0_15px_30px_rgba(223,255,0,0.2)] hover:scale-[1.03] active:scale-95 transition-all mt-4 flex items-center justify-center gap-3 tracking-widest"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                {isLogin ? 'Entrar na Arena' : 'Efetivar Alistamento'}
                                <ArrowRight size={18} strokeWidth={3} />
                            </>
                        )}
                    </button>
                    
                    <button
                        type="button"
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 hover:text-white transition-colors mt-2"
                    >
                        {isLogin ? 'Nova Jornada? Cadastre-se' : 'Já é Veterano? Faça Login'}
                    </button>
                </form>
            </motion.div>

            {/* Features Footer */}
            <div className="grid grid-cols-3 gap-6 px-8 mt-16 opacity-20 group-hover:opacity-100 transition-opacity">
                <div className="flex flex-col items-center gap-2 text-center text-gray-500">
                    <Trophy size={18} />
                    <span className="text-[7px] font-black uppercase tracking-widest leading-tight">Ligas Reais</span>
                </div>
                <div className="flex flex-col items-center gap-2 text-center text-gray-500">
                    <TrendingUp size={18} />
                    <span className="text-[7px] font-black uppercase tracking-widest leading-tight">Scouts Live</span>
                </div>
                <div className="flex flex-col items-center gap-2 text-center text-gray-500">
                    <Shield size={18} />
                    <span className="text-[7px] font-black uppercase tracking-widest leading-tight">Gestão Admin</span>
                </div>
            </div>
        </div>
    );
}
