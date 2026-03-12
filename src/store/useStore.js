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
    myFollowedLeagues: [],
    myFollowedLeaguesDetails: [],
    draftSquad: JSON.parse(localStorage.getItem('ctola_draft_squad') || '{}'),
    draftCaptainId: localStorage.getItem('ctola_draft_captain') || null,
    leagueMembers: [], // Members of the currently active league for management
    feed: [],
    loading: false,
    error: null,
    user: null,
    profile: null,
    supabase: supabase,

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
                myFollowedLeaguesDetails: data?.map(d => ({ ...d.leagues, role: d.role })) || []
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
                    leagues (*)
                `)
                .eq('user_id', user.id)
                .in('role', ['OWNER', 'ADMIN']);

            if (mError) throw mError;

            const leagues = memberData?.map(m => ({
                ...m.leagues,
                user_role: m.role
            })) || [];

            set({ myLeagues: leagues, loading: false });

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

    createLeague: async (name, isPublic = true) => {
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
                    role: 'OWNER'
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

    updateMemberRole: async (leagueId, userId, newRole) => {
        set({ loading: true });
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
            set({ loading: false });
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
            set(state => ({
                myFollowedLeagues: [...state.myFollowedLeagues, leagueId]
            }));
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

            set(state => ({
                myFollowedLeagues: [...state.myFollowedLeagues, league.id]
            }));

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
            return { data, error: null };
        } catch (err) {
            console.error('Error saving squad:', err);
            set({ error: err.message, loading: false });
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

            if (pError) console.warn('Profiles fetch failed:', pError);

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
        const { currentLeagueId } = get();
        if (!currentLeagueId || currentLeagueId === 'null') return;

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
        const { currentLeagueId } = get();
        if (!currentLeagueId || currentLeagueId === 'null') return;

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
        const { currentLeagueId } = get();
        if (!currentLeagueId || currentLeagueId === 'null') return;

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
                `)
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
        }
        set({ loading: false });
        return { data, error };
    },

    // --- GAME LOOP FUNCTIONS ---

    // Update round status (open/locked)
    updateRoundStatus: async (roundId, status) => {
        set({ loading: true });
        const { error } = await supabase
            .from('rounds')
            .update({ status })
            .eq('id', roundId);

        if (!error) {
            const { rounds } = get();
            set({
                rounds: rounds.map(r => r.id === roundId ? { ...r, status } : r),
                loading: false
            });
        } else {
            set({ error: error.message, loading: false });
        }
        return { error };
    },

    // Finalize current round and mark as active
    finishRound: async (roundId) => {
        set({ loading: true });
        const { error } = await supabase
            .from('rounds')
            .update({ status: 'finished' })
            .eq('id', roundId);

        if (!error) {
            const { rounds } = get();
            set({
                rounds: rounds.map(r => r.id === roundId ? { ...r, status: 'finished' } : r),
                loading: false
            });
        } else {
            set({ error: error.message, loading: false });
        }
        return { error };
    },

    // Create a new round for the league
    startNextRound: async (leagueId) => {
        set({ loading: true });
        const { rounds } = get();
        const leagueRounds = rounds.filter(r => r.league_id === leagueId);
        const nextNumber = leagueRounds.length > 0 ? Math.max(...leagueRounds.map(r => r.number)) + 1 : 1;

        const { data, error } = await supabase
            .from('rounds')
            .insert([{
                league_id: leagueId,
                number: nextNumber,
                status: 'open'
            }])
            .select()
            .single();

        if (!error && data) {
            set({
                rounds: [...rounds, data],
                activeRoundId: data.id,
                loading: false
            });
        } else {
            set({ error: error?.message || "Erro ao criar rodada", loading: false });
        }
        return { data, error };
    }
}));
