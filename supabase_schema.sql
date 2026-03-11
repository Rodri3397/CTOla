-- 🚀 CTOlá - Script de Sincronização Completa com Políticas RLS Corrigidas
-- Este script garante que todas as tabelas, colunas e permissões necessárias existam.

-- 0. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabelas Base (Siga esta ordem de criação) --------------------------

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    role TEXT DEFAULT 'USER',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS leagues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    invite_code TEXT UNIQUE,
    is_public BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS league_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'MEMBER', -- 'OWNER', 'ADMIN', 'MEMBER'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(league_id, user_id)
);

CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS athletes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    pos TEXT NOT NULL DEFAULT 'ALA',
    price DECIMAL(10,2) DEFAULT 5.00,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS user_squads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    squad_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    captain_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, league_id, round_id)
);

CREATE TABLE IF NOT EXISTS match_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    gols INTEGER DEFAULT 0,
    assistencias INTEGER DEFAULT 0,
    penaltisPerdidos INTEGER DEFAULT 0,
    tirosLivresDefendidos INTEGER DEFAULT 0,
    penaltisDefendidos INTEGER DEFAULT 0,
    golsSofridos INTEGER DEFAULT 0,
    melhorGoleiro BOOLEAN DEFAULT false,
    participou BOOLEAN DEFAULT true,
    equipeSofreuGol BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(athlete_id, round_id, league_id)
);

-- 2. Correções de Colunas e Constraint ---------------------------------

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='athletes' AND column_name='pos') THEN
        ALTER TABLE athletes ADD COLUMN pos TEXT NOT NULL DEFAULT 'ALA';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='athletes' AND column_name='price') THEN
        ALTER TABLE athletes ADD COLUMN price DECIMAL(10,2) DEFAULT 5.00;
    END IF;
END $$;

-- 3. Configuração de RLS (Segurança de Linha) --------------------------

-- Habilitar RLS em tudo
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_stats ENABLE ROW LEVEL SECURITY;

-- Excluir políticas existentes para evitar erros de duplicidade
DROP POLICY IF EXISTS "Leitura pública" ON leagues;
DROP POLICY IF EXISTS "Leitura pública" ON profiles;
DROP POLICY IF EXISTS "Leitura pública" ON teams;
DROP POLICY IF EXISTS "Leitura pública" ON athletes;
DROP POLICY IF EXISTS "Leitura pública" ON rounds;
DROP POLICY IF EXISTS "Leitura pública" ON league_members;
DROP POLICY IF EXISTS "Leitura pública" ON match_stats;
DROP POLICY IF EXISTS "Leitura pública" ON user_squads;

-- Criar Novas Políticas de Visualização (SELECT)
CREATE POLICY "Visualização pública de perfis" ON profiles FOR SELECT USING (true);
CREATE POLICY "Visualização pública de ligas" ON leagues FOR SELECT USING (true);
CREATE POLICY "Visualização pública de membros" ON league_members FOR SELECT USING (true);
CREATE POLICY "Visualização pública de times" ON teams FOR SELECT USING (true);
CREATE POLICY "Visualização pública de atletas" ON athletes FOR SELECT USING (true);
CREATE POLICY "Visualização pública de rodadas" ON rounds FOR SELECT USING (true);
CREATE POLICY "Visualização pública de estatísticas" ON match_stats FOR SELECT USING (true);
CREATE POLICY "Visualização pública de escalações" ON user_squads FOR SELECT USING (true);

-- GESTÃO DE DADOS (Times, Atletas, Rodadas, Scouts)
-- Regra: Pode fazer tudo se for OWNER ou ADMIN da liga correspondente

CREATE POLICY "Gestão de times por admins" ON teams 
FOR ALL USING (
    EXISTS (SELECT 1 FROM league_members WHERE league_id = teams.league_id AND user_id = auth.uid() AND role IN ('OWNER', 'ADMIN'))
);

CREATE POLICY "Gestão de atletas por admins" ON athletes 
FOR ALL USING (
    EXISTS (SELECT 1 FROM league_members WHERE league_id = athletes.league_id AND user_id = auth.uid() AND role IN ('OWNER', 'ADMIN'))
);

CREATE POLICY "Gestão de rodadas por admins" ON rounds 
FOR ALL USING (
    EXISTS (SELECT 1 FROM league_members WHERE league_id = rounds.league_id AND user_id = auth.uid() AND role IN ('OWNER', 'ADMIN'))
);

CREATE POLICY "Gestão de scouts por admins" ON match_stats 
FOR ALL USING (
    EXISTS (SELECT 1 FROM league_members WHERE league_id = match_stats.league_id AND user_id = auth.uid() AND role IN ('OWNER', 'ADMIN'))
);

-- Perfil e Escalação Própria
CREATE POLICY "Usuários controlam seus perfis" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Usuários controlam suas escalações" ON user_squads FOR ALL USING (auth.uid() = user_id);

-- Donos de Liga e Membros
CREATE POLICY "Donos gerenciam suas ligas" ON leagues FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Usuários podem se juntar a ligas" ON league_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem sair de ligas" ON league_members FOR DELETE USING (auth.uid() = user_id);
