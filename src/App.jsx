import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useStore } from './store/useStore';
import { Loader2 } from 'lucide-react';

// Pages
import Home from './pages/Home';
import Market from './pages/Market';
import MyTeam from './pages/MyTeam';
import MatchCenter from './pages/MatchCenter';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import Explore from './pages/Explore';
import Scouter from './pages/Admin/Scouter';
import AdminDashboard from './pages/Admin/Dashboard';
import Ranking from './pages/Ranking';
import LeagueDetail from './pages/LeagueDetail';

// Components
import Navbar from './components/layout/Navbar';

function App() {
    const navigate = useNavigate();
    const { user, setUser, fetchProfile, profile } = useStore();

    useEffect(() => {
        // Check for active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setUser(session.user);
                fetchProfile(session.user.id);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
            if (session?.user) {
                fetchProfile(session.user.id);
            }
        });

        return () => subscription.unsubscribe();
    }, [setUser, fetchProfile]);

    const isAdmin = profile?.role === 'ADMIN';
    const profileLoading = user && !profile;

    return (
        <div className="min-h-screen bg-[#0f1115] max-w-md mx-auto relative overflow-x-hidden text-white flex flex-col font-outfit">
            <div className="flex-1 pb-32 pt-6 px-5">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/auth" element={user ? <Navigate to="/" /> : <Auth />} />
                    <Route path="/explorar" element={<Explore />} />

                    {/* Private Routes */}
                    <Route path="/mercado" element={user ? <Market /> : <Navigate to="/auth" />} />
                    <Route path="/meu-time" element={user ? <MyTeam /> : <Navigate to="/auth" />} />
                    <Route path="/ranking" element={user ? <Ranking /> : <Navigate to="/auth" />} />
                    <Route path="/rodada" element={user ? <MatchCenter /> : <Navigate to="/auth" />} />
                    <Route path="/perfil" element={user ? <Profile /> : <Navigate to="/auth" />} />
                    <Route path="/league/:id" element={user ? <LeagueDetail /> : <Navigate to="/auth" />} /> {/* Added LeagueDetail route */}

                    {/* Admin/League Owner Routes */}
                    <Route
                        path="/admin/scouting"
                        element={profileLoading ? <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-neon" /></div> : (isAdmin ? <Scouter /> : <Navigate to="/" />)}
                    />
                    <Route
                        path="/admin"
                        element={<Navigate to="/admin/dashboard" />}
                    />
                    <Route
                        path="/admin/dashboard"
                        element={user ? <AdminDashboard /> : <Navigate to="/auth" />}
                    />
                </Routes>
            </div>

            <Navbar />
        </div>
    );
}

export default App;
