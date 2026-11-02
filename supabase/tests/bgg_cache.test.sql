-- Pruebas de la caché BGG (#8): RLS de JuegoBgg, unicidad de Juego.idBgg y políticas de Storage.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(15);

INSERT INTO auth.users (id, aud, role, email)
VALUES
	('11000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'bgg.junior@usm.cl'),
	('11000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'bgg.senior@usm.cl'),
	('11000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'bgg.directivo@usm.cl');

INSERT INTO public."Sansano" (
	"rutSansano", "rolSansano", "digitoVerificador", "idCargo", "nombreSansano", "telefono",
	"correoInstitucional", "authUserId"
)
VALUES
	(51000001, 202000001, 1, (SELECT "idCargo" FROM public."Cargo" WHERE "nombreCargo" = 'Junior'),
		'Bgg Junior', 81000001, 'bgg.junior@usm.cl', '11000000-0000-4000-8000-000000000001'),
	(51000002, 202000002, 1, (SELECT "idCargo" FROM public."Cargo" WHERE "nombreCargo" = 'Senior'),
		'Bgg Senior', 81000002, 'bgg.senior@usm.cl', '11000000-0000-4000-8000-000000000002'),
	(51000003, 202000003, 1, (SELECT "idCargo" FROM public."Cargo" WHERE "nombreCargo" = 'Directivo'),
		'Bgg Directivo', 81000003, 'bgg.directivo@usm.cl', '11000000-0000-4000-8000-000000000003');

INSERT INTO public."JuegoBgg" ("idBgg", "nombre", "tipo") VALUES (900001, '[TEST BGG] Base', 'Juego base');

INSERT INTO public."Juego" ("idJuego", "nombreJuego", "tipo", "idBgg")
VALUES (2000000101, '[TEST BGG] Juego A', 'Juego base', 900001);

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

-- anon
SET LOCAL role anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SELECT throws_ok(
	$$SELECT count(*) FROM public."JuegoBgg"$$, '42501', NULL, 'anon no lee JuegoBgg'
);
SELECT throws_ok(
	$$INSERT INTO public."JuegoBgg" ("idBgg", "nombre", "tipo") VALUES (900002, 'x', 'Juego base')$$,
	'42501', NULL, 'anon no escribe JuegoBgg'
);

-- junior (sin inventario:editar)
SELECT pg_temp.como('11000000-0000-4000-8000-000000000001', 'bgg.junior@usm.cl');
SELECT is((SELECT count(*) FROM public."JuegoBgg"), 0::bigint, 'junior no lee JuegoBgg');
SELECT throws_ok(
	$$INSERT INTO public."JuegoBgg" ("idBgg", "nombre", "tipo") VALUES (900002, 'x', 'Juego base')$$,
	'42501', NULL, 'junior no escribe JuegoBgg'
);
SELECT throws_ok(
	$$INSERT INTO storage.objects (bucket_id, name) VALUES ('ludoteca', 'bgg/900002.jpg')$$,
	'42501', NULL, 'junior no sube carátulas'
);

SELECT throws_ok(
	$$SELECT * FROM public.buscar_juegos_bgg('base')$$, '42501', NULL, 'junior no usa buscar_juegos_bgg'
);

-- senior
SELECT pg_temp.como('11000000-0000-4000-8000-000000000002', 'bgg.senior@usm.cl');
SELECT is((SELECT count(*) FROM public."JuegoBgg" WHERE "idBgg" = 900001), 1::bigint, 'senior lee JuegoBgg');
SELECT lives_ok(
	$$INSERT INTO public."JuegoBgg" ("idBgg", "nombre", "tipo") VALUES (900002, 'Nuevo', 'Juego base')$$,
	'senior inserta en JuegoBgg'
);
SELECT lives_ok(
	$$UPDATE public."JuegoBgg" SET "nombre" = 'Editado' WHERE "idBgg" = 900002$$,
	'senior actualiza JuegoBgg'
);
SELECT lives_ok(
	$$INSERT INTO storage.objects (bucket_id, name) VALUES ('ludoteca', 'bgg/900002.jpg')$$,
	'senior sube carátulas bajo bgg/'
);
SELECT throws_ok(
	$$INSERT INTO storage.objects (bucket_id, name) VALUES ('ludoteca', 'otro/900002.jpg')$$,
	'42501', NULL, 'senior no sube fuera del prefijo bgg/'
);

SELECT is(
	(SELECT count(*) FROM public.buscar_juegos_bgg('test bgg')), 1::bigint,
	'buscar_juegos_bgg une Juego y caché sin duplicar el mismo idBgg'
);
SELECT is(
	(SELECT "idJuego" FROM public.buscar_juegos_bgg('juego a')), 2000000101,
	'buscar_juegos_bgg marca los juegos ya presentes en el catálogo'
);
SELECT is(
	(SELECT count(*) FROM public.buscar_juegos_bgg('50%')), 0::bigint,
	'buscar_juegos_bgg escapa los comodines LIKE'
);

-- directivo + unicidad de Juego.idBgg
SELECT pg_temp.como('11000000-0000-4000-8000-000000000003', 'bgg.directivo@usm.cl');
SELECT throws_ok(
	$$INSERT INTO public."Juego" ("nombreJuego", "tipo", "idBgg") VALUES ('[TEST BGG] Juego B', 'Juego base', 900001)$$,
	'23505', NULL, 'Juego.idBgg es único'
);

SELECT * FROM finish();
ROLLBACK;
