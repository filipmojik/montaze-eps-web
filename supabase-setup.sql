-- ===================================
-- Supabase Setup pro Montáže EPS
-- Spusťte tento SQL v Supabase SQL Editor
-- ===================================

-- 1. Tabulka poptávek
CREATE TABLE IF NOT EXISTS inquiries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    service TEXT,
    message TEXT,
    page TEXT DEFAULT '/',
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'closed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Index pro rychlé filtrování
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created ON inquiries(created_at DESC);

-- 3. Row Level Security (RLS)
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- Kdokoliv může INSERT (anonymní formuláře z webu)
CREATE POLICY "Anyone can insert inquiries" ON inquiries
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Pouze přihlášení uživatelé mohou číst a upravovat
CREATE POLICY "Authenticated users can read inquiries" ON inquiries
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can update inquiries" ON inquiries
    FOR UPDATE
    TO authenticated
    USING (true);

-- 4. Funkce pro automatické updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON inquiries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ===================================
-- HOTOVO! Nyní:
-- 1. Jděte do Authentication → Users → Invite User
-- 2. Zadejte admin email (např. admin@montazeeps.cz)
-- 3. Nastavte heslo
-- 4. Zkopírujte SUPABASE_URL a SUPABASE_ANON_KEY z Settings → API
-- 5. Nastavte env variables ve Vercelu:
--    SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
-- ===================================
