-- Pruebas de la gestión de staff (#20): buscar_staff, invitar_staff, eliminar_staff y autoprotección.
-- Ejecutar con `make test-db` (supabase test db). Todo corre en una transacción revertida.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(24);

INSERT INTO auth.users (id, aud, role, email)
VALUES
	('11000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'gs.junior@usm.cl'),
	('11000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'gs.directivo@usm.cl'),
	('11000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'gs.comun@usm.cl'),
	('11000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'gs.conacceso@usm.cl');

INSERT INTO public."Sansano" (
	"rutSansano", "rolSansano", "digitoVerificador", "idCargo", "nombreSansano", "telefono",
	"correoInstitucional", "authUserId"
)
VALUES
	(51000001, 202000001, 1, (SELECT "idCargo" FROM public."Cargo" WHERE "nombreCargo" = 'Junior'),
		'Qwz Ñandú Gestión', 81000001, 'gs.junior@usm.cl', '11000000-0000-4000-8000-000000000001'),
	(51000003, 202000003, 1, (SELECT "idCargo" FROM public."Cargo" WHERE "nombreCargo" = 'Directivo'),
		'Qwz Directora Gestión', 81000003, 'gs.directivo@usm.cl', '11000000-0000-4000-8000-000000000003'),
	(51000004, 202000004, 1, NULL,
		'Qwz Común Gestión', 81000004, 'gs.comun@usm.cl', '11000000-0000-4000-8000-000000000004'),
	-- Staff sin cuenta ni historial (se puede eliminar) y sin cargo (no aparece en la nómina).
	(51000005, 202000005, 1, (SELECT "idCargo" FROM public."Cargo" WHERE "nombreCargo" = 'Senior'),
		'Qwz Pendiente Gestión', 81000005, 'gs.pendiente@usm.cl', NULL),
	-- Staff con cuenta y sin historial: eliminar_staff debe borrar también su usuario de Auth.
	(51000006, 202000006, 1, (SELECT "idCargo" FROM public."Cargo" WHERE "nombreCargo" = 'Junior'),
		'Con Acceso Borrable', 81000006, 'gs.conacceso@usm.cl', '11000000-0000-4000-8000-000000000006');

INSERT INTO public."Suspension" ("rutSansano", "rutModerador", "fechaInicio", "razon")
VALUES (51000004, 51000003, now(), 'Prueba gestión staff');

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

-- Sin sesión de staff no hay nómina.
SET LOCAL role anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SELECT throws_ok(
	$$SELECT * FROM public.buscar_staff('qwz')$$,
	'permission denied for function buscar_staff',
	'anon no consulta la nómina'
);
RESET role;

SELECT pg_temp.como('11000000-0000-4000-8000-000000000004', 'gs.comun@usm.cl');
SELECT throws_ok(
	$$SELECT * FROM public.buscar_staff('qwz')$$,
	'42501',
	'Solo el staff puede consultar la nómina',
	'un sansano sin cargo no consulta la nómina'
);
RESET role;

-- Junior solo lee.
SELECT pg_temp.como('11000000-0000-4000-8000-000000000001', 'gs.junior@usm.cl');
SELECT is(
	(SELECT count(*) FROM public.buscar_staff('qwz', NULL, 0, 50)),
	3::bigint,
	'Junior lista el staff (excluye a quien no tiene cargo)'
);
SELECT is(
	(SELECT count(*) FROM public.buscar_staff('NANDU')),
	1::bigint,
	'la búsqueda ignora tildes y mayúsculas'
);
SELECT is(
	(SELECT count(*) FROM public.buscar_staff('GS.DIRECTIVO@')),
	1::bigint,
	'busca por correo'
);
SELECT is(
	(SELECT count(*) FROM public.buscar_staff('qwz', (SELECT "idCargo" FROM public."Cargo" WHERE "nombreCargo" = 'Senior'), 0, 50)),
	1::bigint,
	'filtra por cargo'
);
SELECT is(
	(SELECT "total" FROM public.buscar_staff('qwz', NULL, 0, 1)),
	3::bigint,
	'total refleja todas las coincidencias aunque la página sea de 1'
);
SELECT is(
	(SELECT count(*) FROM public.buscar_staff('qwz', NULL, 2, 50)),
	1::bigint,
	'offset salta filas'
);
SELECT is(
	(SELECT "suspensiones" FROM public.buscar_staff('qwz directora')),
	1::bigint,
	'cuenta la historia como moderador'
);
RESET role;

-- Junior no gestiona: las RPCs exigen usuarios:gestionar.
SELECT pg_temp.como('11000000-0000-4000-8000-000000000001', 'gs.junior@usm.cl');
SELECT throws_ok(
	$$SELECT public.invitar_staff('gs.nuevo@usm.cl', 1, 51000020, 1::smallint, 202000020, 'Nuevo', 81000020)$$,
	'42501',
	NULL,
	'Junior no invita'
);
SELECT throws_ok(
	$$SELECT public.eliminar_staff(51000005)$$,
	'42501',
	NULL,
	'Junior no elimina'
);
RESET role;

-- Directivo: invitar (wiki § 3.2).
SELECT pg_temp.como('11000000-0000-4000-8000-000000000003', 'gs.directivo@usm.cl');
SELECT throws_ok(
	$$SELECT public.invitar_staff('gs.nuevo@usm.cl', (SELECT "idCargo" FROM public."Cargo" WHERE "nombreCargo" = 'Junior'))$$,
	'CS002',
	NULL,
	'correo nuevo sin datos del sansano → faltan datos'
);
SELECT is(
	public.invitar_staff(
		'gs.nuevo@usm.cl',
		(SELECT "idCargo" FROM public."Cargo" WHERE "nombreCargo" = 'Junior'),
		51000020, 1::smallint, 202000020, 'Qwz Nuevo Invitado', 81000020
	),
	'invitar',
	'correo nuevo con datos → alta pendiente de invitación'
);
SELECT ok(
	EXISTS (
		SELECT 1 FROM public."Sansano"
		WHERE "rutSansano" = 51000020 AND "idCargo" IS NOT NULL AND "authUserId" IS NULL
	),
	'el invitado queda con cargo y sin cuenta vinculada'
);
SELECT throws_ok(
	$$SELECT public.invitar_staff('GS.JUNIOR@usm.cl', (SELECT "idCargo" FROM public."Cargo" WHERE "nombreCargo" = 'Senior'))$$,
	'CS001',
	NULL,
	'correo con cuenta activa en el staff → se reasigna desde la ficha, no se invita'
);
SELECT is(
	public.invitar_staff('gs.comun@usm.cl', (SELECT "idCargo" FROM public."Cargo" WHERE "nombreCargo" = 'Junior')),
	'activo',
	'sansano sin cargo pero con cuenta → solo se le asigna cargo'
);

-- Autoprotección: nadie cambia ni quita su propio cargo.
SELECT throws_ok(
	$$UPDATE public."Sansano" SET "idCargo" = NULL WHERE "rutSansano" = 51000003$$,
	'CS004',
	NULL,
	'el Directivo no se da de baja a sí mismo'
);
SELECT lives_ok(
	$$UPDATE public."Sansano" SET "nombreSansano" = 'Qwz Directora Renombrada' WHERE "rutSansano" = 51000003$$,
	'el Directivo sí edita sus otros datos'
);

-- Eliminar (wiki § 3.1).
SELECT throws_ok(
	$$SELECT public.eliminar_staff(51000003)$$,
	'CS004',
	NULL,
	'el Directivo no se elimina a sí mismo'
);
SELECT throws_ok(
	$$SELECT public.eliminar_staff(51000004)$$,
	'CS003',
	NULL,
	'con historial (suspensión) no se elimina'
);
SELECT lives_ok(
	$$SELECT public.eliminar_staff(51000006)$$,
	'sin historial se elimina'
);
RESET role;

SELECT is(
	(SELECT count(*) FROM public."Sansano" WHERE "rutSansano" = 51000006),
	0::bigint,
	'el registro eliminado ya no existe'
);
SELECT is(
	(SELECT count(*) FROM auth.users WHERE id = '11000000-0000-4000-8000-000000000006'),
	0::bigint,
	'eliminar_staff revoca también la cuenta de Auth'
);

-- La FK RESTRICT sigue siendo la garantía final ante un DELETE directo.
SELECT pg_temp.como('11000000-0000-4000-8000-000000000003', 'gs.directivo@usm.cl');
SELECT throws_ok(
	$$DELETE FROM public."Sansano" WHERE "rutSansano" = 51000004$$,
	'23503',
	NULL,
	'un DELETE directo con historial lo bloquea RESTRICT'
);
RESET role;

SELECT * FROM finish();
ROLLBACK;
