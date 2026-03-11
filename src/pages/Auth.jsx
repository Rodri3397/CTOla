import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Loader2, ArrowRight, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';

export default function Auth() {
    const navigate = useNavigate();
    const { signIn, signUp, loading, error } = useStore();
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });

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
        <div className="flex flex-col gap-8 animate-fade min-h-[80vh] justify-center">
            <header className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 bg-neon/10 rounded-3xl flex items-center justify-center border border-neon/20 shadow-lg shadow-neon/10">
                    <Zap className="text-neon" size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter">
                        {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
                    </h1>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-2 px-10">
                        {isLogin ? 'Entre para gerenciar sua liga' : 'Comece sua jornada no CTOlá'}
                    </p>
                </div>
            </header>

            <motion.form
                layout
                onSubmit={handleSubmit}
                className="glass p-8 rounded-[2.5rem] border border-white/5 flex flex-col gap-4 shadow-2xl"
            >
                <AnimatePresence mode="wait">
                    {!isLogin && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex flex-col gap-2"
                        >
                            <label className="text-[10px] font-black uppercase text-gray-600 ml-2">Nome Completo</label>
                            <div className="relative">
                                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Como quer ser chamado?"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-xs font-bold outline-none focus:border-neon/30 transition-all"
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase text-gray-600 ml-2">E-mail</label>
                    <div className="relative">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="seu@email.com"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-xs font-bold outline-none focus:border-neon/30 transition-all"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase text-gray-600 ml-2">Senha</label>
                    <div className="relative">
                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            type="password"
                            required
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="••••••••"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-xs font-bold outline-none focus:border-neon/30 transition-all"
                        />
                    </div>
                </div>

                {error && (
                    <p className="text-[10px] font-bold text-red-400 uppercase text-center mt-2 bg-red-400/10 py-2 rounded-lg">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-white text-black py-5 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-neon hover:scale-[1.02] active:scale-95 transition-all mt-4 flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <Loader2 className="animate-spin" size={16} />
                    ) : (
                        <>
                            {isLogin ? 'Entrar' : 'Criar Conta'}
                            <ArrowRight size={16} />
                        </>
                    )}
                </button>
            </motion.form>

            <footer className="text-center">
                <button
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
                >
                    {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
                </button>
            </footer>
        </div>
    );
}
