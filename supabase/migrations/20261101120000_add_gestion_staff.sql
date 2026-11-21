-- Gestión de usuarios del staff (#20, wiki § 3.1): nómina paginada con búsqueda y filtro por cargo.
-- Solo el staff puede consultarla; el conteo de historial anticipa si el DELETE chocaría con RESTRICT.

CREATE OR REPLACE FUNCTION public.buscar_staff(
	p_busqueda TEXT DEFAULT '',
	p_id_cargo INTEGER DEFAULT NULL,
	p_offset INTEGER DEFAULT 0,
	p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
	"rutSansano" INTEGER,
	"rolSansano" BIGINT,
	"digitoVerificador" SMALLINT,
	"idCargo" INTEGER,
	"nombreSansano" TEXT,
	"telefono" INTEGER,
	"correoInstitucional" TEXT,
	"authUserId" UUID,
	"nombreCargo" TEXT,
	"solicitudes" BIGINT,
	"prestamos" BIGINT,
	"suspensiones" BIGINT,
	"suspendido" BOOLEAN,
	"total" BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	v_busqueda TEXT := public.normalizar_texto(pg_catalog.btrim(COALESCE(p_busqueda, '')));
BEGIN
	IF NOT public.es_staff() THEN
		RAISE EXCEPTION 'Solo el staff puede consultar la nómina'
			USING ERRCODE = '42501';
	END IF;

	RETURN QUERY
	SELECT
		s."rutSansano",
		s."rolSansano",
		s."digitoVerificador",
		s."idCargo",
		s."nombreSansano",
		s."telefono",
		s."correoInstitucional",
		s."authUserId",
		c."nombreCargo",
		(SELECT pg_catalog.count(*) FROM public."Solicitud" so WHERE so."rutSansano" = s."rutSansano"),
		(
			SELECT pg_catalog.count(*)
			FROM public."Prestamo" p
			WHERE p."rutPrestador" = s."rutSansano"
				OR p."rutReceptor" = s."rutSansano"
				OR p."rutRevisor" = s."rutSansano"
		),
		(
			SELECT pg_catalog.count(*)
			FROM public."Suspension" su
			WHERE su."rutSansano" = s."rutSansano" OR su."rutModerador" = s."rutSansano"
		),
		public.fn_suspension_vigente(s."rutSansano"),
		pg_catalog.count(*) OVER ()
	FROM public."Sansano" s
	JOIN public."Cargo" c ON c."idCargo" = s."idCargo"
	WHERE (p_id_cargo IS NULL OR s."idCargo" = p_id_cargo)
		AND (
			v_busqueda = ''
			OR public.normalizar_texto(s."nombreSansano") LIKE '%' || v_busqueda || '%'
			OR public.normalizar_texto(s."correoInstitucional") LIKE '%' || v_busqueda || '%'
			OR s."rutSansano"::TEXT LIKE '%' || v_busqueda || '%'
			OR s."rolSansano"::TEXT LIKE '%' || v_busqueda || '%'
		)
	ORDER BY public.normalizar_texto(s."nombreSansano"), s."rutSansano"
	OFFSET GREATEST(COALESCE(p_offset, 0), 0)
	LIMIT GREATEST(LEAST(COALESCE(p_limit, 10), 50), 1);
END;
$$;

REVOKE ALL ON FUNCTION public.buscar_staff(TEXT, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buscar_staff(TEXT, INTEGER, INTEGER, INTEGER) TO authenticated;

-- ---------------------------------------------------------------------------------------------
-- Escrituras de gestión (wiki § 3.1/3.2). La DB decide quién y qué; el servidor solo traduce
-- errores y, si `invitar_staff` lo aprueba, envía el correo de Auth.
-- Códigos propios (SQLSTATE) para que el panel distinga cada rechazo:
--   CS001 cuenta activa · CS002 faltan datos del sansano · CS003 con historial · CS004 sobre sí mismo
-- ---------------------------------------------------------------------------------------------

-- Nadie cambia ni quita su propio cargo: evita que el último Directivo se deje fuera del panel.
CREATE OR REPLACE FUNCTION public.fn_impedir_autocambio_cargo()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
	IF auth.uid() IS NOT NULL
		AND OLD."authUserId" = auth.uid()
		AND NEW."idCargo" IS DISTINCT FROM OLD."idCargo"
	THEN
		RAISE EXCEPTION 'No puedes cambiar ni quitar tu propio cargo'
			USING ERRCODE = 'CS004';
	END IF;

	RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_impedir_autocambio_cargo() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER "trg_sansano_impedir_autocambio_cargo"
BEFORE UPDATE OF "idCargo" ON public."Sansano"
FOR EACH ROW
EXECUTE FUNCTION public.fn_impedir_autocambio_cargo();

-- Alta o asignación de cargo previa a la invitación. SECURITY INVOKER: las escrituras pasan por
-- la RLS de Sansano. Devuelve 'invitar' (hay que enviar el correo de Auth) o 'activo' (ya tiene
-- cuenta Auth: accede en cuanto tiene cargo).
CREATE OR REPLACE FUNCTION public.invitar_staff(
	p_correo TEXT,
	p_id_cargo INTEGER,
	p_rut INTEGER DEFAULT NULL,
	p_digito_verificador SMALLINT DEFAULT NULL,
	p_rol BIGINT DEFAULT NULL,
	p_nombre TEXT DEFAULT NULL,
	p_telefono INTEGER DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
	v_correo TEXT := pg_catalog.btrim(p_correo);
	v_sansano public."Sansano"%ROWTYPE;
BEGIN
	IF NOT public.tiene_permiso('usuarios:gestionar') THEN
		RAISE EXCEPTION 'Solo el Directivo puede invitar staff'
			USING ERRCODE = '42501';
	END IF;

	IF p_id_cargo IS NULL OR NOT EXISTS (
		SELECT 1 FROM public."Cargo" c WHERE c."idCargo" = p_id_cargo
	) THEN
		RAISE EXCEPTION 'Cargo inválido'
			USING ERRCODE = '22023';
	END IF;

	SELECT * INTO v_sansano
	FROM public."Sansano" s
	WHERE pg_catalog.lower(s."correoInstitucional") = pg_catalog.lower(v_correo)
	FOR UPDATE;

	IF FOUND THEN
		IF v_sansano."idCargo" IS NOT NULL AND v_sansano."authUserId" IS NOT NULL THEN
			RAISE EXCEPTION 'El correo ya pertenece a una cuenta activa del staff'
				USING ERRCODE = 'CS001';
		END IF;

		IF v_sansano."idCargo" IS DISTINCT FROM p_id_cargo THEN
			UPDATE public."Sansano"
			SET "idCargo" = p_id_cargo
			WHERE "rutSansano" = v_sansano."rutSansano";
		END IF;

		RETURN CASE WHEN v_sansano."authUserId" IS NULL THEN 'invitar' ELSE 'activo' END;
	END IF;

	IF p_rut IS NULL OR p_digito_verificador IS NULL OR p_rol IS NULL
		OR pg_catalog.btrim(COALESCE(p_nombre, '')) = '' OR p_telefono IS NULL
	THEN
		RAISE EXCEPTION 'El correo no está registrado: faltan los datos del sansano'
			USING ERRCODE = 'CS002';
	END IF;

	INSERT INTO public."Sansano" (
		"rutSansano", "rolSansano", "digitoVerificador", "idCargo", "nombreSansano", "telefono",
		"correoInstitucional", "authUserId"
	)
	VALUES (
		p_rut, p_rol, p_digito_verificador, p_id_cargo, pg_catalog.btrim(p_nombre), p_telefono,
		v_correo, NULL
	);

	RETURN 'invitar';
END;
$$;

REVOKE ALL ON FUNCTION public.invitar_staff(TEXT, INTEGER, INTEGER, SMALLINT, BIGINT, TEXT, INTEGER)
	FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invitar_staff(TEXT, INTEGER, INTEGER, SMALLINT, BIGINT, TEXT, INTEGER)
	TO authenticated;

-- Eliminación física: borra el Sansano y su cuenta de Auth en la misma transacción.
-- SECURITY DEFINER solo porque `auth.users` no es accesible al rol `authenticated`; el permiso se
-- valida aquí mismo.
CREATE OR REPLACE FUNCTION public.eliminar_staff(p_rut INTEGER)
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	v_auth_user_id UUID;
BEGIN
	IF NOT public.tiene_permiso('usuarios:gestionar') THEN
		RAISE EXCEPTION 'Solo el Directivo puede eliminar staff'
			USING ERRCODE = '42501';
	END IF;

	IF p_rut = public.rut_staff_actual() THEN
		RAISE EXCEPTION 'No puedes eliminar tu propio registro'
			USING ERRCODE = 'CS004';
	END IF;

	SELECT s."authUserId" INTO v_auth_user_id
	FROM public."Sansano" s
	WHERE s."rutSansano" = p_rut
	FOR UPDATE;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'El sansano no existe'
			USING ERRCODE = 'P0002';
	END IF;

	IF EXISTS (SELECT 1 FROM public."Solicitud" so WHERE so."rutSansano" = p_rut)
		OR EXISTS (
			SELECT 1 FROM public."Prestamo" p
			WHERE p_rut IN (p."rutPrestador", p."rutReceptor", p."rutRevisor")
		)
		OR EXISTS (
			SELECT 1 FROM public."Suspension" su
			WHERE p_rut IN (su."rutSansano", su."rutModerador")
		)
	THEN
		RAISE EXCEPTION 'El registro conserva historial: aplica la baja por cargo'
			USING ERRCODE = 'CS003';
	END IF;

	DELETE FROM public."Sansano" WHERE "rutSansano" = p_rut;

	IF v_auth_user_id IS NOT NULL THEN
		DELETE FROM auth.users WHERE id = v_auth_user_id;
	END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.eliminar_staff(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eliminar_staff(INTEGER) TO authenticated;
