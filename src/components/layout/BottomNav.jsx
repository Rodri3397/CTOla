import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, Users, Trophy, User, LayoutDashboard } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BottomNav() {
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { icon: LayoutDashboard, label: 'Início', path: '/' },
        { icon: ShoppingCart, label: 'Mercado', path: '/mercado' },
        { icon: Users, label: 'Meu Time', path: '/meu-time' },
        { icon: Trophy, label: 'Ranking', path: '/ranking' },
        { icon: User, label: 'Perfil', path: '/perfil' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 pointer-events-none">
            <nav className="max-w-md mx-auto glass-premium rounded-[2.5rem] flex items-center justify-around p-2 pointer-events-auto shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className="relative flex flex-col items-center justify-center py-3 px-4 transition-all"
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="nav-active"
                                    className="absolute inset-0 bg-volt/10 rounded-2xl"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <item.icon 
                                size={20} 
                                className={`relative z-10 transition-colors duration-300 ${isActive ? 'text-volt' : 'text-gray-500'}`}
                            />
                            <span className={`text-[8px] font-black uppercase tracking-widest mt-1 relative z-10 transition-colors duration-300 ${isActive ? 'text-volt' : 'text-gray-500'}`}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
