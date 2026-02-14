-- ============================================
-- SUPABASE MIGRATION - spusti v SQL Editore
-- ============================================
-- Tvoja tabuľka public.users používa id (uuid) ako PK
-- s FK na auth.users(id). Nie je žiadny samostatný user_id stĺpec.

-- 1. Trigger: po registrácii automaticky vytvorí záznam v public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, "fullName", "phoneNumber", role)
  VALUES (
    NEW.id,
    NEW.email,
    TRIM(COALESCE(NEW.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(NEW.raw_user_meta_data->>'last_name', '')),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', NULL),
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Odstráň starý trigger ak existuje
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Vytvor trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. RLS politiky

-- Zapni RLS na oboch tabuľkách
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;

-- USERS: každý prihlásený vidí len svoj riadok
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Odstráň starú admin politiku (spôsobovala infinite recursion)
DROP POLICY IF EXISTS "Admin can view all users" ON public.users;

-- TRAININGS: authenticated user môže SELECT
DROP POLICY IF EXISTS "Authenticated users can view trainings" ON public.trainings;
CREATE POLICY "Authenticated users can view trainings"
  ON public.trainings FOR SELECT
  TO authenticated
  USING (true);

-- TRAININGS: len admin môže INSERT
DROP POLICY IF EXISTS "Admin can insert trainings" ON public.trainings;
CREATE POLICY "Admin can insert trainings"
  ON public.trainings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- TRAININGS: len admin môže UPDATE
DROP POLICY IF EXISTS "Admin can update trainings" ON public.trainings;
CREATE POLICY "Admin can update trainings"
  ON public.trainings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- TRAININGS: len admin môže DELETE
DROP POLICY IF EXISTS "Admin can delete trainings" ON public.trainings;
CREATE POLICY "Admin can delete trainings"
  ON public.trainings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- TRAININGS: anon (neprihlásení) môžu tiež čítať tréningy (pre verejný kalendár)
DROP POLICY IF EXISTS "Anon can view trainings" ON public.trainings;
CREATE POLICY "Anon can view trainings"
  ON public.trainings FOR SELECT
  TO anon
  USING (true);
