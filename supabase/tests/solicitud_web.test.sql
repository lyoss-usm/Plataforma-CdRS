-- Pruebas del flujo público de solicitudes web (#4).
-- Ejecutar con `make test-db`. Todo corre en una transacción revertida.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT * FROM no_plan();

-- ---------------------------------------------------------------------------------------------
-- Fixtures (como postgres, sin RLS)
-- ---------------------------------------------------------------------------------------------
INSERT INTO public."Juego" ("idJuego", "nombreJuego", "tipo", "idJuegoBase")
VALUES
	(2100000001, '[TEST SOLICITUD WEB] Base', 'Juego base', NULL),
	(2100000002, '[TEST SOLICITUD WEB] Otro base', 'Juego base', NULL),
	(2100000003, '[TEST SOLICITUD WEB] Expansión compatible', 'Expansión', 2100000001),
	(2100000004, '[TEST SOLICITUD WEB] Expansión incompatible', 'Expansión', 2100000002),
	(2100000005, '[TEST SOLICITUD WEB] Sin ejemplares', 'Juego base', NULL),
	(2100000006, '[TEST SOLICITUD WEB] Expansión sin ejemplares', 'Expansión', 2100000001);

INSERT INTO public."Ejemplar" (
	"idEjemplar",
	"idJuego",
	"esExterno",
	"estadoCompletitud",
	"estadoEjemplar"
)
VALUES
	('TEST-SW-BASE-INCOMPLETO', 2100000001, false, 'Incompleto', 'En bodega'),
	('TEST-SW-BASE-COMPLETO-B', 2100000001, false, 'Completo', 'En bodega'),
	('TEST-SW-BASE-COMPLETO-A', 2100000001, false, 'Completo', 'En bodega'),
	('TEST-SW-BASE-PRESTADO', 2100000001, false, 'Completo', 'Prestado'),
	('TEST-SW-OTRO-BASE', 2100000002, false, 'Completo', 'En bodega'),
	('TEST-SW-EXP-COMPATIBLE', 2100000003, false, 'Completo', 'En bodega'),
	('TEST-SW-EXP-INCOMPATIBLE', 2100000004, false, 'Completo', 'En bodega');

INSERT INTO public."Sansano" (
	"rutSansano",
	"rolSansano",
	"digitoVerificador",
	"nombreSansano",
	"telefono",
	"correoInstitucional"
)
VALUES (
	22222222,
	202610222,
	2,
	'Sansano suspendido',
	82222222,
	'test.solicitud.suspendido@usm.cl'
);

INSERT INTO public."Suspension" (
	"rutSansano",
	"rutModerador",
	"fechaInicio",
	"razon"
)
VALUES (
	22222222,
	22222222,
	pg_catalog.now() - INTERVAL '1 day',
	'Fixture de solicitud web'
);

-- La RPC usa la hora real de la base de datos. Guardamos una de sus fechas actuales
-- antes de cambiar al rol anon para usarla en las llamadas de integración.
SELECT pg_catalog.set_config(
	'test.fecha_retiro_solicitud_web',
	(public.fn_fechas_retiro_permitidas(pg_catalog.clock_timestamp()))[1]::TEXT,
	true
);

-- ---------------------------------------------------------------------------------------------
-- Funciones auxiliares
-- ---------------------------------------------------------------------------------------------
SELECT is(
	public.fn_digito_verificador_rut(18585543),
	0::SMALLINT,
	'calcula un dígito verificador numérico'
);

SELECT is(
	public.fn_digito_verificador_rut(6),
	10::SMALLINT,
	'representa K mediante el valor 10'
);

SELECT throws_ok(
	$$SELECT public.fn_digito_verificador_rut(-1)$$,
	'22023',
	'El RUT debe ser un número positivo',
	'rechaza un cuerpo de RUT negativo'
);

SELECT is(
	public.fn_fechas_retiro_permitidas(
		TIMESTAMPTZ '2026-10-13 12:29:59 America/Santiago'
	),
	ARRAY[DATE '2026-10-13', DATE '2026-10-15'],
	'un martes antes de las 12:30 incluye el mismo martes'
);

SELECT is(
	public.fn_fechas_retiro_permitidas(
		TIMESTAMPTZ '2026-10-13 12:30:00 America/Santiago'
	),
	ARRAY[DATE '2026-10-15', DATE '2026-10-20'],
	'un martes a las 12:30 pasa el martes a la semana siguiente'
);

SELECT is(
	public.fn_fechas_retiro_permitidas(
		TIMESTAMPTZ '2026-10-15 12:29:59 America/Santiago'
	),
	ARRAY[DATE '2026-10-15', DATE '2026-10-20'],
	'un jueves antes de las 12:30 incluye el mismo jueves'
);

SELECT is(
	public.fn_fechas_retiro_permitidas(
		TIMESTAMPTZ '2026-10-15 12:30:00 America/Santiago'
	),
	ARRAY[DATE '2026-10-20', DATE '2026-10-22'],
	'un jueves a las 12:30 pasa el jueves a la semana siguiente'
);

SELECT is(
	public.fn_seleccionar_ejemplar_apto(2100000001),
	'TEST-SW-BASE-COMPLETO-A',
	'prioriza un ejemplar completo y desempata por identificador'
);

SELECT is(
	public.fn_seleccionar_ejemplar_apto(2100000005),
	NULL::TEXT,
	'devuelve NULL cuando no hay ejemplares en bodega'
);

-- ---------------------------------------------------------------------------------------------
-- Frontera de seguridad pública
-- ---------------------------------------------------------------------------------------------
SELECT ok(
	has_function_privilege(
		'anon',
		'public.crear_solicitud_web(integer,integer,bigint,smallint,text,integer,text,date,boolean,integer)',
		'EXECUTE'
	),
	'anon puede ejecutar crear_solicitud_web'
);

SELECT ok(
	has_function_privilege(
		'anon',
		'public.fechas_retiro_disponibles()',
		'EXECUTE'
	),
	'anon puede consultar las fechas de retiro disponibles'
);

SELECT ok(
	has_function_privilege(
		'anon',
		'public.expansiones_disponibles(integer)',
		'EXECUTE'
	),
	'anon puede consultar las expansiones disponibles'
);

SELECT ok(
	NOT has_function_privilege(
		'anon',
		'public.fn_fechas_retiro_permitidas(timestamp with time zone)',
		'EXECUTE'
	),
	'anon no puede proporcionar una hora falsa a la función interna de fechas'
);

SELECT ok(
	NOT has_table_privilege('anon', 'public."Solicitud"', 'INSERT'),
	'anon no tiene permiso de inserción directa sobre Solicitud'
);

SET LOCAL role anon;
SELECT pg_catalog.set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT is(
	(SELECT pg_catalog.count(*) FROM public.fechas_retiro_disponibles()),
	2::BIGINT,
	'la API pública entrega exactamente dos fechas de retiro'
);

SELECT ok(
	NOT EXISTS (
		SELECT 1
		FROM public.fechas_retiro_disponibles() AS opcion
		WHERE opcion."etiqueta" IS DISTINCT FROM CASE
			WHEN EXTRACT(ISODOW FROM opcion."fechaSeleccionada")::INTEGER = 2
				THEN 'Martes Bloque Libre (12:30 - 13:40)'
			WHEN EXTRACT(ISODOW FROM opcion."fechaSeleccionada")::INTEGER = 4
				THEN 'Jueves Bloque Libre (12:30 - 13:40)'
		END
	),
	'cada fecha pública tiene la etiqueta correspondiente a su día'
);

SELECT results_eq(
	$$
		SELECT "idJuego", "nombreJuego"
		FROM public.expansiones_disponibles(2100000001)
	$$,
	$$
		VALUES (
			2100000003,
			'[TEST SOLICITUD WEB] Expansión compatible'::TEXT
		)
	$$,
	'lista solo expansiones compatibles con ejemplares en bodega'
);

SELECT is(
	(
		SELECT pg_catalog.count(*)
		FROM public.expansiones_disponibles(2100000002)
	),
	1::BIGINT,
	'cada juego base recibe solamente sus propias expansiones'
);

SELECT throws_ok(
	$$INSERT INTO public."Solicitud" (
		"rutSansano",
		"idEjemplar",
		"fechaSolicitud",
		"fechaSeleccionada",
		"estadoSolicitud"
	) VALUES (
		22222222,
		'TEST-SW-BASE-COMPLETO-A',
		pg_catalog.now(),
		CURRENT_DATE,
		'Pendiente'
	)$$,
	'42501',
	NULL,
	'anon no puede saltarse la RPC mediante un INSERT directo'
);

SELECT lives_ok(
	$$SELECT public.crear_solicitud_web(
		p_id_juego => 2100000001,
		p_rut_sansano => 11111111,
		p_rol_sansano => 202610101::BIGINT,
		p_digito_verificador => 1::SMALLINT,
		p_nombre_sansano => '  Sansano   Nuevo  ',
		p_telefono => 81111111,
		p_correo_institucional => 'SOLICITUD.NUEVO@ALUMNOS.USM.CL',
		p_fecha_seleccionada => pg_catalog.current_setting('test.fecha_retiro_solicitud_web')::DATE,
		p_acepta_terminos => true,
		p_id_juego_expansion => NULL
	)$$,
	'anon crea una solicitud mediante la RPC'
);

RESET role;

-- ---------------------------------------------------------------------------------------------
-- Efectos de la primera solicitud
-- ---------------------------------------------------------------------------------------------
SELECT is(
	(SELECT pg_catalog.count(*) FROM public."Sansano" WHERE "rutSansano" = 11111111),
	1::BIGINT,
	'registra al Sansano la primera vez'
);

SELECT is(
	(SELECT "nombreSansano" FROM public."Sansano" WHERE "rutSansano" = 11111111),
	'Sansano Nuevo',
	'normaliza los espacios del nombre antes de guardarlo'
);

SELECT is(
	(SELECT "correoInstitucional" FROM public."Sansano" WHERE "rutSansano" = 11111111),
	'solicitud.nuevo@alumnos.usm.cl',
	'normaliza el correo institucional a minúsculas'
);

SELECT is(
	(
		SELECT "idEjemplar"
		FROM public."Solicitud"
		WHERE "rutSansano" = 11111111
		ORDER BY "idSolicitud"
		LIMIT 1
	),
	'TEST-SW-BASE-COMPLETO-A',
	'la solicitud recibe el ejemplar más apto'
);

SELECT is(
	(
		SELECT "estadoSolicitud"::TEXT
		FROM public."Solicitud"
		WHERE "rutSansano" = 11111111
		ORDER BY "idSolicitud"
		LIMIT 1
	),
	'Pendiente',
	'la solicitud se crea en estado Pendiente'
);

-- ---------------------------------------------------------------------------------------------
-- Segunda solicitud: expansión, registro inmutable y sobresolicitud
-- ---------------------------------------------------------------------------------------------
SET LOCAL role anon;
SELECT pg_catalog.set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT lives_ok(
	$$SELECT public.crear_solicitud_web(
		p_id_juego => 2100000001,
		p_rut_sansano => 11111111,
		p_rol_sansano => 999999999::BIGINT,
		p_digito_verificador => 1::SMALLINT,
		p_nombre_sansano => 'Nombre cambiado',
		p_telefono => 89999999,
		p_correo_institucional => 'cambiado@usm.cl',
		p_fecha_seleccionada => pg_catalog.current_setting('test.fecha_retiro_solicitud_web')::DATE,
		p_acepta_terminos => true,
		p_id_juego_expansion => 2100000003
	)$$,
	'permite una segunda solicitud con una expansión compatible'
);

RESET role;

SELECT is(
	(SELECT pg_catalog.count(*) FROM public."Sansano" WHERE "rutSansano" = 11111111),
	1::BIGINT,
	'no duplica al Sansano en solicitudes posteriores'
);

SELECT is(
	(SELECT "nombreSansano" FROM public."Sansano" WHERE "rutSansano" = 11111111),
	'Sansano Nuevo',
	'no actualiza los datos del Sansano desde el formulario'
);

SELECT is(
	(
		SELECT pg_catalog.count(*)
		FROM public."Solicitud"
		WHERE "rutSansano" = 11111111
		  AND "idEjemplar" = 'TEST-SW-BASE-COMPLETO-A'
	),
	2::BIGINT,
	'permite sobresolicitar el mismo ejemplar'
);

SELECT is(
	(
		SELECT "idExpansion"
		FROM public."Solicitud"
		WHERE "rutSansano" = 11111111
		ORDER BY "idSolicitud" DESC
		LIMIT 1
	),
	'TEST-SW-EXP-COMPATIBLE',
	'asigna un ejemplar de la expansión compatible'
);

-- ---------------------------------------------------------------------------------------------
-- Rechazos del contrato público
-- ---------------------------------------------------------------------------------------------
SET LOCAL role anon;
SELECT pg_catalog.set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT throws_ok(
	$$SELECT public.crear_solicitud_web(
		2100000001,
		11111111,
		202610101::BIGINT,
		1::SMALLINT,
		'Sansano Nuevo',
		81111111,
		'solicitud.nuevo@alumnos.usm.cl',
		pg_catalog.current_setting('test.fecha_retiro_solicitud_web')::DATE,
		true,
		2100000004
	)$$,
	'22023',
	'La expansión seleccionada no pertenece al juego base solicitado',
	'rechaza una expansión perteneciente a otro juego base'
);

SELECT throws_ok(
	$$SELECT public.crear_solicitud_web(
		2100000005,
		11111111,
		202610101::BIGINT,
		1::SMALLINT,
		'Sansano Nuevo',
		81111111,
		'solicitud.nuevo@alumnos.usm.cl',
		pg_catalog.current_setting('test.fecha_retiro_solicitud_web')::DATE,
		true,
		NULL
	)$$,
	'P0001',
	'No existen ejemplares en bodega para el juego solicitado',
	'rechaza un juego sin ejemplares en bodega'
);

SELECT throws_ok(
	$$SELECT public.crear_solicitud_web(
		2100000001,
		11111111,
		202610101::BIGINT,
		1::SMALLINT,
		'Sansano Nuevo',
		81111111,
		'solicitud.nuevo@alumnos.usm.cl',
		DATE '2000-01-01',
		true,
		NULL
	)$$,
	'22023',
	'La fecha seleccionada no corresponde a un bloque de retiro disponible',
	'rechaza una fecha de retiro manipulada'
);

SELECT throws_ok(
	$$SELECT public.crear_solicitud_web(
		2100000001,
		11111111,
		202610101::BIGINT,
		1::SMALLINT,
		'Sansano Nuevo',
		81111111,
		'solicitud.nuevo@alumnos.usm.cl',
		pg_catalog.current_setting('test.fecha_retiro_solicitud_web')::DATE,
		false,
		NULL
	)$$,
	'22023',
	'Debes aceptar los Términos y Condiciones',
	'rechaza términos no aceptados'
);

SELECT throws_ok(
	$$SELECT public.crear_solicitud_web(
		2100000001,
		11111111,
		202610101::BIGINT,
		0::SMALLINT,
		'Sansano Nuevo',
		81111111,
		'solicitud.nuevo@alumnos.usm.cl',
		pg_catalog.current_setting('test.fecha_retiro_solicitud_web')::DATE,
		true,
		NULL
	)$$,
	'22023',
	'El dígito verificador del RUT no es válido',
	'rechaza un RUT manipulado al invocar directamente la RPC'
);

SELECT throws_ok(
	$$SELECT public.crear_solicitud_web(
		2100000001,
		22222222,
		202610222::BIGINT,
		2::SMALLINT,
		'Sansano suspendido',
		82222222,
		'test.solicitud.suspendido@usm.cl',
		pg_catalog.current_setting('test.fecha_retiro_solicitud_web')::DATE,
		true,
		NULL
	)$$,
	'P0001',
	'El sansano 22222222 tiene una suspensión activa',
	'la RPC conserva el bloqueo de Sansanos suspendidos'
);

RESET role;

SELECT * FROM finish();
ROLLBACK;
