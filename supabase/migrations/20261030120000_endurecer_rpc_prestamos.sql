-- Endurece las RPC del cajero (#17) creadas en 20261010181132_rpc_gestion_prestamos:
--   - SECURITY INVOKER: la RLS de 20261010120000_add_auth_rls sigue siendo la autoridad.
--   - El staff sale de la sesión (rut_staff_actual()), no de un parámetro que el cliente elige.
--   - Solo `authenticated` puede ejecutarlas, y cada una valida su permiso.
-- Las firmas cambian (sin p_rut_staff / p_rut_receptor), por eso DROP + CREATE.

DROP FUNCTION IF EXISTS public.crear_prestamo_junta(TEXT, INTEGER, INTEGER, public.documentos);
DROP FUNCTION IF EXISTS public.devolver_prestamo(INTEGER, INTEGER, public.estadoejem);

-- Préstamo presencial en junta (§ 1.3): Solicitud 'Aprobada' + Prestamo 'Activo' + ejemplar
-- 'Prestado' en una sola transacción.
CREATE FUNCTION public.crear_prestamo_junta(
	p_id_ejemplar TEXT,
	p_rut_sansano INTEGER,
	p_tipo_documento public.documentos
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
	v_rut_staff INTEGER := public.rut_staff_actual();
	v_estado public.estadoejem;
	v_id_solicitud INTEGER;
	v_id_prestamo INTEGER;
BEGIN
	IF v_rut_staff IS NULL OR NOT public.tiene_permiso('prestamos:junta') THEN
		RAISE EXCEPTION 'Tu cargo no puede registrar préstamos de junta'
			USING ERRCODE = '42501';
	END IF;

	IF NOT EXISTS (SELECT 1 FROM public."Sansano" AS s WHERE s."rutSansano" = p_rut_sansano) THEN
		RAISE EXCEPTION 'El sansano % no existe', p_rut_sansano
			USING ERRCODE = 'P0001', HINT = 'sansano_inexistente';
	END IF;

	-- El trigger trg_bloquear_solicitud_suspendida también lo bloquea; aquí se avisa antes de
	-- tomar el lock del ejemplar.
	IF public.suspension_activa(p_rut_sansano) THEN
		RAISE EXCEPTION 'El sansano % tiene una suspensión activa', p_rut_sansano
			USING ERRCODE = 'P0001', HINT = 'sansano_suspendido';
	END IF;

	-- FOR UPDATE serializa préstamos concurrentes del mismo ejemplar; junto con exigir
	-- 'En bodega' impide dos préstamos 'Activo' por ejemplar.
	SELECT e."estadoEjemplar"
	INTO v_estado
	FROM public."Ejemplar" AS e
	WHERE e."idEjemplar" = p_id_ejemplar
	FOR UPDATE;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'El ejemplar % no existe', p_id_ejemplar
			USING ERRCODE = 'P0001', HINT = 'ejemplar_inexistente';
	END IF;

	IF v_estado <> 'En bodega' THEN
		RAISE EXCEPTION 'El ejemplar % no está en bodega (estado: %)', p_id_ejemplar, v_estado
			USING ERRCODE = 'P0001', HINT = 'ejemplar_no_disponible';
	END IF;

	INSERT INTO public."Solicitud" (
		"rutSansano", "idEjemplar", "fechaSolicitud", "fechaSeleccionada", "estadoSolicitud"
	)
	VALUES (p_rut_sansano, p_id_ejemplar, pg_catalog.now(), CURRENT_DATE, 'Aprobada')
	RETURNING "idSolicitud" INTO v_id_solicitud;

	INSERT INTO public."Prestamo" (
		"idSolicitud", "rutPrestador", "fechaRetiro", "tipoDocumento", "estadoPrestamo"
	)
	VALUES (v_id_solicitud, v_rut_staff, pg_catalog.now(), p_tipo_documento, 'Activo')
	RETURNING "idPrestamo" INTO v_id_prestamo;

	UPDATE public."Ejemplar"
	SET "estadoEjemplar" = 'Prestado'
	WHERE "idEjemplar" = p_id_ejemplar;

	RETURN v_id_prestamo;
END;
$$;

-- Devolución (§ 1.4): cierra un préstamo 'Activo' y deja el ejemplar 'En bodega' o 'Para revisar'.
-- La revisión de completitud queda en #19.
CREATE FUNCTION public.devolver_prestamo(
	p_id_prestamo INTEGER,
	p_estado_final public.estadoejem
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
	v_rut_staff INTEGER := public.rut_staff_actual();
	v_id_ejemplar TEXT;
BEGIN
	IF v_rut_staff IS NULL
		OR NOT (public.tiene_permiso('prestamos:junta') OR public.tiene_permiso('prestamos:devolver'))
	THEN
		RAISE EXCEPTION 'Tu cargo no puede registrar devoluciones'
			USING ERRCODE = '42501';
	END IF;

	IF p_estado_final NOT IN ('En bodega', 'Para revisar') THEN
		RAISE EXCEPTION 'Estado final inválido para una devolución: %', p_estado_final
			USING ERRCODE = 'P0001', HINT = 'estado_final_invalido';
	END IF;

	UPDATE public."Prestamo" AS p
	SET
		"estadoPrestamo" = 'Devuelto',
		"fechaDevolucion" = pg_catalog.now(),
		"rutReceptor" = v_rut_staff
	FROM public."Solicitud" AS s
	WHERE p."idPrestamo" = p_id_prestamo
		AND p."estadoPrestamo" = 'Activo'
		AND s."idSolicitud" = p."idSolicitud"
	RETURNING s."idEjemplar" INTO v_id_ejemplar;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'El préstamo % no existe o ya fue devuelto', p_id_prestamo
			USING ERRCODE = 'P0001', HINT = 'prestamo_no_activo';
	END IF;

	UPDATE public."Ejemplar"
	SET "estadoEjemplar" = p_estado_final
	WHERE "idEjemplar" = v_id_ejemplar;
END;
$$;

REVOKE ALL ON FUNCTION public.crear_prestamo_junta(TEXT, INTEGER, public.documentos) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.devolver_prestamo(INTEGER, public.estadoejem) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.crear_prestamo_junta(TEXT, INTEGER, public.documentos) TO authenticated;
GRANT EXECUTE ON FUNCTION public.devolver_prestamo(INTEGER, public.estadoejem) TO authenticated;

COMMENT ON FUNCTION public.crear_prestamo_junta(TEXT, INTEGER, public.documentos) IS
	'Préstamo presencial de junta (cajero, #17); requiere prestamos:junta. Devuelve idPrestamo.';
COMMENT ON FUNCTION public.devolver_prestamo(INTEGER, public.estadoejem) IS
	'Cierra un préstamo Activo; requiere prestamos:junta o prestamos:devolver.';
