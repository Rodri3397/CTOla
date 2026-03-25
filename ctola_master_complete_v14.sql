-- 🏎️ CTOlá - SQL MESTRE FINAL V14 (CONSOLIDADO + MANAGEMENT PASSWORD)
-- Use este script no Editor SQL da Supabase (https://supabase.com/dashboard/project/_/sql)

-- 1. PREPARAÇÃO E EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ESTRUTURA DE TABELAS (IDEMPOTENTE)

-- Perfis de Usuário
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'USER',
    wallet DECIMAL(10,2) DEFAULT 100.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Corrigindo colunas em tabelas existentes
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet DECIMAL(10,2) DEFAULT 100.00;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'USER';

-- Ligas de Fantasia
CREATE TABLE IF NOT EXISTS leagues (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id UUID REFERENCES profiles(id),
    invite_code TEXT UNIQUE NOT NULL,
    management_password TEXT, -- Senha mestre da liga
    is_public BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE leagues ADD COLUMN IF NOT EXISTS management_password TEXT;

-- Membros das Ligas
CREATE TABLE IF NOT EXISTS league_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    team_name TEXT,
    role TEXT DEFAULT 'MEMBER',
    admin_code TEXT,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(league_id, user_id)
);

-- Times do Mundo Real (Futsal)
CREATE TABLE IF NOT EXISTS teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Atletas do Mundo Real
CREATE TABLE IF NOT EXISTS athletes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    pos TEXT NOT NULL, -- GOLEIRO, FIXO, ALA, PIVO
    price DECIMAL(10,2) DEFAULT 10.00,
    status TEXT DEFAULT 'PROVAVEL',
    photo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rodadas (Rounds)
CREATE TABLE IF NOT EXISTS rounds (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    status TEXT DEFAULT 'open', -- open, locked, finished
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(league_id, number)
);

-- Estatísticas de Partida (Scouts)
CREATE TABLE IF NOT EXISTS match_stats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    athlete_id UUID REFERENCES athletes(id) ON DELETE CASCADE,
    round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    gols INTEGER DEFAULT 0,
    assistencias INTEGER DEFAULT 0,
    finalizacoes_defendidas INTEGER DEFAULT 0,
    desarmes INTEGER DEFAULT 0,
    gols_goleiro_linha INTEGER DEFAULT 0,
    cartao_amarelo INTEGER DEFAULT 0,
    cartao_vermelho INTEGER DEFAULT 0,
    gol_contra INTEGER DEFAULT 0,
    faltas_cometidas INTEGER DEFAULT 0,
    gols_sofridos INTEGER DEFAULT 0,
    equipe_sofreu_gol BOOLEAN DEFAULT false,
    penaltis_defendidos INTEGER DEFAULT 0,
    participou BOOLEAN DEFAULT true,
    points DECIMAL(10,1) DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(athlete_id, round_id)
);

-- Escalações dos Usuários
CREATE TABLE IF NOT EXISTS user_squads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
    squad_data JSONB NOT NULL,
    captain_id TEXT,
    points DECIMAL(10,1) DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, league_id, round_id)
);

-- 3. SEGURANÇA (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_squads ENABLE ROW LEVEL SECURITY;

-- Limpeza de Políticas
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Recriação das Políticas
CREATE POLICY "Leitura Pública Geral" ON profiles FOR SELECT USING (true);
CREATE POLICY "Leitura Pública Geral" ON leagues FOR SELECT USING (true);
CREATE POLICY "Leitura Pública Geral" ON league_members FOR SELECT USING (true);
CREATE POLICY "Leitura Pública Geral" ON teams FOR SELECT USING (true);
CREATE POLICY "Leitura Pública Geral" ON athletes FOR SELECT USING (true);
CREATE POLICY "Leitura Pública Geral" ON rounds FOR SELECT USING (true);
CREATE POLICY "Leitura Pública Geral" ON match_stats FOR SELECT USING (true);
CREATE POLICY "Leitura Pública Geral" ON user_squads FOR SELECT USING (true);

CREATE POLICY "Update Próprio Perfil" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Manage Própria Escalação" ON user_squads FOR ALL USING (auth.uid() = user_id);

-- Gerenciamento de Membros (apenas dono da liga ou o próprio usuário)
CREATE POLICY "Dono Gerencia Membros" ON league_members FOR ALL 
USING (
    EXISTS (SELECT 1 FROM leagues WHERE leagues.id = league_id AND leagues.owner_id = auth.uid())
    OR auth.uid() = user_id
);

-- 4. VIEW DE RANKING
CREATE OR REPLACE VIEW leaderboard_view AS
SELECT 
    lm.league_id,
    p.id as user_id,
    p.name as user_name,
    lm.team_name,
    p.avatar_url,
    COALESCE(SUM(us.points), 0) as total_points,
    COUNT(us.id) as rounds_played
FROM league_members lm
JOIN profiles p ON lm.user_id = p.id
LEFT JOIN user_squads us ON us.user_id = p.id AND us.league_id = lm.league_id
GROUP BY lm.league_id, p.id, p.name, lm.team_name, p.avatar_url
ORDER BY total_points DESC;

-- 5. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_stats_athlete_round ON match_stats(athlete_id, round_id);
CREATE INDEX IF NOT EXISTS idx_squads_user_league_round ON user_squads(user_id, league_id, round_id);

-- 6. RELOAD SCHEMA
NOTIFY pgrst, 'reload schema';
