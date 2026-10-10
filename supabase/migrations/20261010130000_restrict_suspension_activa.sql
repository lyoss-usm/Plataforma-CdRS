-- suspension_activa() estaba concedida a todo `authenticated`: una cuenta sin cargo (o un staff dado
-- de baja) podía averiguar si cualquier RUT está suspendido. Se separa en dos:
--   fn_suspension_vigente(rut): lógica interna, solo para triggers/políticas (sin grants)
--   suspension_activa(rut):     API para el staff; rechaza a quien no lo es

CREATE OR REPLACE FUNCTION public.fn_suspension_vigente(p_rut INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
	SELECT EXISTS (
		SELECT 1
		FROM public."Suspension" AS su
		WHERE su."rutSansano" = p_rut
			AND su."fechaInicio" <= pg_catalog.now()
			AND (su."fechaTermino" IS NULL OR su."fechaTermino" > pg_catalog.now())
	);
$$;

REVOKE ALL ON FUNCTION public.fn_suspension_vigente(INTEGER) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.suspension_activa(p_rut INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
	IF NOT public.es_staff() THEN
		RAISE EXCEPTION 'Solo el staff puede consultar suspensiones'
			USING ERRCODE = '42501';
	END IF;

	RETURN public.fn_suspension_vigente(p_rut);
END;
$$;

REVOKE ALL ON FUNCTION public.suspension_activa(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.suspension_activa(INTEGER) TO authenticated;

COMMENT ON FUNCTION public.suspension_activa(INTEGER) IS 'Indica si el RUT tiene una Suspension vigente; solo staff.';

-- El bloqueo de solicitudes corre para anon, así que usa la función interna.
CREATE OR REPLACE FUNCTION public.fn_bloquear_solicitud_suspendida()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
	IF public.fn_suspension_vigente(NEW."rutSansano") THEN
		RAISE EXCEPTION 'El sansano % tiene una suspensión activa', NEW."rutSansano"
			USING ERRCODE = 'P0001', HINT = 'sansano_suspendido';
	END IF;

	RETURN NEW;
END;
$$;
