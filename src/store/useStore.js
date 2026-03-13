import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useStore = create((set, get) => ({
    teams: [],
    athletes: [],
    rounds: [],
    activeRoundId: null,
    currentLeagueId: (() => {
        const id = localStorage.getItem('ctola_league_id');
        return (id && id !== 'null' && id !== 'undefined') ? id : null;
    })(),
    leagues: [],
    myLeagues: [],
    isValidUUID: (id) => id && id.length > 30 && id !== 'null' && id !== 'undefined',
    myFollowedLeagues: [],
    myFollowedLeaguesDetails: [],
    draftSquad: JSON.parse(localStorage.getItem('ctola_draft_squad') || '{}'),
    draftCaptainId: localStorage.getItem('ctola_draft_captain') || null,
    leagueMembers: [], // Members of the currently active league for management
    feed: [],
    notification: null, // { message: '', type: 'success' | 'error' }
    
    setNotification: (notif) => {
        set({ notification: notif });
        if (notif) setTimeout(() => set({ notification: null }), 3000);
    },

    // League Actions
    setCurrentLeague: (id) => {
        set({ currentLeagueId: id });
        if (id) {
            localStorage.setItem('ctola_league_id', id);
        } else {
            localStorage.removeItem('ctola_league_id');
        }
        // Refresh data when league changes
        get().fetchTeams();
        get().fetchAthletes();
        get().fetchRounds();
    },

    fetchLeagues: async () => {
        set({ loading: true, error: null });
        try {
            const { data, error } = await supabase
                .from('leagues')
                .select('*')
                .eq('is_public', true)
                .order('name');

            if (error) throw error;
            set({ leagues: data || [], loading: false });

            // Optionally fetch followed status if user is logged in
            get().fetchMyFollowedLeagues();
        } catch (err) {
            console.error('Fetch leagues error:', err);
            set({ error: err.message, loading: false });
        }
    },

    fetchMyFollowedLeagues: async () => {
        const { user } = get();
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('league_members')
                .select(`
                    league_id,
                    role,
                    team_name,
                    leagues (
                        id,
                        name,
                        is_public,
                        owner_id
                    )
                `)
                .eq('user_id', user.id);

            if (error) throw error;
            set({
                myFollowedLeagues: data?.map(d => d.league_id) || [],
                myFollowedLeaguesDetails: data?.map(d => ({ ...d.leagues, role: d.role, team_name: d.team_name })) || []
            });
        } catch (err) {
            console.error('Error fetching followed leagues:', err);
        }
    },

    fetchMyLeagues: async () => {
        const { user } = get();
        if (!user) return;

        set({ loading: true });
        try {
            // Get all leagues where user is OWNER or ADMIN
            const { data: memberData, error: mError } = await supabase
                .from('league_members')
                .select(`
                    role,
                    team_name,
                    leagues (*)
                `)
                .eq('user_id', user.id);

            if (mError) throw mError;

            const leagues = memberData?.map(m => ({
                ...m.leagues,
                user_role: m.role,
                team_name: m.team_name // Crucial to sync this!
            })) || [];

            set({ 
                myLeagues: leagues, 
                myFollowedLeaguesDetails: leagues, // Sync for Home.jsx
                loading: false 
            });

            // Auto-select first league if none active
            const { currentLeagueId } = get();
            if (!currentLeagueId && leagues.length > 0) {
                const firstId = leagues[0].id;
                set({ currentLeagueId: firstId });
                localStorage.setItem('ctola_league_id', firstId);
                get().fetchTeams();
                get().fetchAthletes();
                get().fetchRounds();
            }
        } catch (err) {
            set({ error: err.message, loading: false });
        }
    },

    createLeague: async (name, isPublic = true, adminCode) => {
        const { user } = get();
        if (!user) return { error: 'Not authenticated' };

        set({ loading: true });
        try {
            const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const { data, error } = await supabase
                .from('leagues')
                .insert([{
                    name,
                    owner_id: user.id,
                    is_public: isPublic,
                    invite_code: inviteCode
                }])
                .select();

            if (error) throw error;

            if (data) {
                // Also add owner as a member
                await supabase.from('league_members').insert({
                    league_id: data[0].id,
                    user_id: user.id,
                    role: 'OWNER',
                    admin_code: adminCode
                });

                set(state => ({
                    myLeagues: [...state.myLeagues, data[0]],
                    currentLeagueId: data[0].id
                }));
                localStorage.setItem('ctola_league_id', data[0].id);
                get().setCurrentLeague(data[0].id);
            }

            set({ loading: false });
            return { data, error: null };
        } catch (err) {
            set({ error: err.message, loading: false });
            return { error: err.message };
        }
    },

    fetchLeagueMembers: async (leagueId) => {
        if (!leagueId) return;
        set({ loading: true });
        try {
            const { data, error } = await supabase
                .from('league_members')
                .select(`
                    *,
                    profiles (
                        name,
                        avatar_url
                    )
                `)
                .eq('league_id', leagueId);

            if (error) throw error;
            set({ leagueMembers: data || [], loading: false });
        } catch (err) {
            console.error("Fetch members error:", err);
            set({ loading: false });
        }
    },

    // Unified fetch for all league data to avoid multiple loading flickers
    fetchLeagueData: async () => {
        const { currentLeagueId } = get();
        if (!currentLeagueId || currentLeagueId === 'null' || currentLeagueId === 'undefined') {
            set({ loading: false });
            return;
        }

        set({ loading: true, error: null });
        try {
            await Promise.all([
                get().fetchTeams(),
                get().fetchAthletes(),
                get().fetchRounds(),
                get().fetchFeed()
            ]);
        } catch (err) {
            set({ error: err.message });
        } finally {
            set({ loading: false });
        }
    },

    updateMemberRole: async (leagueId, userId, newRole) => {
        set({ loading: true, error: null });
        try {
            const { error } = await supabase
                .from('league_members')
                .update({ role: newRole })
                .eq('league_id', leagueId)
                .eq('user_id', userId);

            if (error) throw error;
            
            // Refresh local state
            await get().fetchLeagueMembers(leagueId);
            return { error: null };
        } catch (err) {
            console.error("Update role error:", err);
            set({ error: err.message, loading: false });
            return { error: err.message };
        }
    },

    updateTeamName: async (leagueId, teamName) => {
        const { user } = get();
        if (!user || !leagueId || leagueId === 'null') return { error: 'Invalid context' };

        set({ loading: true, error: null });
        try {
            const { error } = await supabase
                .from('league_members')
                .update({ team_name: teamName })
                .eq('league_id', leagueId)
                .eq('user_id', user.id);

            if (error) throw error;
            
            // Refetch to ensure all components have the latest data
            await get().fetchMyFollowedLeagues();
            
            set({ loading: false });
            return { error: null };
        } catch (err) {
            console.error("Update team name error:", err);
            set({ error: err.message, loading: false });
            return { error: err.message };
        }
    },

    followLeague: async (leagueId) => {
        const { user } = get();
        if (!user) return { error: 'Not authenticated' };

        try {
            const { error } = await supabase
                .from('league_members')
                .insert({ league_id: leagueId, user_id: user.id, role: 'MEMBER' });

            if (error) throw error;
            
            await get().fetchMyFollowedLeagues();
            return { error: null };
        } catch (err) {
            return { error: err.message };
        }
    },

    unfollowLeague: async (leagueId) => {
        const { user } = get();
        if (!user) return { error: 'Not authenticated' };

        try {
            const { error } = await supabase
                .from('league_members')
                .delete()
                .eq('league_id', leagueId)
                .eq('user_id', user.id);

            if (error) throw error;
            set(state => ({
                myFollowedLeagues: state.myFollowedLeagues.filter(id => id !== leagueId)
            }));
            return { error: null };
        } catch (err) {
            return { error: err.message };
        }
    },

    joinLeagueByCode: async (code) => {
        const { user } = get();
        if (!user) return { error: 'Not authenticated' };

        try {
            // Find league by code
            const { data: league, error: lError } = await supabase
                .from('leagues')
                .select('id, name')
                .eq('invite_code', code.toUpperCase())
                .single();

            if (lError || !league) throw new Error('Invite code invalid');

            // Join league
            const { error: jError } = await supabase
                .from('league_members')
                .insert({ league_id: league.id, user_id: user.id, role: 'MEMBER' });

            if (jError) {
                if (jError.code === '23505') throw new Error('Already a member of this league');
                throw jError;
            }

            await get().fetchMyFollowedLeagues();

            return { data: league, error: null };
        } catch (err) {
            return { error: err.message };
        }
    },

    // Auth Actions
    setUser: (user) => set({ user }),

    fetchProfile: async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (!error) set({ profile: data });
            return { data, error };
        } catch (err) {
            console.error("Profile fetch error:", err);
        }
    },

    signIn: async (email, password) => {
        set({ loading: true, error: null });
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) set({ error: error.message, loading: false });
        else {
            set({ user: data.user, loading: false });
            await get().fetchProfile(data.user.id);
        }
        return { data, error };
    },

    signUp: async (email, password, name) => {
        set({ loading: true, error: null });
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: name } }
        });

        if (error) {
            set({ error: error.message, loading: false });
        } else if (data.user) {
            // Create profile entry
            const { error: pError } = await supabase
                .from('profiles')
                .insert([{ id: data.user.id, name, role: 'USER' }]);

            if (!pError) await get().fetchProfile(data.user.id);
            set({ user: data.user, loading: false });
        }
        return { data, error };
    },

    updateProfile: async (updates) => {
        const { user } = get();
        if (!user) return { error: 'Not authenticated' };

        set({ loading: true });
        try {
            const { data, error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id)
                .select()
                .single();

            if (error) throw error;
            set({ profile: data, loading: false });
            return { data, error: null };
        } catch (err) {
            set({ error: err.message, loading: false });
            return { error: err.message };
        }
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, profile: null, myFollowedLeagues: [], myFollowedLeaguesDetails: [] });
    },

    // Squad Persistence
    saveUserSquad: async (squadData, captainId) => {
        const { user, currentLeagueId, activeRoundId } = get();
        if (!user || !currentLeagueId || !activeRoundId) return { error: 'Missing context' };

        set({ loading: true });
        try {
            const { data, error } = await supabase
                .from('user_squads')
                .upsert({
                    user_id: user.id,
                    league_id: currentLeagueId,
                    round_id: activeRoundId,
                    squad_data: squadData,
                    captain_id: captainId,
                }, { onConflict: 'user_id, league_id, round_id' })
                .select();

            if (error) throw error;
            set({ loading: false });
            get().setNotification({ message: 'Escalação confirmada!', type: 'success' });
            return { data, error: null };
        } catch (err) {
            console.error('Error saving squad:', err);
            set({ error: err.message, loading: false });
            get().setNotification({ message: 'Erro ao salvar: ' + err.message, type: 'error' });
            return { error: err.message };
        }
    },

    fetchUserSquad: async (roundId) => {
        const { user, currentLeagueId } = get();
        const rId = roundId || get().activeRoundId;

        // Validation: Ensure IDs are valid UUIDs and not the string "null"
        if (!user || !user.id || user.id === 'null') return null;
        if (!currentLeagueId || currentLeagueId === 'null') return null;
        if (!rId || rId === 'null') return null;

        try {
            const { data, error } = await supabase
                .from('user_squads')
                .select('*')
                .eq('user_id', user.id)
                .eq('league_id', currentLeagueId)
                .eq('round_id', rId)
                .maybeSingle();

            if (error) throw error;

            // Sync with draft if draft is empty
            const { draftSquad, setDraftSquad, setDraftCaptain } = get();
            if (data && Object.keys(draftSquad).length === 0) {
                setDraftSquad(data.squad_data || {});
                setDraftCaptain(data.captain_id);
            }

            return data;
        } catch (err) {
            console.error('Error fetching squad:', err);
            return null;
        }
    },

    // Draft Squad Actions
    addToDraftSquad: (athlete) => {
        const { draftSquad, currentLeagueId } = get();
        if (!currentLeagueId) return;

        // Auto-assign slot based on position
        let slot = null;
        if (athlete.pos === 'GOLEIRO') slot = 'goleiro';
        else if (athlete.pos === 'FIXO') slot = 'fixo';
        else {
            // Fill line3, line4, line5, line6
            if (!draftSquad.line3) slot = 'line3';
            else if (!draftSquad.line4) slot = 'line4';
            else if (!draftSquad.line5) slot = 'line5';
            else if (!draftSquad.line6) slot = 'line6';
        }

        if (slot) {
            const newDraft = { ...draftSquad, [slot]: athlete.id };
            set({ draftSquad: newDraft });
            localStorage.setItem('ctola_draft_squad', JSON.stringify(newDraft));
        }
    },

    setDraftSquad: (squad) => {
        set({ draftSquad: squad });
        localStorage.setItem('ctola_draft_squad', JSON.stringify(squad));
    },

    setDraftCaptain: (id) => {
        set({ draftCaptainId: id });
        localStorage.setItem('ctola_draft_captain', id || '');
    },

    clearDraftSquad: () => {
        set({ draftSquad: {}, draftCaptainId: null });
        localStorage.removeItem('ctola_draft_squad');
        localStorage.removeItem('ctola_draft_captain');
    },

    fetchLeaderboard: async () => {
        const { currentLeagueId } = get();
        if (!currentLeagueId || currentLeagueId === 'null') return [];

        set({ loading: true });
        try {
            // Fetch squads
            const { data: squads, error: sError } = await supabase
                .from('user_squads')
                .select('*')
                .eq('league_id', currentLeagueId);

            if (sError) throw sError;

            // Fetch profiles for these squads
            const userIds = [...new Set(squads.map(s => s.user_id))];
            const { data: profiles, error: pError } = await supabase
                .from('profiles')
                .select('id, name, display_name, avatar_url')
                .in('id', userIds);

            if (pError) {
                console.warn('Profiles fetch failed, possibly due to relationship issues:', pError);
            }

            // Merge
            const enrichedSquads = squads.map(s => ({
                ...s,
                profiles: profiles?.find(p => p.id === s.user_id) || null
            }));

            set({ loading: false });
            return enrichedSquads;
        } catch (err) {
            console.error('Error fetching leaderboard:', err);
            set({ loading: false });
            return [];
        }
    },

    // Fetch all teams for current league
    fetchTeams: async () => {
        const { currentLeagueId, isValidUUID } = get();
        if (!isValidUUID(currentLeagueId)) return;

        set({ loading: true });
        try {
            const { data, error } = await supabase
                .from('teams')
                .select('*')
                .eq('league_id', currentLeagueId)
                .order('name');

            if (error) set({ error: error.message, loading: false });
            else set({ teams: data || [], loading: false });
        } catch (err) {
            set({ error: err.message, loading: false });
        }
    },

    // Fetch all rounds for current league
    fetchRounds: async () => {
        const { currentLeagueId, isValidUUID } = get();
        if (!isValidUUID(currentLeagueId)) return;

        try {
            const { data, error } = await supabase
                .from('rounds')
                .select('*')
                .eq('league_id', currentLeagueId)
                .order('number', { ascending: true });

            if (!error && data) {
                set({ rounds: data });
            } else {
                // Fallback to local storage if table missing
                const local = localStorage.getItem(`ctola_rounds_${currentLeagueId}`);
                if (local) set({ rounds: JSON.parse(local) });
            }

            // Default to last round if none selected
            const currentRounds = get().rounds;
            if (!get().activeRoundId && currentRounds.length > 0) {
                set({ activeRoundId: currentRounds[currentRounds.length - 1].id });
            }
        } catch (err) {
            console.error("Rounds error:", err);
        }
    },

    createRound: async () => {
        const { currentLeagueId, rounds } = get();
        if (!currentLeagueId) return { error: "No league selected" };

        const nextNumber = rounds.length + 1;
        const newRound = {
            id: crypto.randomUUID(),
            league_id: currentLeagueId,
            number: nextNumber,
            status: 'open',
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('rounds')
            .insert([{ league_id: currentLeagueId, number: nextNumber, status: 'open' }])
            .select();

        if (error) {
            console.warn("Supabase rounds error, using local fallback", error);
            const updated = [...rounds, newRound];
            localStorage.setItem(`ctola_rounds_${currentLeagueId}`, JSON.stringify(updated));
            set({ rounds: updated, activeRoundId: newRound.id });
            return { data: [newRound], error: null };
        }

        if (data) {
            set(state => ({
                rounds: [...state.rounds, data[0]],
                activeRoundId: data[0].id
            }));
        }
        return { data, error };
    },

    setActiveRound: (id) => set({ activeRoundId: id }),

    // Fetch all athletes for current league
    fetchAthletes: async () => {
        const { currentLeagueId, isValidUUID } = get();
        if (!isValidUUID(currentLeagueId)) return;

        set({ loading: true });
        try {
            const { data, error } = await supabase
                .from('athletes')
                .select(`
                  *,
                  teams (
                    id,
                    name
                  )
                `)
                .eq('league_id', currentLeagueId)
                .order('name');

            if (error) set({ error: error.message, loading: false });
            else set({ athletes: data || [], loading: false });
        } catch (err) {
            set({ error: err.message, loading: false });
        }
    },

    // Add a new team to current league
    addTeam: async (payload) => {
        const { currentLeagueId } = get();
        if (!currentLeagueId) return { error: "No league selected" };

        set({ loading: true });
        const finalPayload = { ...payload, league_id: currentLeagueId };
        const { data, error } = await supabase
            .from('teams')
            .insert([finalPayload])
            .select();

        if (!error && data) {
            set((state) => ({
                teams: [...state.teams, data[0]].sort((a, b) => a.name.localeCompare(b.name)),
                loading: false
            }));
        } else {
            set({ error: error?.message, loading: false });
        }
        return { data, error };
    },

    // Add a new athlete to current league
    addAthlete: async (athlete) => {
        const { currentLeagueId } = get();
        if (!currentLeagueId) return { error: "No league selected" };

        set({ loading: true });
        const finalAthlete = { ...athlete, league_id: currentLeagueId };
        const { data, error } = await supabase
            .from('athletes')
            .insert([finalAthlete])
            .select();

        if (!error) {
            await get().fetchAthletes();
        } else {
            set({ error: error.message, loading: false });
        }
        return { data, error };
    },

    deleteTeam: async (teamId) => {
        set({ loading: true });
        try {
            const { error } = await supabase
                .from('teams')
                .delete()
                .eq('id', teamId);

            if (error) throw error;
            set(state => ({
                teams: state.teams.filter(t => t.id !== teamId),
                loading: false
            }));
            return { error: null };
        } catch (err) {
            set({ error: err.message, loading: false });
            return { error: err.message };
        }
    },

    updateAthlete: async (athleteId, updates) => {
        set({ loading: true, error: null });
        try {
            const { error } = await supabase
                .from('athletes')
                .update(updates)
                .eq('id', athleteId);

            if (error) throw error;
            await get().fetchAthletes();
            set({ loading: false });
            return { error: null };
        } catch (err) {
            set({ error: err.message, loading: false });
            return { error: err.message };
        }
    },

    updateTeam: async (teamId, name) => {
        set({ loading: true, error: null });
        try {
            const { error } = await supabase
                .from('teams')
                .update({ name })
                .eq('id', teamId);

            if (error) throw error;
            await get().fetchTeams();
            set({ loading: false });
            return { error: null };
        } catch (err) {
            set({ error: err.message, loading: false });
            return { error: err.message };
        }
    },

    deleteAthlete: async (athleteId) => {
        set({ loading: true });
        try {
            const { error } = await supabase
                .from('athletes')
                .delete()
                .eq('id', athleteId);

            if (error) throw error;
            set(state => ({
                athletes: state.athletes.filter(a => a.id !== athleteId),
                loading: false
            }));
            return { error: null };
        } catch (err) {
            set({ error: err.message, loading: false });
            return { error: err.message };
        }
    },

    // Fetch feed for current league and round
    fetchFeed: async () => {
        const { currentLeagueId, activeRoundId } = get();
        if (!currentLeagueId) return;

        try {
            let query = supabase
                .from('match_stats')
                .select(`
                    *,
                    athletes (
                        name,
                        pos
                    )
                `, { count: 'exact' })
                .eq('league_id', currentLeagueId)
                .order('created_at', { ascending: false });

            if (activeRoundId) {
                query = query.eq('round_id', activeRoundId);
            }

            const { data, error } = await query.limit(10);

            if (!error) set({ feed: data || [] });
        } catch (err) {
            console.error("Feed error:", err);
        }
    },

    // Update stats/points with league context
    saveStats: async (stats) => {
        const { currentLeagueId, activeRoundId } = get();
        if (!currentLeagueId) return { error: "No league selected" };

        set({ loading: true });
        const payload = { ...stats, round_id: activeRoundId, league_id: currentLeagueId };

        const { data, error } = await supabase
            .from('match_stats')
            .upsert([payload])
            .select();

        if (!error) {
            await get().fetchFeed();
            get().setNotification({ message: 'Pontuação salva!', type: 'success' });
        } else {
            get().setNotification({ message: 'Erro ao salvar: ' + error.message, type: 'error' });
        }
        set({ loading: false });
        return { data, error };
    },

    // --- GAME LOOP FUNCTIONS (SENIOR VERSION) ---

    // Dynamic Valuation Engine (Market Value Engine)
    // Regra: Preço oscila com base na performance relativa às últimas 3 rodadas
    runMarketValuation: async (leagueId, finishedRoundId) => {
        set({ loading: true });
        try {
            // 1. Buscar média de pontos dos atletas nas últimas 3 rodadas
            const { data: stats, error: sError } = await supabase
                .from('match_stats')
                .select('athlete_id, points')
                .eq('league_id', leagueId)
                .neq('round_id', finishedRoundId) // Ver anteriores
                .order('created_at', { ascending: false });

            if (sError) throw sError;

            // 2. Buscar pontos da rodada atual
            const { data: currentStats, error: csError } = await supabase
                .from('match_stats')
                .select('athlete_id, points')
                .eq('round_id', finishedRoundId);

            if (csError) throw csError;

            // 3. Atualizar preços
            for (const s of currentStats) {
                const history = stats.filter(h => h.athlete_id === s.athlete_id).slice(0, 3);
                const avg = history.length > 0 
                    ? history.reduce((acc, curr) => acc + curr.points, 0) / history.length 
                    : 3.0; // Média básica para novatos

                const performance = s.points - avg;
                let priceChange = performance * 0.1; // Fator de sensibilidade (10%)
                
                // Limitar variação brusca
                priceChange = Math.max(-2, Math.min(2, priceChange));

                const { data: athlete } = await supabase.from('athletes').select('price').eq('id', s.athlete_id).single();
                if (athlete) {
                    const newPrice = Math.max(1.0, parseFloat(athlete.price) + priceChange);
                    await supabase.from('athletes').update({ price: parseFloat(newPrice.toFixed(2)) }).eq('id', s.athlete_id);
                }
            }

            get().setNotification({ message: 'Mercado valorizado com sucesso!', type: 'success' });
        } catch (err) {
            console.error('Valuation Error:', err);
            get().setNotification({ message: 'Erro na valorização', type: 'error' });
        } finally {
            set({ loading: false });
        }
    },

    // Update round status (open/locked)
    updateRoundStatus: async (roundId, status) => {
        set({ loading: true });
        const { error } = await supabase.from('rounds').update({ status }).eq('id', roundId);
        if (!error) {
            set(state => ({ rounds: state.rounds.map(r => r.id === roundId ? { ...r, status } : r) }));
            get().setNotification({ message: `Mercado ${status === 'open' ? 'Aberto' : 'Fechado'}`, type: 'success' });
        }
        set({ loading: false });
        return { error };
    },

    finishRound: async (roundId) => {
        set({ loading: true });
        const { currentLeagueId } = get();
        const { error } = await supabase.from('rounds').update({ status: 'finished' }).eq('id', roundId);
        if (!error) {
            await get().runMarketValuation(currentLeagueId, roundId);
            set(state => ({ rounds: state.rounds.map(r => r.id === roundId ? { ...r, status: 'finished' } : r) }));
        }
        set({ loading: false });
        return { error };
    },

    startNextRound: async (leagueId) => {
        set({ loading: true });
        const { rounds } = get();
        const nextNum = rounds.filter(r => r.league_id === leagueId).length + 1;
        const { data, error } = await supabase.from('rounds').insert([{ league_id: leagueId, number: nextNum, status: 'open' }]).select().single();
        if (!error && data) set({ rounds: [...rounds, data], activeRoundId: data.id });
        set({ loading: false });
        return { data, error };
    }
}));
