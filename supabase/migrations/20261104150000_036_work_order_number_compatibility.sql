ALTER TABLE public.work_orders
  ADD COLUMN IF NOT EXISTS order_number text,
  ADD COLUMN IF NOT EXISTS work_order_number text;

UPDATE public.work_orders
SET work_order_number = COALESCE(
      NULLIF(btrim(work_order_number), ''),
      NULLIF(btrim(order_number), ''),
      'WO-' || replace(id::text, '-', '')
    ),
    order_number = COALESCE(
      NULLIF(btrim(order_number), ''),
      NULLIF(btrim(work_order_number), ''),
      'WO-' || replace(id::text, '-', '')
    )
WHERE work_order_number IS NULL
   OR btrim(work_order_number) = ''
   OR order_number IS NULL
   OR btrim(order_number) = '';

CREATE OR REPLACE FUNCTION public.sync_work_order_numbers()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.work_order_number IS DISTINCT FROM OLD.work_order_number THEN
      NEW.order_number := NEW.work_order_number;
    ELSIF NEW.order_number IS DISTINCT FROM OLD.order_number THEN
      NEW.work_order_number := NEW.order_number;
    END IF;
  END IF;

  NEW.work_order_number := COALESCE(
    NULLIF(btrim(NEW.work_order_number), ''),
    NULLIF(btrim(NEW.order_number), ''),
    'WO-' || replace(NEW.id::text, '-', '')
  );
  NEW.order_number := COALESCE(
    NULLIF(btrim(NEW.order_number), ''),
    NEW.work_order_number
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_work_order_numbers_trigger ON public.work_orders;
CREATE TRIGGER sync_work_order_numbers_trigger
  BEFORE INSERT OR UPDATE ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_work_order_numbers();