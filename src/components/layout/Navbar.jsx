import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, ShoppingCart, Users, Settings, ShieldCheck } from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStore';

const Navbar = () => {
    const { user, profile } = useStore();

    const navItems = [
        { id: 'home', icon: Home, label: 'Início', path: '/' },
        { id: 'leagues', icon: ShieldCheck, label: 'Explorar', path: '/explorar' },
        { id: 'mercado', icon: ShoppingCart, label: 'Mercado', path: '/mercado' },
        { id: 'time', icon: Users, label: 'Meu Time', path: '/meu-time' },
        { id: 'profile', icon: Settings, label: 'Perfil', path: '/perfil' },
    ];

    return (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md h-20 bg-[#1a1d23]/95 border-t border-white/10 flex items-center justify-around z-50 px-2 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            {navItems.map((item) => (
                <NavLink
                    key={item.id}
                    to={item.path}
                    className={({ isActive }) => clsx(
                        "flex flex-col items-center justify-center gap-1 tab-btn relative transition-all duration-300 flex-1 cursor-pointer h-full outline-none",
                        isActive ? "text-neon" : "text-gray-600"
                    )}
                >
                    {({ isActive }) => (
                        <>
                            <div className={clsx(
                                "p-2 rounded-xl transition-all duration-300 flex items-center justify-center",
                                isActive && "bg-neon/10 neo-shadow"
                            )}>
                                <item.icon size={22} className={clsx(isActive ? "text-neon" : "text-gray-600")} />
                            </div>
                            <span className={clsx(
                                "text-[8px] font-black uppercase tracking-widest leading-none",
                                isActive ? "text-neon" : "text-gray-600"
                            )}>
                                {item.label}
                            </span>
                        </>
                    )}
                </NavLink>
            ))}
        </nav>
    );
};

export default Navbar;
