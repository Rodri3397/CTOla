-- 🏁 CTOlá - SQL MESTRE ESTÁVEL V14 (PRODUÇÃO)
-- Este script configura toda a estrutura do banco de dados de forma consolidada.
-- Execute no Editor SQL da Supabase: https://supabase.com/dashboard/project/_/sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. ESTRUTURA DE TABELAS
-- ==========================================

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

-- Ligas de Fantasia
CREATE TABLE IF NOT EXISTS leagues (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    invite_code TEXT UNIQUE NOT NULL,
    management_password TEXT, 
    is_public BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Times Reais (Internos da Liga)
CREATE TABLE IF NOT EXISTS teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Atletas
CREATE TABLE IF NOT EXISTS athletes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    pos TEXT NOT NULL, 
    price DECIMAL(10,2) DEFAULT 10.00,
    status TEXT DEFAULT 'PROVAVEL',
    photo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rodadas
CREATE TABLE IF NOT EXISTS rounds (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    status TEXT DEFAULT 'open', 
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(league_id, number)
);

-- Estatísticas (Scouts)
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

-- Escalações (User Squads)
CREATE TABLE IF NOT EXISTS user_squads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
    squad_data JSONB NOT NULL,
    captain_id UUID,
    points DECIMAL(10,1) DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, league_id, round_id)
);

-- ==========================================
-- 2. POLÍTICAS DE SEGURANÇA (RLS)
-- ==========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_squads ENABLE ROW LEVEL SECURITY;

-- Polícias de Leitura (Geral - IF NOT EXISTS)
-- Nota: O Supabase prefere DROP + CREATE para garantir atualização
DROP POLICY IF EXISTS "Leitura Pública Profiles" ON profiles;
CREATE POLICY "Leitura Pública Profiles" ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Leitura Pública Leagues" ON leagues;
CREATE POLICY "Leitura Pública Leagues" ON leagues FOR SELECT USING (true);
DROP POLICY IF EXISTS "Leitura Pública Members" ON league_members;
CREATE POLICY "Leitura Pública Members" ON league_members FOR SELECT USING (true);
DROP POLICY IF EXISTS "Leitura Pública Teams" ON teams;
CREATE POLICY "Leitura Pública Teams" ON teams FOR SELECT USING (true);
DROP POLICY IF EXISTS "Leitura Pública Athletes" ON athletes;
CREATE POLICY "Leitura Pública Athletes" ON athletes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Leitura Pública Rounds" ON rounds;
CREATE POLICY "Leitura Pública Rounds" ON rounds FOR SELECT USING (true);
DROP POLICY IF EXISTS "Leitura Pública MatchStats" ON match_stats;
CREATE POLICY "Leitura Pública MatchStats" ON match_stats FOR SELECT USING (true);
DROP POLICY IF EXISTS "Leitura Pública Squads" ON user_squads;
CREATE POLICY "Leitura Pública Squads" ON user_squads FOR SELECT USING (true);

-- Políticas de Escrita/Gestão (Dono da Liga)
-- Ligas
DROP POLICY IF EXISTS "Admin Gerencia Liga" ON leagues;
CREATE POLICY "Admin Gerencia Liga" ON leagues FOR ALL USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Publico Cria Liga" ON leagues;
CREATE POLICY "Publico Cria Liga" ON leagues FOR INSERT WITH CHECK (true);

-- Rodadas
DROP POLICY IF EXISTS "Admin Gerencia Rodadas" ON rounds;
CREATE POLICY "Admin Gerencia Rodadas" ON rounds FOR ALL 
USING (EXISTS (SELECT 1 FROM leagues WHERE id = rounds.league_id AND owner_id = auth.uid()));

-- Times
DROP POLICY IF EXISTS "Admin Gerencia Times" ON teams;
CREATE POLICY "Admin Gerencia Times" ON teams FOR ALL 
USING (EXISTS (SELECT 1 FROM leagues WHERE id = teams.league_id AND owner_id = auth.uid()));

-- Atletas
DROP POLICY IF EXISTS "Admin Gerencia Atletas" ON athletes;
CREATE POLICY "Admin Gerencia Atletas" ON athletes FOR ALL 
USING (EXISTS (SELECT 1 FROM leagues WHERE id = athletes.league_id AND owner_id = auth.uid()));

-- Scouts (Match Stats)
DROP POLICY IF EXISTS "Admin Gerencia Scouts" ON match_stats;
CREATE POLICY "Admin Gerencia Scouts" ON match_stats FOR ALL 
USING (EXISTS (SELECT 1 FROM leagues WHERE id = match_stats.league_id AND owner_id = auth.uid()));

-- Políticas de Usuário (Membros)
DROP POLICY IF EXISTS "User Gerencia Perfil" ON profiles;
CREATE POLICY "User Gerencia Perfil" ON profiles FOR ALL USING (auth.uid() = id);
DROP POLICY IF EXISTS "User Publico Insere" ON profiles;
CREATE POLICY "User Publico Insere" ON profiles FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "User Gerencia Membro" ON league_members;
CREATE POLICY "User Gerencia Membro" ON league_members FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Publico Insere Membro" ON league_members;
CREATE POLICY "Publico Insere Membro" ON league_members FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "User Gerencia Squad" ON user_squads;
CREATE POLICY "User Gerencia Squad" ON user_squads FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 3. VIEWS E UTILITÁRIOS
-- ==========================================

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

-- Atualizar Cache
NOTIFY pgrst, 'reload schema';
