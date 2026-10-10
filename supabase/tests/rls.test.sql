-- Pruebas de RLS, funciones de staff y bloqueo por suspensión (#7).
-- Ejecutar con `make test-db` (supabase test db). Todo corre en una transacción revertida.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(30);

-- ---------------------------------------------------------------------------------------------
-- Fixtures (como postgres, sin RLS)
-- ---------------------------------------------------------------------------------------------
INSERT INTO auth.users (id, aud, role, email)
VALUES
	('10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'test.junior@usm.cl'),
	('10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'test.senior@usm.cl'),
	('10000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'test.directivo@usm.cl'),
	('10000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'test.comun@usm.cl'),
	('10000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'test.invitado@usm.cl');

INSERT INTO public."Sansano" (
	"rutSansano", "rolSansano", "digitoVerificador", "idCargo", "nombreSansano", "telefono",
	"correoInstitucional", "authUserId"
)
VALUES
	(50000001, 201900001, 1, (SELECT "idCargo" FROM public."Cargo" WHERE "nombreCargo" = 'Junior'),
		'Test Junior', 80000001, 'test.junior@usm.cl', '10000000-0000-4000-8000-000000000001'),
	(50000002, 201900002, 1, (SELECT "idCargo" FROM public."Cargo" WHERE "nombreCargo" = 'Senior'),
		'Test Senior', 80000002, 'test.senior@usm.cl', '10000000-0000-4000-8000-000000000002'),
	(50000003, 201900003, 1, (SELECT "idCargo" FROM public."Cargo" WHERE "nombreCargo" = 'Directivo'),
		'Test Directivo', 80000003, 'test.directivo@usm.cl', '10000000-0000-4000-8000-000000000003'),
	(50000004, 201900004, 1, NULL,
		'Test Común', 80000004, 'test.comun@usm.cl', '10000000-0000-4000-8000-000000000004'),
	-- Staff invitado: tiene cargo pero aún no vincula su cuenta (§ 3.2).
	(50000005, 201900005, 1, (SELECT "idCargo" FROM public."Cargo" WHERE "nombreCargo" = 'Junior'),
		'Test Invitado', 80000005, 'TEST.invitado@usm.cl', NULL),
	-- Sansanos sin cuenta para probar suspensiones.
	(50000010, 201900010, 1, NULL, 'Sin suspensión', 80000010, 'test.libre@usm.cl', NULL),
	(50000011, 201900011, 1, NULL, 'Suspensión permanente', 80000011, 'test.permanente@usm.cl', NULL),
	(50000012, 201900012, 1, NULL, 'Suspensión temporal', 80000012, 'test.temporal@usm.cl', NULL),
	(50000013, 201900013, 1, NULL, 'Suspensión vencida', 80000013, 'test.vencida@usm.cl', NULL);

INSERT INTO public."Suspension" ("rutSansano", "rutModerador", "fechaInicio", "fechaTermino", "razon")
VALUES
	(50000011, 50000003, now() - interval '1 day', NULL, 'Permanente'),
	(50000012, 50000003, now() - interval '1 day', now() + interval '7 days', 'Temporal'),
	(50000013, 50000003, now() - interval '10 days', now() - interval '1 day', 'Vencida');

INSERT INTO public."Juego" ("idJuego", "nombreJuego", "tipo")
VALUES (2000000001, '[TEST RLS] Juego', 'Juego base');

INSERT INTO public."Ejemplar" ("idEjemplar", "idJuego", "esExterno", "estadoCompletitud", "estadoEjemplar")
VALUES ('TEST-RLS-1', 2000000001, false, 'Completo', 'En bodega');

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
-- Público (anon)
-- ---------------------------------------------------------------------------------------------
SET LOCAL role anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT ok(
	(SELECT count(*) FROM public."Juego" WHERE "idJuego" = 2000000001) = 1,
	'anon lee Juego'
);
SELECT is((SELECT count(*) FROM public."Ejemplar"), 0::bigint, 'anon no lee Ejemplar');
SELECT is((SELECT count(*) FROM public."Sansano"), 0::bigint, 'anon no lee Sansano');
SELECT is((SELECT count(*) FROM public."Suspension"), 0::bigint, 'anon no lee Suspension');
SELECT is((SELECT count(*) FROM public."Prestamo"), 0::bigint, 'anon no lee Prestamo');
SELECT is((SELECT count(*) FROM public."Solicitud"), 0::bigint, 'anon no lee Solicitud');
SELECT ok(
	(SELECT count(*) FROM public.buscar_catalogo('[TEST RLS]')) = 1,
	'anon sigue usando buscar_catalogo'
);

SELECT lives_ok(
	$$INSERT INTO public."Solicitud" ("rutSansano", "idEjemplar", "fechaSolicitud", "fechaSeleccionada", "estadoSolicitud")
	  VALUES (50000010, 'TEST-RLS-1', now(), current_date + 1, 'Pendiente')$$,
	'anon crea una Solicitud Pendiente'
);
SELECT throws_ok(
	$$INSERT INTO public."Solicitud" ("rutSansano", "idEjemplar", "fechaSolicitud", "fechaSeleccionada", "estadoSolicitud")
	  VALUES (50000010, 'TEST-RLS-1', now(), current_date + 1, 'Aprobada')$$,
	'42501',
	NULL,
	'anon no crea Solicitudes en otro estado'
);
SELECT throws_ok(
	$$INSERT INTO public."Solicitud" ("rutSansano", "idEjemplar", "fechaSolicitud", "fechaSeleccionada", "estadoSolicitud")
	  VALUES (50000011, 'TEST-RLS-1', now(), current_date + 1, 'Pendiente')$$,
	'P0001',
	'El sansano 50000011 tiene una suspensión activa',
	'suspensión permanente bloquea el INSERT'
);
SELECT throws_ok(
	$$INSERT INTO public."Solicitud" ("rutSansano", "idEjemplar", "fechaSolicitud", "fechaSeleccionada", "estadoSolicitud")
	  VALUES (50000012, 'TEST-RLS-1', now(), current_date + 1, 'Pendiente')$$,
	'P0001',
	'El sansano 50000012 tiene una suspensión activa',
	'suspensión con fechaTermino futura bloquea el INSERT'
);
SELECT lives_ok(
	$$INSERT INTO public."Solicitud" ("rutSansano", "idEjemplar", "fechaSolicitud", "fechaSeleccionada", "estadoSolicitud")
	  VALUES (50000013, 'TEST-RLS-1', now(), current_date + 1, 'Pendiente')$$,
	'suspensión vencida no bloquea'
);
SELECT throws_ok(
	$$SELECT public.suspension_activa(50000011)$$,
	'42501',
	NULL,
	'anon no puede consultar suspension_activa'
);
SELECT throws_ok(
	$$INSERT INTO public."Juego" ("nombreJuego", "tipo") VALUES ('[TEST RLS] anon', 'Juego base')$$,
	'42501',
	NULL,
	'anon no escribe Juego'
);

RESET role;

-- ---------------------------------------------------------------------------------------------
-- Funciones de staff
-- ---------------------------------------------------------------------------------------------
SELECT pg_temp.como('10000000-0000-4000-8000-000000000001', 'test.junior@usm.cl');
SELECT is(public.cargo_actual(), 'Junior', 'cargo_actual() distingue Junior');
SELECT ok(public.tiene_permiso('prestamos:junta'), 'Junior tiene prestamos:junta');
SELECT ok(NOT public.tiene_permiso('prestamos:general'), 'Junior no tiene prestamos:general');
RESET role;

SELECT pg_temp.como('10000000-0000-4000-8000-000000000003', 'test.directivo@usm.cl');
SELECT is(public.cargo_actual(), 'Directivo', 'cargo_actual() distingue Directivo');
SELECT is(
	(SELECT cardinality(permisos) FROM public.perfil_staff()),
	9,
	'perfil_staff() devuelve los 9 permisos del Directivo'
);
RESET role;

SELECT pg_temp.como('10000000-0000-4000-8000-000000000004', 'test.comun@usm.cl');
SELECT ok(NOT public.es_staff(), 'un sansano sin cargo no es staff');
SELECT is((SELECT count(*) FROM public."Sansano"), 0::bigint, 'un usuario sin cargo no lee Sansano');
RESET role;

-- Vinculación al primer ingreso (correo insensible a mayúsculas).
SELECT pg_temp.como('10000000-0000-4000-8000-000000000005', 'test.invitado@usm.cl');
SELECT public.vincular_cuenta_staff();
SELECT is(public.cargo_actual(), 'Junior', 'vincular_cuenta_staff() enlaza al invitado');
RESET role;

-- ---------------------------------------------------------------------------------------------
-- Escrituras por permiso
-- ---------------------------------------------------------------------------------------------
SELECT pg_temp.como('10000000-0000-4000-8000-000000000001', 'test.junior@usm.cl');
SELECT throws_ok(
	$$INSERT INTO public."Juego" ("nombreJuego", "tipo") VALUES ('[TEST RLS] junior', 'Juego base')$$,
	'42501',
	NULL,
	'Junior no edita inventario'
);
SELECT throws_ok(
	$$INSERT INTO public."Sansano" ("rutSansano", "rolSansano", "digitoVerificador", "idCargo", "nombreSansano", "telefono", "correoInstitucional")
	  VALUES (50000020, 201900020, 1, (SELECT "idCargo" FROM public."Cargo" WHERE "nombreCargo" = 'Directivo'), 'Escalada', 80000020, 'test.escalada@usm.cl')$$,
	'42501',
	NULL,
	'Junior no crea Sansanos con cargo'
);
SELECT lives_ok(
	$$INSERT INTO public."Sansano" ("rutSansano", "rolSansano", "digitoVerificador", "nombreSansano", "telefono", "correoInstitucional")
	  VALUES (50000021, 201900021, 1, 'Alta cajero', 80000021, 'test.alta@usm.cl')$$,
	'Junior da de alta un sansano común (cajero)'
);
SELECT throws_ok(
	$$INSERT INTO public."Suspension" ("rutSansano", "rutModerador", "fechaInicio", "razon")
	  VALUES (50000010, 50000001, now(), 'No autorizado')$$,
	'42501',
	NULL,
	'Junior no aplica suspensiones'
);
RESET role;

SELECT pg_temp.como('10000000-0000-4000-8000-000000000002', 'test.senior@usm.cl');
SELECT lives_ok(
	$$INSERT INTO public."Juego" ("nombreJuego", "tipo") VALUES ('[TEST RLS] senior', 'Juego base')$$,
	'Senior edita inventario'
);
SELECT throws_ok(
	$$INSERT INTO public."Solicitud" ("rutSansano", "idEjemplar", "fechaSolicitud", "fechaSeleccionada", "estadoSolicitud")
	  VALUES (50000011, 'TEST-RLS-1', now(), current_date, 'Aprobada')$$,
	'P0001',
	'El sansano 50000011 tiene una suspensión activa',
	'la suspensión también bloquea al staff (mesón)'
);
RESET role;

SELECT pg_temp.como('10000000-0000-4000-8000-000000000003', 'test.directivo@usm.cl');
SELECT lives_ok(
	$$INSERT INTO public."Suspension" ("rutSansano", "rutModerador", "fechaInicio", "razon")
	  VALUES (50000010, 50000003, now(), 'Autorizado')$$,
	'Directivo aplica suspensiones'
);
RESET role;

-- Las inserciones directas (service_role/postgres) también respetan el baneo.
SELECT throws_ok(
	$$INSERT INTO public."Solicitud" ("rutSansano", "idEjemplar", "fechaSolicitud", "fechaSeleccionada", "estadoSolicitud")
	  VALUES (50000010, 'TEST-RLS-1', now(), current_date + 1, 'Pendiente')$$,
	'P0001',
	'El sansano 50000010 tiene una suspensión activa',
	'el trigger bloquea incluso sin RLS'
);

SELECT * FROM finish();
ROLLBACK;
