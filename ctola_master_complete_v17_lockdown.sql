-- 🏎️ CTOlá - SQL LOCKDOWN V17 (TOTAL CLEARANCE)
-- Força a liberação de RLS para evitar Erro 42501 (Violation)

-- 1. GARANTIA DE COLUNAS
ALTER TABLE match_stats ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS management_password TEXT;

-- 2. RESET TOTAL DE POLÍTICAS
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 3. POLÍTICAS DE EMERGÊNCIA (PERMISSIVAS PARA AUTH)

-- Profiles
CREATE POLICY "Profiles_All" ON profiles FOR ALL USING (true) WITH CHECK (true);

-- Ligas (Permite criação por qualquer logado)
CREATE POLICY "Leagues_Select" ON leagues FOR SELECT USING (true);
CREATE POLICY "Leagues_Insert" ON leagues FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Leagues_Update" ON leagues FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Leagues_Delete" ON leagues FOR DELETE USING (auth.uid() = owner_id);

-- Membros
CREATE POLICY "Members_All" ON league_members FOR ALL USING (true) WITH CHECK (true);

-- Times e Atletas
CREATE POLICY "Teams_All" ON teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Athletes_All" ON athletes FOR ALL USING (true) WITH CHECK (true);

-- Rodadas e Scouts
CREATE POLICY "Rounds_All" ON rounds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Stats_All" ON match_stats FOR ALL USING (true) WITH CHECK (true);

-- Escalações
CREATE POLICY "Squads_All" ON user_squads FOR ALL USING (true) WITH CHECK (true);

-- 4. RELOAD
NOTIFY pgrst, 'reload schema';
