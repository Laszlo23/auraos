-- Harden entry_funnel: immutable after insert; one company per owner for funnel free door.

CREATE OR REPLACE FUNCTION public.companies_entry_funnel_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.entry_funnel IS DISTINCT FROM OLD.entry_funnel THEN
    RAISE EXCEPTION 'entry_funnel is immutable'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS companies_entry_funnel_immutable ON public.companies;
CREATE TRIGGER companies_entry_funnel_immutable
  BEFORE UPDATE OF entry_funnel ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.companies_entry_funnel_immutable();

-- Funnel free-door: at most one company per owner (blocks spam inserts via entry_funnel <> os).
CREATE OR REPLACE FUNCTION public.companies_one_per_owner_funnel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing int;
BEGIN
  IF NEW.entry_funnel IS DISTINCT FROM 'os' THEN
    SELECT count(*)::int INTO existing
    FROM public.companies
    WHERE owner_id = NEW.owner_id;
    IF existing > 0 THEN
      RAISE EXCEPTION 'funnel_company_limit'
        USING ERRCODE = 'unique_violation',
          HINT = 'One company per account on non-os funnels.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS companies_one_per_owner_funnel ON public.companies;
CREATE TRIGGER companies_one_per_owner_funnel
  BEFORE INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.companies_one_per_owner_funnel();
