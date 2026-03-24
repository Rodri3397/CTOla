-- 🏁 CTOlá - SQL MESTRE FINAL (REVISADO E CORRIGIDO)
-- Este script configura toda a estrutura do banco de dados de forma limpa.
-- Execute no Editor SQL da Supabase: https://supabase.com/dashboard/project/_/sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Perfis de Usuário
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

-- 2. Ligas de Fantasia (Agora com CASCADE no dono)
CREATE TABLE IF NOT EXISTS leagues (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    invite_code TEXT UNIQUE NOT NULL,
    management_password TEXT, -- Senha master da liga
    is_public BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Membros das Ligas
CREATE TABLE IF NOT EXISTS league_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    team_name TEXT,
    role TEXT DEFAULT 'MEMBER', -- 'OWNER', 'ADMIN', 'MEMBER'
    admin_code TEXT, -- Senha individual de admin
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(league_id, user_id)
);

-- 4. Times e Atletas do Mundo Real
CREATE TABLE IF NOT EXISTS teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- 5. Rodadas (Rounds) e Estatísticas (Scouts)
CREATE TABLE IF NOT EXISTS rounds (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    status TEXT DEFAULT 'open', -- open, locked, finished
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(league_id, number)
);

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

-- 6. Escalações (Squads)
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

-- 8. POLÍTICAS DE SEGURANÇA (RLS) - O PONTO CHAVE CORRIGIDO
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_squads ENABLE ROW LEVEL SECURITY;

-- Limpeza de políticas para evitar duplicidade
DROP POLICY IF EXISTS "Leitura Pública" ON profiles;
DROP POLICY IF EXISTS "Leitura Pública" ON leagues;
DROP POLICY IF EXISTS "Leitura Pública" ON league_members;
DROP POLICY IF EXISTS "Leitura Pública" ON teams;
DROP POLICY IF EXISTS "Leitura Pública" ON athletes;
DROP POLICY IF EXISTS "Leitura Pública" ON rounds;
DROP POLICY IF EXISTS "Leitura Pública" ON match_stats;
DROP POLICY IF EXISTS "Leitura Pública" ON user_squads;

-- Políticas de Leitura (Geral)
CREATE POLICY "Leitura Pública" ON profiles FOR SELECT USING (true);
CREATE POLICY "Leitura Pública" ON leagues FOR SELECT USING (true);
CREATE POLICY "Leitura Pública" ON league_members FOR SELECT USING (true);
CREATE POLICY "Leitura Pública" ON teams FOR SELECT USING (true);
CREATE POLICY "Leitura Pública" ON athletes FOR SELECT USING (true);
CREATE POLICY "Leitura Pública" ON rounds FOR SELECT USING (true);
CREATE POLICY "Leitura Pública" ON match_stats FOR SELECT USING (true);
CREATE POLICY "Leitura Pública" ON user_squads FOR SELECT USING (true);

-- Polícias de Escrita (Cadastro e Criação)
-- Perfil: Permite criar (pós-signup) e atualizar o próprio
DROP POLICY IF EXISTS "Criação de Perfil" ON profiles;
CREATE POLICY "Criação de Perfil" ON profiles FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Edit Próprio" ON profiles;
CREATE POLICY "Edit Próprio" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Ligas: Permite criar liga
DROP POLICY IF EXISTS "Dono Gerencia Liga" ON leagues;
CREATE POLICY "Dono Gerencia Liga" ON leagues FOR ALL USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Criação de Liga" ON leagues;
CREATE POLICY "Criação de Liga" ON leagues FOR INSERT WITH CHECK (true);

-- Membros: Permite se inscrever em ligas
DROP POLICY IF EXISTS "Inscrição em Liga" ON league_members;
CREATE POLICY "Inscrição em Liga" ON league_members FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Membro Gerencia Próprio" ON league_members;
CREATE POLICY "Membro Gerencia Próprio" ON league_members FOR ALL USING (auth.uid() = user_id);

-- Escalação: Permite gerenciar própria escalação
DROP POLICY IF EXISTS "User Gerencia Squad" ON user_squads;
CREATE POLICY "User Gerencia Squad" ON user_squads FOR ALL USING (auth.uid() = user_id);

-- 8. VIEW DE RANKING
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

NOTIFY pgrst, 'reload schema';
