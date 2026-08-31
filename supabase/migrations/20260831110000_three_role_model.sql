-- ============================================
-- SUPABASE MIGRATION - three_role_model
-- Blok B2 podľa docs/plans/007-authorization-authentication-implementation-b2-plan.md
-- Aplikuj cez `npx supabase db push`, alebo vlož celý obsah do SQL Editora.
-- Bezpečné spúšťať opakovane (IF NOT EXISTS / DROP IF EXISTS)
-- NAJPRV over, že cieľom je VÝVOJOVÝ Supabase projekt.
-- ============================================

-- 1. Audit existujúcich hodnôt
-- Migrácia sa musí hlasno zastaviť, nie ticho opraviť neplatné roly.

DO $$
DECLARE
  _invalid text;
BEGIN
  SELECT string_agg(DISTINCT role, ', ')
  INTO _invalid
  FROM public.users
  WHERE role IS NULL OR role NOT IN ('user', 'admin', 'owner');

  IF _invalid IS NOT NULL THEN
    RAISE EXCEPTION
      'Migrácia zastavená: public.users.role obsahuje neplatné hodnoty: %. Oprav ich manuálne a spusti migráciu znova.',
      _invalid;
  END IF;
END $$;

-- 2. Slovník rolí v databáze
-- Zdroj pravdy pre aplikáciu je lib/auth/roles.ts; tento constraint ho
-- zrkadlí na strane databázy. Pri zmene treba upraviť obe miesta.

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_allowed_values;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_allowed_values
  CHECK (role IN ('user', 'admin', 'owner'));

-- 3. Registračný invariant
-- Rola nového účtu je vždy literál 'user'. Nesmie sa odvodiť z
-- NEW.raw_user_meta_data ani z iného klientom ovplyvniteľného vstupu.
-- Doplnený SET search_path, ktorý SECURITY DEFINER funkcia vyžaduje.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _name text;
BEGIN
  -- Meno: najprv first_name + last_name (registrácia), potom name (Google OAuth), potom full_name
  _name := TRIM(COALESCE(NEW.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(NEW.raw_user_meta_data->>'last_name', ''));
  IF _name = '' OR _name IS NULL THEN
    _name := COALESCE(NEW.raw_user_meta_data->>'name', '');
  END IF;
  IF _name = '' OR _name IS NULL THEN
    _name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  END IF;

  INSERT INTO public.users (id, email, "fullName", "phoneNumber", role)
  VALUES (
    NEW.id,
    NEW.email,
    _name,
    COALESCE(NEW.raw_user_meta_data->>'phone_number', NULL),
    -- Literál. Povýšenie na admin/owner je výhradne manuálna DB operácia.
    'user'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Oprava politiky pre úpravu vlastného profilu
-- Pôvodné WITH CHECK (auth.uid() = id AND role = 'user') blokovalo úpravu
-- vlastného profilu každému adminovi a ownerovi. Nová podmienka zakazuje
-- ZMENU roly namiesto vyžadovania konkrétnej roly.
-- Poznámka: politika nenahrádza odobratie table-level UPDATE práva na
-- stĺpec role. To je predmetom bloku B5.

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT u.role FROM public.users u WHERE u.id = auth.uid())
  );

-- 5. Ochrana posledného ownera
-- Cross-row invariant sa nedá vyjadriť CHECK constraintom, preto trigger.
-- Platí aj pre manuálne SQL operácie; to je zámer.
-- Zmazanie riadku v auth.users kaskáduje sem, takže účet posledného ownera
-- sa nedá zmazať ani cez auth.

CREATE OR REPLACE FUNCTION public.enforce_last_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _owner_count integer;
BEGIN
  -- Riadok, ktorý ownerom nebol, invariant neohrozuje.
  IF OLD.role IS DISTINCT FROM 'owner' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  -- Owner, ktorý ownerom zostáva (napr. zmena telefónu).
  IF TG_OP = 'UPDATE' AND NEW.role = 'owner' THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO _owner_count FROM public.users WHERE role = 'owner';

  IF _owner_count <= 1 THEN
    RAISE EXCEPTION
      'Posledného ownera nie je možné degradovať ani zmazať (operácia: %).', TG_OP
      USING ERRCODE = 'restrict_violation';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_last_owner_trigger ON public.users;
CREATE TRIGGER enforce_last_owner_trigger
  BEFORE UPDATE OR DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.enforce_last_owner();
