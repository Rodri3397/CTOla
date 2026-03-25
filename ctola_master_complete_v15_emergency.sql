-- 🏎️ CTOlá - SQL MESTRE FINAL V15 (EMERGENCY FIXES)
-- Resolve 403 Forbidden on Profile Creation and 400 Bad Request on match_stats.created_at

-- 1. ADICIONAR COLUNAS FALTANTES (Para usuários que já tinham tabelas antigas)
ALTER TABLE match_stats ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet DECIMAL(10,2) DEFAULT 100.00;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'USER';
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS management_password TEXT;

-- 2. CORREÇÃO DE RLS (Profiles)
-- Habilita inserção de perfil pelo próprio usuário (Essencial para Sign Up)
DROP POLICY IF EXISTS "Inserção Próprio Perfil" ON profiles;
CREATE POLICY "Inserção Próprio Perfil" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Garante que todos podem ver perfis (para ranking e followed leagues)
DROP POLICY IF EXISTS "Leitura Pública Geral" ON profiles;
CREATE POLICY "Leitura Pública Geral" ON profiles FOR SELECT USING (true);

-- 3. GARANTIA DE INTEGRIDADE EM MATCH_STATS
-- Se a tabela existia sem a constraint UNIQUE, vamos garantir
ALTER TABLE match_stats DROP CONSTRAINT IF EXISTS match_stats_athlete_id_round_id_key;
ALTER TABLE match_stats ADD CONSTRAINT match_stats_athlete_id_round_id_key UNIQUE (athlete_id, round_id);

-- 4. RELOAD SCHEMA
NOTIFY pgrst, 'reload schema';
