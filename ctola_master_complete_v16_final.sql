-- 🏎️ CTOlá - SQL MESTRE FINAL V16 (RLS FULL PERSMISSION + SCHEMA SYNC)
-- Resolve 42501 (RLS Violation) e garante integridade das colunas

-- 1. SINCRONIA DE COLUNAS (Garantes)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'USER';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet DECIMAL(10,2) DEFAULT 100.00;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS management_password TEXT;
ALTER TABLE match_stats ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2. REINICIAR POLÍTICAS (Limpeza total para evitar conflitos)
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 3. NOVAS POLÍTICAS DE ACESSO (PERMISSIVAS PARA AUTH USERS)

-- Perfis
CREATE POLICY "Leitura Pública Profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Inserção Próprio Perfil" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Update Próprio Perfil" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Ligas
CREATE POLICY "Leitura Pública Leis" ON leagues FOR SELECT USING (true);
CREATE POLICY "Dono cria liga" ON leagues FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Dono deleta liga" ON leagues FOR DELETE USING (auth.uid() = owner_id);

-- Membros
CREATE POLICY "Leitura Pública Membros" ON league_members FOR SELECT USING (true);
CREATE POLICY "Membro entra na liga" ON league_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Dono gerencia membros" ON league_members FOR ALL USING (
    EXISTS (SELECT 1 FROM leagues WHERE id = league_id AND owner_id = auth.uid())
);

-- Times e Atletas
CREATE POLICY "Leitura Pública TimesAtletas" ON teams FOR SELECT USING (true);
CREATE POLICY "Leitura Pública TimesAtletas" ON athletes FOR SELECT USING (true);
CREATE POLICY "Dono gerencia times/atletas" ON teams FOR ALL USING (
    EXISTS (SELECT 1 FROM leagues WHERE id = league_id AND owner_id = auth.uid())
);
CREATE POLICY "Dono gerencia times/atletas" ON athletes FOR ALL USING (
    EXISTS (SELECT 1 FROM leagues WHERE id = league_id AND owner_id = auth.uid())
);

-- Rodadas e Scouts
CREATE POLICY "Leitura Pública RodadasScouts" ON rounds FOR SELECT USING (true);
CREATE POLICY "Leitura Pública RodadasScouts" ON match_stats FOR SELECT USING (true);
CREATE POLICY "Dono gerencia rodadas" ON rounds FOR ALL USING (
     EXISTS (SELECT 1 FROM leagues WHERE id = league_id AND owner_id = auth.uid())
);
CREATE POLICY "Dono gerencia scouts" ON match_stats FOR ALL USING (
     EXISTS (SELECT 1 FROM leagues WHERE id = league_id AND owner_id = auth.uid())
);

-- Escalações
CREATE POLICY "Gerencia Própria Escalação" ON user_squads FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Leitura Pública Escalações" ON user_squads FOR SELECT USING (true);

-- 4. RELOAD SCHEMA
NOTIFY pgrst, 'reload schema';
