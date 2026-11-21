-- Pruebas de las RPC del cajero: crear_prestamo_junta y devolver_prestamo (#17).
-- Ejecutar con `make test-db` (supabase test db). Todo corre en una transacción revertida.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(17);

-- ---------------------------------------------------------------------------------------------
-- Fixtures (como postgres, sin RLS)
-- ---------------------------------------------------------------------------------------------
INSERT INTO auth.users (id, aud, role, email)
VALUES
	('20000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'pj.junior@usm.cl'),
	('20000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'pj.comun@usm.cl');

INSERT INTO public."Sansano" (
	"rutSansano", "rolSansano", "digitoVerificador", "idCargo", "nombreSansano", "telefono",
	"correoInstitucional", "authUserId"
)
VALUES
	(51000001, 201910001, 1, (SELECT "idCargo" FROM public."Cargo" WHERE "nombreCargo" = 'Junior'),
		'PJ Junior', 81000001, 'pj.junior@usm.cl', '20000000-0000-4000-8000-000000000001'),
	(51000002, 201910002, 1, NULL,
		'PJ Común', 81000002, 'pj.comun@usm.cl', '20000000-0000-4000-8000-000000000002'),
	(51000010, 201910010, 1, NULL, 'PJ Solicitante', 81000010, 'pj.solicitante@usm.cl', NULL),
	(51000011, 201910011, 1, NULL, 'PJ Suspendido', 81000011, 'pj.suspendido@usm.cl', NULL);

INSERT INTO public."Suspension" ("rutSansano", "rutModerador", "fechaInicio", "fechaTermino", "razon")
VALUES (51000011, 51000001, now() - interval '1 day', NULL, 'Prueba');

INSERT INTO public."Juego" ("idJuego", "nombreJuego", "tipo")
VALUES (2000000101, '[TEST PJ] Juego', 'Juego base');

INSERT INTO public."Ejemplar" ("idEjemplar", "idJuego", "esExterno", "estadoCompletitud", "estadoEjemplar")
VALUES
	('TEST-PJ-1', 2000000101, false, 'Completo', 'En bodega'),
	('TEST-PJ-2', 2000000101, false, 'Completo', 'Prestado');

CREATE FUNCTION pg_temp.como(p_uid uuid, p_email text)
RETURNS void
LANGUAGE sql
AS $$
	SELECT
		set_config('role', 'authenticated', true),
		set_config(
			'request.jwt.claims',
			json_build_object('sub', p_uid, 'email', p_email, 'role', 'authenticated')::text,
			true
		);
$$;

-- ---------------------------------------------------------------------------------------------
-- Público (anon): sin EXECUTE
-- ---------------------------------------------------------------------------------------------
SET LOCAL role anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT throws_ok(
	$$SELECT public.crear_prestamo_junta('TEST-PJ-1', 51000010, 'Carnet')$$,
	'42501',
	NULL,
	'anon no ejecuta crear_prestamo_junta'
);
SELECT throws_ok(
	$$SELECT public.devolver_prestamo(1, 'En bodega')$$,
	'42501',
	NULL,
	'anon no ejecuta devolver_prestamo'
);

RESET role;

-- ---------------------------------------------------------------------------------------------
-- Cuenta autenticada sin cargo
-- ---------------------------------------------------------------------------------------------
SELECT pg_temp.como('20000000-0000-4000-8000-000000000002', 'pj.comun@usm.cl');

SELECT throws_ok(
	$$SELECT public.crear_prestamo_junta('TEST-PJ-1', 51000010, 'Carnet')$$,
	'42501',
	'Tu cargo no puede registrar préstamos de junta',
	'sin cargo no crea préstamos'
);
SELECT throws_ok(
	$$SELECT public.devolver_prestamo(1, 'En bodega')$$,
	'42501',
	'Tu cargo no puede registrar devoluciones',
	'sin cargo no registra devoluciones'
);

RESET role;

-- ---------------------------------------------------------------------------------------------
-- Junior (prestamos:junta)
-- ---------------------------------------------------------------------------------------------
SELECT pg_temp.como('20000000-0000-4000-8000-000000000001', 'pj.junior@usm.cl');

SELECT throws_ok(
	$$SELECT public.crear_prestamo_junta('TEST-PJ-1', 51000011, 'Carnet')$$,
	'P0001',
	'El sansano 51000011 tiene una suspensión activa',
	'rechaza a un sansano suspendido'
);
SELECT throws_ok(
	$$SELECT public.crear_prestamo_junta('TEST-PJ-1', 59999999, 'Carnet')$$,
	'P0001',
	'El sansano 59999999 no existe',
	'rechaza un RUT inexistente'
);
SELECT throws_ok(
	$$SELECT public.crear_prestamo_junta('TEST-PJ-X', 51000010, 'Carnet')$$,
	'P0001',
	'El ejemplar TEST-PJ-X no existe',
	'rechaza un ejemplar inexistente'
);
SELECT throws_ok(
	$$SELECT public.crear_prestamo_junta('TEST-PJ-2', 51000010, 'Carnet')$$,
	'P0001',
	'El ejemplar TEST-PJ-2 no está en bodega (estado: Prestado)',
	'rechaza un ejemplar que no está en bodega'
);

SELECT lives_ok(
	$$SELECT public.crear_prestamo_junta('TEST-PJ-1', 51000010, 'TNE')$$,
	'Junior crea un préstamo de junta'
);
SELECT is(
	(SELECT "estadoEjemplar"::text FROM public."Ejemplar" WHERE "idEjemplar" = 'TEST-PJ-1'),
	'Prestado',
	'el ejemplar queda Prestado'
);
SELECT results_eq(
	$$SELECT p."rutPrestador", p."tipoDocumento"::text, p."estadoPrestamo"::text, s."estadoSolicitud"::text
	  FROM public."Prestamo" AS p
	  JOIN public."Solicitud" AS s ON s."idSolicitud" = p."idSolicitud"
	  WHERE s."idEjemplar" = 'TEST-PJ-1'$$,
	$$VALUES (51000001, 'TNE', 'Activo', 'Aprobada')$$,
	'Solicitud Aprobada + Prestamo Activo con el rut del staff de la sesión'
);
SELECT throws_ok(
	$$SELECT public.crear_prestamo_junta('TEST-PJ-1', 51000010, 'Carnet')$$,
	'P0001',
	NULL,
	'no permite un segundo préstamo Activo del mismo ejemplar'
);

SELECT throws_ok(
	$$SELECT public.devolver_prestamo(1, 'Prestado')$$,
	'P0001',
	'Estado final inválido para una devolución: Prestado',
	'la devolución solo deja En bodega o Para revisar'
);
SELECT lives_ok(
	$$SELECT public.devolver_prestamo(
		(SELECT p."idPrestamo" FROM public."Prestamo" AS p
		 JOIN public."Solicitud" AS s ON s."idSolicitud" = p."idSolicitud"
		 WHERE s."idEjemplar" = 'TEST-PJ-1' AND p."estadoPrestamo" = 'Activo'),
		'Para revisar'
	)$$,
	'Junior registra la devolución'
);
SELECT is(
	(SELECT "estadoEjemplar"::text FROM public."Ejemplar" WHERE "idEjemplar" = 'TEST-PJ-1'),
	'Para revisar',
	'el ejemplar queda Para revisar'
);
SELECT results_eq(
	$$SELECT p."estadoPrestamo"::text, p."rutReceptor"
	  FROM public."Prestamo" AS p
	  JOIN public."Solicitud" AS s ON s."idSolicitud" = p."idSolicitud"
	  WHERE s."idEjemplar" = 'TEST-PJ-1'$$,
	$$VALUES ('Devuelto', 51000001)$$,
	'el préstamo queda Devuelto con el rut del staff que recibe'
);
SELECT throws_ok(
	$$SELECT public.devolver_prestamo(
		(SELECT p."idPrestamo" FROM public."Prestamo" AS p
		 JOIN public."Solicitud" AS s ON s."idSolicitud" = p."idSolicitud"
		 WHERE s."idEjemplar" = 'TEST-PJ-1'),
		'En bodega'
	)$$,
	'P0001',
	NULL,
	'no devuelve dos veces el mismo préstamo'
);

RESET role;

SELECT * FROM finish();
ROLLBACK;
