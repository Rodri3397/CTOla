import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { calculateScore } from '../utils/scoring';

export const useStore = create((set, get) => ({
    teams: [],
    athletes: [],
    rounds: [],
    activeRoundId: localStorage.getItem('ctola_active_round_id') || null,
    currentLeagueId: (() => {
        const id = localStorage.getItem('ctola_league_id');
        return (id && id !== 'null' && id !== 'undefined') ? id : null;
    })(),
    leagues: [],
    myLeagues: [],
    isValidUUID: (id) => id && id.length > 30 && id !== 'null' && id !== 'undefined',
    myFollowedLeagues: [],
    myFollowedLeaguesDetails: [],
    draftSquad: JSON.parse(localStorage.getItem('ctola_draft_squad') || '{"goleiro":null,"fixo":null,"ala1":null,"ala2":null,"pivo1":null,"pivo2":null}'),
    draftCaptainId: localStorage.getItem('ctola_draft_captain') || null,
    wallet: 100.0, // Default wallet value if profile not loaded
    leagueMembers: [], // Members of the currently active league for management
    feed: [],
    loading: false,
    notification: null, 
    supabase,
    
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
        get().clearDraftSquad();
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

            // Optionally fetch joined leagues if user is logged in
            get().fetchMyLeagues();
        } catch (err) {
            console.error('Fetch leagues error:', err);
            set({ error: err.message, loading: false });
        }
    },

    fetchMyLeagues: async () => {
        const { user } = get();
        if (!user) return;

        set({ loading: true });
        try {
            const { data: memberData, error: mError } = await supabase
                .from('league_members')
                .select(`
                    league_id,
                    role,
                    team_name,
                    admin_code,
                    leagues (*)
                `)
                .eq('user_id', user.id);

            if (mError) throw mError;

            const fetchedLeagues = memberData?.map(m => ({
                ...m.leagues,
                role: m.role,
                user_role: m.role,
                team_name: m.team_name,
                admin_code: m.admin_code
            })) || [];

            set({ 
                myLeagues: fetchedLeagues, 
                myFollowedLeagues: fetchedLeagues.map(l => l.id),
                myFollowedLeaguesDetails: fetchedLeagues,
                loading: false 
            });

            // FIXED: Validate currentLeagueId against fetched results to prevent "Ghost Leagues"
            const { currentLeagueId } = get();
            if (currentLeagueId) {
                const stillExists = fetchedLeagues.some(l => l.id === currentLeagueId);
                if (!stillExists) {
                    console.warn("Current league no longer exists/joined. Clearing stale session.");
                    set({ currentLeagueId: null });
                    localStorage.removeItem('ctola_league_id');
                }
            }

            // Auto-select first league only if absolutely none active
            if (!get().currentLeagueId && fetchedLeagues.length > 0) {
                const firstId = fetchedLeagues[0].id;
                set({ currentLeagueId: firstId });
                localStorage.setItem('ctola_league_id', firstId);
                get().fetchTeams();
                get().fetchAthletes();
                get().fetchRounds();
                get().fetchFeed();
            }
        } catch (err) {
            console.error('Error in fetchMyLeagues:', err);
            set({ error: err.message, loading: false });
        }
    },

    createLeague: async (name, isPublic = true, managementPassword = '') => {
        const { user } = get();
        if (!user) return { error: 'Not authenticated' };

        set({ loading: true, error: null });
        try {
            const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const { data, error: lError } = await supabase
                .from('leagues')
                .insert([{
                    name,
                    owner_id: user.id,
                    is_public: isPublic,
                    invite_code: inviteCode,
                    management_password: managementPassword
                }])
                .select();

            if (lError) throw lError;

            if (data && data[0]) {
                // FIXED: Also save the admin_code to the league_members for instant owner auth
                const { error: mError } = await supabase.from('league_members').insert({
                    league_id: data[0].id,
                    user_id: user.id,
                    role: 'OWNER',
                    admin_code: managementPassword
                });

                if (mError) throw mError;

                // Select the new league immediately
                set({ 
                    currentLeagueId: data[0].id,
                    loading: false 
                });
                localStorage.setItem('ctola_league_id', data[0].id);
                
                // FIXED: Automatically start Round 1 as 'open'
                await get().startNextRound(data[0].id);
                
                // Refresh full state
                await get().fetchMyLeagues();
                return { data, error: null };
            }

            set({ loading: false });
            return { error: 'Falha ao criar liga' };
        } catch (err) {
            console.error('Create league error:', err);
            const msg = err.code === '23505' ? 'Já existe uma liga com este código ou nome.' : err.message;
            set({ error: msg, loading: false });
            return { error: msg };
        }
    },

    removeFromDraftSquad: (athlete) => {
        set(state => {
            const newDraftSquad = { ...state.draftSquad };
            const slot = Object.keys(newDraftSquad).find(k => String(newDraftSquad[k]) === String(athlete.id));
            if (slot) {
                newDraftSquad[slot] = null;
            }
            
            let newCaptainId = state.draftCaptainId;
            if (String(state.draftCaptainId) === String(athlete.id)) {
                newCaptainId = null;
            }

            return { 
                draftSquad: newDraftSquad,
                draftCaptainId: newCaptainId
            };
        });
    },

    promoteToAdmin: async (leagueId, userId) => {
        set({ loading: true });
        try {
            const { error } = await supabase
                .from('league_members')
                .update({ role: 'ADMIN' })
                .match({ league_id: leagueId, user_id: userId });

            if (error) throw error;
            
            set({ notification: { message: 'Membro promovido a ADMIN!', type: 'success' } });
            get().fetchLeagueData(); // Refresh league members
        } catch (err) {
            console.error('Error in promoteToAdmin:', err);
            set({ notification: { message: 'Erro ao promover membro', type: 'error' } });
        } finally {
            set({ loading: false });
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
            await get().fetchMyLeagues();
            
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
            
            await get().fetchMyLeagues();
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

            if (!error && data) {
                set({ profile: data, wallet: data.wallet });
                return { data, error: null };
            }

            // AUTO-REPAIR: If profile missing but user is authenticated, try to create it
            const { user } = get();
            if (user && user.id === userId) {
                console.log("Repairing missing profile for authenticated user...");
                const { data: newData, error: pError } = await supabase
                    .from('profiles')
                    .insert([{ 
                        id: userId, 
                        name: user.user_metadata?.full_name || user.email.split('@')[0], 
                        role: 'USER' 
                    }])
                    .select()
                    .single();

                if (!pError) {
                    set({ profile: newData, wallet: newData.wallet });
                    return { data: newData, error: null };
                }
            }

            return { data: null, error };
        } catch (err) {
            console.error("Profile fetch error:", err);
            return { error: err.message };
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
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: name } }
            });

            if (error) throw error;

            if (data.user) {
                // Ensure profile is created immediately
                await supabase
                    .from('profiles')
                    .insert([{ id: data.user.id, name, role: 'USER' }]);

                set({ user: data.user, loading: false });
                await get().fetchProfile(data.user.id);
            }
            return { data, error: null };
        } catch (err) {
            console.error("SignUp error:", err);
            set({ error: err.message, loading: false });
            return { error: err.message };
        }
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
        if (athlete.pos === 'GOLEIRO') {
            if (!draftSquad.goleiro) slot = 'goleiro';
        } else if (athlete.pos === 'FIXO') {
            if (!draftSquad.fixo) slot = 'fixo';
            else if (!draftSquad.pivo2) slot = 'pivo2';
        } else if (athlete.pos === 'ALA') {
            if (!draftSquad.ala1) slot = 'ala1';
            else if (!draftSquad.ala2) slot = 'ala2';
            else if (!draftSquad.pivo2) slot = 'pivo2';
        } else if (athlete.pos === 'PIVO') {
            if (!draftSquad.pivo1) slot = 'pivo1';
            else if (!draftSquad.pivo2) slot = 'pivo2';
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
            // 1. Fetch squads for this league
            const { data: squads, error: sError } = await supabase
                .from('user_squads')
                .select('*')
                .eq('league_id', currentLeagueId);

            if (sError) throw sError;

            // 2. Fetch league members to get team_name
            const { data: members, error: mError } = await supabase
                .from('league_members')
                .select('user_id, team_name, role')
                .eq('league_id', currentLeagueId);

            // 3. Fetch profiles for basic info (avatar/real name fallback)
            const userIds = [...new Set(squads.map(s => s.user_id))];
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, name, avatar_url')
                .in('id', userIds);

            // Merge everything
            const enrichedSquads = squads.map(s => {
                const member = members?.find(m => m.user_id === s.user_id);
                const profile = profiles?.find(p => p.id === s.user_id);
                return {
                    ...s,
                    team_name: member?.team_name || profile?.name || 'Time sem Nome',
                    profiles: profile
                };
            });

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

            // Default logic for active round selection
            const currentRounds = get().rounds;
            if (currentRounds.length > 0) {
                const storedRoundId = localStorage.getItem('ctola_active_round_id');
                const currentRound = currentRounds.find(r => r.id === storedRoundId);
                
                // ONLY auto-select if no round is stored OR stored round doesn't belong to this league
                if (!currentRound) {
                    const newestActive = [...currentRounds].reverse().find(r => r.status !== 'finished');
                    const targetRoundId = newestActive ? newestActive.id : currentRounds[currentRounds.length - 1].id;
                    set({ activeRoundId: targetRoundId });
                    localStorage.setItem('ctola_active_round_id', targetRoundId);
                }
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
            localStorage.setItem('ctola_active_round_id', data[0].id);
        }
        return { data, error };
    },

    setActiveRound: (id) => {
        set({ activeRoundId: id });
        if (id) {
            localStorage.setItem('ctola_active_round_id', id);
        } else {
            localStorage.removeItem('ctola_active_round_id');
        }
        get().clearDraftSquad();
    },

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
            else {
                // Fetch last scores for athletes
                const athleteIds = data?.map(a => a.id) || [];
                let enrichedAthletes = data || [];
                
                if (athleteIds.length > 0) {
                    const { data: statsData } = await supabase
                        .from('match_stats')
                        .select('athlete_id, points')
                        .in('athlete_id', athleteIds)
                        .order('created_at', { ascending: false });

                    if (statsData) {
                        enrichedAthletes = enrichedAthletes.map(athlete => {
                            const latestStat = statsData.find(s => s.athlete_id === athlete.id);
                            return { ...athlete, last_score: latestStat ? latestStat.points : 0 };
                        });
                    }
                }
                
                set({ athletes: enrichedAthletes, loading: false });
            }
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
        const { currentLeagueId, activeRoundId, athletes } = get();
        if (!currentLeagueId) return { error: "No league selected" };

        set({ loading: true });
        
        // Find the athlete's position to calculate points correctly
        const athlete = athletes.find(a => a.id === stats.athlete_id);
        const position = athlete ? athlete.pos : 'ALA';
        
        const finalPoints = calculateScore(stats, position, false); // False for not a captain in this context (it's base data)
        const payload = { ...stats, points: finalPoints, round_id: activeRoundId, league_id: currentLeagueId };

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
            return { error: null };
        } catch (err) {
            console.error('Valuation Error:', err);
            get().setNotification({ message: 'Erro na valorização: ' + err.message, type: 'error' });
            return { error: err.message };
        } finally {
            set({ loading: false });
        }
    },

    // Update round status (open/locked)
    updateRoundStatus: async (roundId, status) => {
        set({ loading: true });
        try {
            const { error } = await supabase.from('rounds').update({ status }).eq('id', roundId);
            if (!error) {
                set(state => ({ rounds: state.rounds.map(r => r.id === roundId ? { ...r, status } : r) }));
                get().setNotification({ message: `Mercado ${status === 'open' ? 'Aberto' : 'Fechado'}`, type: 'success' });
            }
            return { error };
        } finally {
            set({ loading: false });
        }
    },

    finishRound: async (roundId) => {
        set({ loading: true });
        try {
            const { currentLeagueId } = get();
            const { error } = await supabase.from('rounds').update({ status: 'finished' }).eq('id', roundId);
            if (!error) {
                const vRes = await get().runMarketValuation(currentLeagueId, roundId);
                if (vRes?.error) {
                    console.error('Valuation failed during finishRound, but round marked as finished.');
                }
                set(state => ({ 
                    rounds: state.rounds.map(r => r.id === roundId ? { ...r, status: 'finished' } : r) 
                }));
            }
            return { error };
        } finally {
            set({ loading: false });
        }
    },

    startNextRound: async (leagueId) => {
        set({ loading: true });
        try {
            const { rounds } = get();
            const nextNum = rounds.filter(r => r.league_id === leagueId).length + 1;
            const { data, error } = await supabase.from('rounds').insert([{ league_id: leagueId, number: nextNum, status: 'open' }]).select().single();
            if (!error && data) {
                set({ rounds: [...rounds, data], activeRoundId: data.id });
                localStorage.setItem('ctola_active_round_id', data.id);
            }
            return { data, error };
        } finally {
            set({ loading: false });
        }
    }
}));
