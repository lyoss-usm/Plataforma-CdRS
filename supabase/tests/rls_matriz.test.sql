-- Matriz de autorización (#7): persona × tabla × operación → permitido/denegado, más los casos de
-- las funciones de staff y del ciclo de vida de una cuenta (vinculación, ascenso, baja).
-- Ejecutar con `make test-db`. Todo corre en una transacción revertida.
--
-- Personas (clave de una letra):
--   A anon · C autenticado sin cargo · I invitado (cargo, cuenta sin vincular)
--   J Junior · S Senior · D Directivo
--   X sin cargo y sin vincular · B correo de una fila ya vinculada a otra cuenta
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT * FROM no_plan();

-- ---------------------------------------------------------------------------------------------
-- Fixtures (como postgres, sin RLS)
-- ---------------------------------------------------------------------------------------------
INSERT INTO auth.users (id, aud, role, email)
VALUES
	('a0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'test.mat.junior@usm.cl'),
	('a0000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'test.mat.senior@usm.cl'),
	('a0000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'test.mat.directivo@usm.cl'),
	('a0000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'test.mat.comun@usm.cl'),
	('a0000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'test.mat.invitado@usm.cl'),
	('a0000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'test.mat.sincargo@usm.cl'),
	('a0000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'test.mat.titular@usm.cl'),
	('a0000000-0000-4000-8000-000000000008', 'authenticated', 'authenticated', 'test.mat.secuestro@usm.cl');

INSERT INTO public."Sansano" (
	"rutSansano", "rolSansano", "digitoVerificador", "idCargo", "nombreSansano", "telefono",
	"correoInstitucional", "authUserId"
)
VALUES
	(50000001, 201800001, 1, (SELECT "idCargo" FROM public."Cargo" WHERE "nombreCargo" = 'Junior'),
		'Mat Junior', 70000001, 'test.mat.junior@usm.cl', 'a0000000-0000-4000-8000-000000000001'),
	(50000002, 201800002, 1, (SELECT "idCargo" FROM public."Cargo" WHERE "nombreCargo" = 'Senior'),
		'Mat Senior', 70000002, 'test.mat.senior@usm.cl', 'a0000000-0000-4000-8000-000000000002'),
	(50000003, 201800003, 1, (SELECT "idCargo" FROM public."Cargo" WHERE "nombreCargo" = 'Directivo'),
		'Mat Directivo', 70000003, 'test.mat.directivo@usm.cl', 'a0000000-0000-4000-8000-000000000003'),
	(50000004, 201800004, 1, NULL,
		'Mat Común', 70000004, 'test.mat.comun@usm.cl', 'a0000000-0000-4000-8000-000000000004'),
	(50000005, 201800005, 1, (SELECT "idCargo" FROM public."Cargo" WHERE "nombreCargo" = 'Junior'),
		'Mat Invitado', 70000005, 'test.mat.invitado@usm.cl', NULL),
	(50000006, 201800006, 1, NULL,
		'Mat Sin cargo sin vincular', 70000006, 'test.mat.sincargo@usm.cl', NULL),
	(50000007, 201800007, 1, (SELECT "idCargo" FROM public."Cargo" WHERE "nombreCargo" = 'Senior'),
		'Mat Secuestro', 70000007, 'test.mat.secuestro@usm.cl', 'a0000000-0000-4000-8000-000000000007'),
	(50000010, 201800010, 1, NULL, 'Mat libre', 70000010, 'test.mat.libre@usm.cl', NULL),
	(50000011, 201800011, 1, NULL, 'Mat suspendido', 70000011, 'test.mat.suspendido@usm.cl', NULL),
	(50000050, 201800050, 1, NULL, 'Mat para UPDATE', 70000050, 'test.mat.upd@usm.cl', NULL),
	(50000051, 201800051, 1, NULL, 'Mat para DELETE', 70000051, 'test.mat.del@usm.cl', NULL);

INSERT INTO public."Suspension" ("idSuspencion", "rutSansano", "rutModerador", "fechaInicio", "razon")
VALUES (2000000001, 50000011, 50000003, now() - interval '1 day', 'Fixture');

INSERT INTO public."Juego" ("idJuego", "nombreJuego", "tipo")
VALUES
	(2000000001, '[TEST MAT] Juego', 'Juego base'),
	(2000000002, '[TEST MAT] Juego sin ejemplares', 'Juego base');

INSERT INTO public."Ejemplar" ("idEjemplar", "idJuego", "esExterno", "estadoCompletitud", "estadoEjemplar")
VALUES
	('TEST-MAT-1', 2000000001, false, 'Completo', 'En bodega'),
	('TEST-MAT-DEL', 2000000001, false, 'Completo', 'En bodega');

INSERT INTO public."Solicitud" (
	"idSolicitud", "rutSansano", "idEjemplar", "fechaSolicitud", "fechaSeleccionada", "estadoSolicitud"
)
VALUES (2000000001, 50000010, 'TEST-MAT-1', now(), current_date + 1, 'Pendiente');

INSERT INTO public."Prestamo" ("idPrestamo", "idSolicitud", "rutPrestador", "fechaRetiro", "estadoPrestamo")
VALUES (2000000001, 2000000001, 50000003, now(), 'Activo');

INSERT INTO public."Cargo" ("nombreCargo") VALUES ('[TEST MAT] cargo');
INSERT INTO public."Permiso" ("nombrePermiso") VALUES ('[TEST MAT] permiso:accion');

CREATE TEMP TABLE personas (
	clave TEXT PRIMARY KEY,
	nombre TEXT NOT NULL,
	rol TEXT NOT NULL,
	uid UUID,
	email TEXT,
	en_matriz BOOLEAN NOT NULL
);

INSERT INTO personas (clave, nombre, rol, uid, email, en_matriz)
VALUES
	('A', 'anon', 'anon', NULL, NULL, true),
	('C', 'sin cargo', 'authenticated', 'a0000000-0000-4000-8000-000000000004', 'test.mat.comun@usm.cl', true),
	('I', 'invitado', 'authenticated', 'a0000000-0000-4000-8000-000000000005', 'test.mat.invitado@usm.cl', true),
	('J', 'Junior', 'authenticated', 'a0000000-0000-4000-8000-000000000001', 'test.mat.junior@usm.cl', true),
	('S', 'Senior', 'authenticated', 'a0000000-0000-4000-8000-000000000002', 'test.mat.senior@usm.cl', true),
	('D', 'Directivo', 'authenticated', 'a0000000-0000-4000-8000-000000000003', 'test.mat.directivo@usm.cl', true),
	('X', 'sin cargo sin vincular', 'authenticated', 'a0000000-0000-4000-8000-000000000006', 'test.mat.sincargo@usm.cl', false),
	('B', 'correo ya vinculado a otra cuenta', 'authenticated', 'a0000000-0000-4000-8000-000000000008', 'test.mat.secuestro@usm.cl', false);

-- Ejecuta una sentencia como la persona indicada. Modos:
--   efecto    → 'true' si la sentencia tuvo efecto (filas devueltas/afectadas > 0), 'false' si fue
--               filtrada por RLS o lanzó error; se revierte para no alterar los fixtures
--   valor     → primer valor de la consulta como texto ('error' si falla); se revierte
--   persistir → ejecuta y conserva los cambios (vuelve a postgres al terminar)
CREATE FUNCTION pg_temp.ejecutar(p_clave TEXT, p_sql TEXT, p_modo TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
	v_rol TEXT;
	v_uid UUID;
	v_email TEXT;
	v_res TEXT := CASE p_modo WHEN 'valor' THEN 'error' ELSE 'false' END;
	v_n BIGINT;
	v_valor TEXT;
BEGIN
	SELECT p.rol, p.uid, p.email INTO v_rol, v_uid, v_email
	FROM pg_temp.personas AS p WHERE p.clave = p_clave;

	IF p_modo = 'persistir' THEN
		PERFORM set_config(
			'request.jwt.claims',
			json_build_object('sub', v_uid, 'email', v_email, 'role', v_rol)::text,
			true
		);
		PERFORM set_config('role', v_rol, true);
		EXECUTE p_sql;
		RESET role;
		RETURN NULL;
	END IF;

	BEGIN
		PERFORM set_config(
			'request.jwt.claims',
			CASE WHEN v_uid IS NULL
				THEN '{"role":"anon"}'
				ELSE json_build_object('sub', v_uid, 'email', v_email, 'role', v_rol)::text
			END,
			true
		);
		PERFORM set_config('role', v_rol, true);

		IF p_modo = 'valor' THEN
			EXECUTE p_sql INTO v_valor;
			v_res := v_valor;
		ELSE
			EXECUTE p_sql;
			GET DIAGNOSTICS v_n = ROW_COUNT;
			v_res := (v_n > 0)::text;
		END IF;

		RAISE EXCEPTION 'revertir' USING ERRCODE = 'XX999';
	EXCEPTION
		WHEN SQLSTATE 'XX999' THEN NULL;
		WHEN OTHERS THEN NULL;
	END;

	RETURN v_res;
END;
$$;

-- ---------------------------------------------------------------------------------------------
-- 1. Matriz tabla × operación. `permitido` lista las personas que SÍ deben poder.
-- ---------------------------------------------------------------------------------------------
CREATE TEMP TABLE ops (tabla TEXT, operacion TEXT, sql TEXT, permitido TEXT);

INSERT INTO ops (tabla, operacion, sql, permitido)
VALUES
	-- Juego: lectura pública; edición por inventario.
	('Juego', 'SELECT', $q$SELECT 1 FROM public."Juego" WHERE "idJuego" = 2000000001$q$, 'ACIJSD'),
	('Juego', 'INSERT', $q$INSERT INTO public."Juego" ("nombreJuego", "tipo") VALUES ('[TEST MAT] nuevo', 'Juego base')$q$, 'SD'),
	('Juego', 'UPDATE', $q$UPDATE public."Juego" SET "nombreJuego" = "nombreJuego" WHERE "idJuego" = 2000000001$q$, 'SD'),
	('Juego', 'DELETE', $q$DELETE FROM public."Juego" WHERE "idJuego" = 2000000002$q$, 'SD'),

	-- Ejemplar: inventario interno.
	('Ejemplar', 'SELECT', $q$SELECT 1 FROM public."Ejemplar" WHERE "idEjemplar" = 'TEST-MAT-1'$q$, 'JSD'),
	('Ejemplar', 'INSERT', $q$INSERT INTO public."Ejemplar" ("idEjemplar", "idJuego", "esExterno", "estadoCompletitud", "estadoEjemplar") VALUES ('TEST-MAT-NEW', 2000000001, false, 'Completo', 'En bodega')$q$, 'SD'),
	('Ejemplar', 'UPDATE', $q$UPDATE public."Ejemplar" SET "situacion" = 'x' WHERE "idEjemplar" = 'TEST-MAT-1'$q$, 'JSD'),
	('Ejemplar', 'DELETE', $q$DELETE FROM public."Ejemplar" WHERE "idEjemplar" = 'TEST-MAT-DEL'$q$, 'SD'),

	-- Solicitud: el público solo crea Pendientes; el baneo bloquea a todos.
	('Solicitud', 'SELECT', $q$SELECT 1 FROM public."Solicitud" WHERE "idSolicitud" = 2000000001$q$, 'JSD'),
	('Solicitud', 'INSERT Pendiente', $q$INSERT INTO public."Solicitud" ("rutSansano", "idEjemplar", "fechaSolicitud", "fechaSeleccionada", "estadoSolicitud") VALUES (50000010, 'TEST-MAT-1', now(), current_date + 1, 'Pendiente')$q$, 'AJSD'),
	('Solicitud', 'INSERT Aprobada', $q$INSERT INTO public."Solicitud" ("rutSansano", "idEjemplar", "fechaSolicitud", "fechaSeleccionada", "estadoSolicitud") VALUES (50000010, 'TEST-MAT-1', now(), current_date + 1, 'Aprobada')$q$, 'JSD'),
	('Solicitud', 'INSERT suspendido', $q$INSERT INTO public."Solicitud" ("rutSansano", "idEjemplar", "fechaSolicitud", "fechaSeleccionada", "estadoSolicitud") VALUES (50000011, 'TEST-MAT-1', now(), current_date + 1, 'Pendiente')$q$, ''),
	('Solicitud', 'UPDATE', $q$UPDATE public."Solicitud" SET "fechaSeleccionada" = "fechaSeleccionada" WHERE "idSolicitud" = 2000000001$q$, 'JSD'),
	('Solicitud', 'DELETE', $q$DELETE FROM public."Solicitud" WHERE "idSolicitud" = 2000000001$q$, ''),

	-- Prestamo: solo staff con permiso de préstamos; nunca se borra.
	('Prestamo', 'SELECT', $q$SELECT 1 FROM public."Prestamo" WHERE "idPrestamo" = 2000000001$q$, 'JSD'),
	('Prestamo', 'INSERT', $q$INSERT INTO public."Prestamo" ("idSolicitud", "rutPrestador", "fechaRetiro", "estadoPrestamo") VALUES (2000000001, 50000003, now(), 'Activo')$q$, 'JSD'),
	('Prestamo', 'UPDATE', $q$UPDATE public."Prestamo" SET "comentarios" = 'x' WHERE "idPrestamo" = 2000000001$q$, 'JSD'),
	('Prestamo', 'DELETE', $q$DELETE FROM public."Prestamo" WHERE "idPrestamo" = 2000000001$q$, ''),

	-- Sansano: datos personales; solo usuarios:gestionar asigna cargos o cuentas.
	('Sansano', 'SELECT', $q$SELECT 1 FROM public."Sansano" WHERE "rutSansano" = 50000003$q$, 'JSD'),
	('Sansano', 'INSERT sin cargo', $q$INSERT INTO public."Sansano" ("rutSansano", "rolSansano", "digitoVerificador", "nombreSansano", "telefono", "correoInstitucional") VALUES (50000040, 201800040, 1, 'Nuevo', 70000040, 'test.mat.nuevo@usm.cl')$q$, 'JSD'),
	('Sansano', 'INSERT con cargo', format($q$INSERT INTO public."Sansano" ("rutSansano", "rolSansano", "digitoVerificador", "idCargo", "nombreSansano", "telefono", "correoInstitucional") VALUES (50000041, 201800041, 1, %s, 'Nuevo staff', 70000041, 'test.mat.nuevostaff@usm.cl')$q$, (SELECT "idCargo" FROM public."Cargo" WHERE "nombreCargo" = 'Junior')), 'D'),
	('Sansano', 'UPDATE', $q$UPDATE public."Sansano" SET "nombreSansano" = "nombreSansano" WHERE "rutSansano" = 50000050$q$, 'D'),
	('Sansano', 'UPDATE auto-asignar cargo', format($q$UPDATE public."Sansano" SET "idCargo" = %s WHERE "rutSansano" = 50000001$q$, (SELECT "idCargo" FROM public."Cargo" WHERE "nombreCargo" = 'Directivo')), 'D'),
	('Sansano', 'DELETE', $q$DELETE FROM public."Sansano" WHERE "rutSansano" = 50000051$q$, 'D'),

	-- Suspension: solo moderación escribe; es historial (sin DELETE).
	('Suspension', 'SELECT', $q$SELECT 1 FROM public."Suspension" WHERE "idSuspencion" = 2000000001$q$, 'JSD'),
	('Suspension', 'INSERT', $q$INSERT INTO public."Suspension" ("rutSansano", "rutModerador", "fechaInicio", "razon") VALUES (50000010, 50000003, now(), 'x')$q$, 'D'),
	('Suspension', 'UPDATE', $q$UPDATE public."Suspension" SET "razon" = 'y' WHERE "idSuspencion" = 2000000001$q$, 'D'),
	('Suspension', 'DELETE', $q$DELETE FROM public."Suspension" WHERE "idSuspencion" = 2000000001$q$, ''),

	-- Cargo / Permiso / CargoPermiso: la matriz de permisos la administra usuarios:gestionar.
	('Cargo', 'SELECT', $q$SELECT 1 FROM public."Cargo" WHERE "nombreCargo" = 'Junior'$q$, 'JSD'),
	('Cargo', 'INSERT', $q$INSERT INTO public."Cargo" ("nombreCargo") VALUES ('[TEST MAT] cargo nuevo')$q$, 'D'),
	('Cargo', 'UPDATE', $q$UPDATE public."Cargo" SET "descripcionCargo" = 'x' WHERE "nombreCargo" = '[TEST MAT] cargo'$q$, 'D'),
	('Cargo', 'DELETE', $q$DELETE FROM public."Cargo" WHERE "nombreCargo" = '[TEST MAT] cargo'$q$, 'D'),

	('Permiso', 'SELECT', $q$SELECT 1 FROM public."Permiso" WHERE "nombrePermiso" = 'prestamos:junta'$q$, 'JSD'),
	('Permiso', 'INSERT', $q$INSERT INTO public."Permiso" ("nombrePermiso") VALUES ('[TEST MAT] permiso:nuevo')$q$, 'D'),
	('Permiso', 'UPDATE', $q$UPDATE public."Permiso" SET "descripcionPermiso" = 'x' WHERE "nombrePermiso" = '[TEST MAT] permiso:accion'$q$, 'D'),
	('Permiso', 'DELETE', $q$DELETE FROM public."Permiso" WHERE "nombrePermiso" = '[TEST MAT] permiso:accion'$q$, 'D'),

	('CargoPermiso', 'SELECT', $q$SELECT 1 FROM public."CargoPermiso" LIMIT 1$q$, 'JSD'),
	('CargoPermiso', 'INSERT', format($q$INSERT INTO public."CargoPermiso" ("idCargo", "idPermiso") VALUES (%s, %s)$q$, (SELECT "idCargo" FROM public."Cargo" WHERE "nombreCargo" = 'Junior'), (SELECT "idPermiso" FROM public."Permiso" WHERE "nombrePermiso" = 'usuarios:gestionar')), 'D'),
	('CargoPermiso', 'UPDATE', format($q$UPDATE public."CargoPermiso" SET "idCargo" = "idCargo" WHERE "idCargo" = %s AND "idPermiso" = %s$q$, (SELECT "idCargo" FROM public."Cargo" WHERE "nombreCargo" = 'Junior'), (SELECT "idPermiso" FROM public."Permiso" WHERE "nombrePermiso" = 'catalogo:leer')), 'D'),
	('CargoPermiso', 'DELETE', format($q$DELETE FROM public."CargoPermiso" WHERE "idCargo" = %s AND "idPermiso" = %s$q$, (SELECT "idCargo" FROM public."Cargo" WHERE "nombreCargo" = 'Junior'), (SELECT "idPermiso" FROM public."Permiso" WHERE "nombrePermiso" = 'catalogo:leer')), 'D');

SELECT is(
	pg_temp.ejecutar(p.clave, o.sql, 'efecto'),
	(position(p.clave IN o.permitido) > 0)::text,
	p.nombre || ' · ' || o.operacion || ' en ' || o.tabla
	|| CASE WHEN position(p.clave IN o.permitido) > 0 THEN ' permitido' ELSE ' denegado' END
)
FROM ops AS o
CROSS JOIN personas AS p
WHERE p.en_matriz
ORDER BY o.tabla, o.operacion, p.clave;

-- ---------------------------------------------------------------------------------------------
-- 2. Funciones de staff: quién puede ejecutarlas y qué devuelven a cada persona.
-- ---------------------------------------------------------------------------------------------
SELECT is(
	has_function_privilege('anon', f, 'EXECUTE'),
	false,
	'anon no ejecuta ' || f
)
FROM unnest(ARRAY[
	'public.rut_staff_actual()',
	'public.es_staff()',
	'public.cargo_actual()',
	'public.tiene_permiso(text)',
	'public.perfil_staff()',
	'public.vincular_cuenta_staff()',
	'public.suspension_activa(integer)'
]) AS f;

CREATE TEMP TABLE consultas (clave TEXT, sql TEXT, esperado TEXT);

INSERT INTO consultas (clave, sql, esperado)
VALUES
	('A', 'SELECT public.es_staff()::text', 'error'),
	('C', 'SELECT public.es_staff()::text', 'false'),
	('I', 'SELECT public.es_staff()::text', 'false'),
	('J', 'SELECT public.es_staff()::text', 'true'),
	('S', 'SELECT public.es_staff()::text', 'true'),
	('D', 'SELECT public.es_staff()::text', 'true'),

	('A', 'SELECT public.cargo_actual()', 'error'),
	('C', 'SELECT public.cargo_actual()', NULL),
	('I', 'SELECT public.cargo_actual()', NULL),
	('J', 'SELECT public.cargo_actual()', 'Junior'),
	('S', 'SELECT public.cargo_actual()', 'Senior'),
	('D', 'SELECT public.cargo_actual()', 'Directivo'),

	('C', $$SELECT public.tiene_permiso('prestamos:junta')::text$$, 'false'),
	('I', $$SELECT public.tiene_permiso('prestamos:junta')::text$$, 'false'),
	('J', $$SELECT public.tiene_permiso('prestamos:junta')::text$$, 'true'),
	('J', $$SELECT public.tiene_permiso('prestamos:general')::text$$, 'false'),
	('J', $$SELECT public.tiene_permiso('inventario:editar')::text$$, 'false'),
	('S', $$SELECT public.tiene_permiso('prestamos:general')::text$$, 'true'),
	('S', $$SELECT public.tiene_permiso('inventario:eliminar')::text$$, 'true'),
	('S', $$SELECT public.tiene_permiso('usuarios:gestionar')::text$$, 'false'),
	('S', $$SELECT public.tiene_permiso('moderacion:suspender')::text$$, 'false'),
	('D', $$SELECT public.tiene_permiso('usuarios:gestionar')::text$$, 'true'),
	('D', $$SELECT public.tiene_permiso('moderacion:suspender')::text$$, 'true'),

	('C', 'SELECT count(*)::text FROM public.perfil_staff()', '0'),
	('I', 'SELECT count(*)::text FROM public.perfil_staff()', '0'),
	('J', 'SELECT cardinality(permisos)::text FROM public.perfil_staff()', '3'),
	('S', 'SELECT cardinality(permisos)::text FROM public.perfil_staff()', '7'),
	('D', 'SELECT cardinality(permisos)::text FROM public.perfil_staff()', '9'),

	('A', 'SELECT public.suspension_activa(50000011)::text', 'error'),
	-- Quien no es staff no debe poder averiguar quién está suspendido.
	('C', 'SELECT public.suspension_activa(50000011)::text', 'error'),
	('I', 'SELECT public.suspension_activa(50000011)::text', 'error'),
	('J', 'SELECT public.suspension_activa(50000011)::text', 'true'),
	('J', 'SELECT public.suspension_activa(50000010)::text', 'false');

SELECT is(
	pg_temp.ejecutar(c.clave, c.sql, 'valor'),
	c.esperado,
	p.nombre || ' · ' || c.sql
)
FROM consultas AS c
JOIN personas AS p USING (clave)
ORDER BY c.sql, c.clave;

-- ---------------------------------------------------------------------------------------------
-- 3. Vinculación de cuentas al primer ingreso (§ 3.2)
-- ---------------------------------------------------------------------------------------------
SELECT pg_temp.ejecutar('I', 'SELECT public.vincular_cuenta_staff()', 'persistir');
SELECT is(
	(SELECT "authUserId" FROM public."Sansano" WHERE "rutSansano" = 50000005),
	'a0000000-0000-4000-8000-000000000005'::uuid,
	'el invitado queda vinculado por correo'
);
SELECT is(pg_temp.ejecutar('I', 'SELECT public.cargo_actual()', 'valor'), 'Junior', 'el invitado vinculado opera como Junior');
SELECT is(pg_temp.ejecutar('I', 'SELECT public.es_staff()::text', 'valor'), 'true', 'el invitado vinculado es staff');

SELECT pg_temp.ejecutar('X', 'SELECT public.vincular_cuenta_staff()', 'persistir');
SELECT is(
	(SELECT "authUserId" FROM public."Sansano" WHERE "rutSansano" = 50000006),
	NULL::uuid,
	'una fila sin cargo no se vincula'
);
SELECT is(pg_temp.ejecutar('X', 'SELECT public.es_staff()::text', 'valor'), 'false', 'sin cargo sigue sin ser staff');

SELECT pg_temp.ejecutar('B', 'SELECT public.vincular_cuenta_staff()', 'persistir');
SELECT is(
	(SELECT "authUserId" FROM public."Sansano" WHERE "rutSansano" = 50000007),
	'a0000000-0000-4000-8000-000000000007'::uuid,
	'una fila ya vinculada a otra cuenta no se secuestra'
);
SELECT is(pg_temp.ejecutar('B', 'SELECT public.es_staff()::text', 'valor'), 'false', 'quien no logró vincular no es staff');

-- ---------------------------------------------------------------------------------------------
-- 4. Cambios de cargo con efecto inmediato (§ 3.1): ascenso y baja
-- ---------------------------------------------------------------------------------------------
UPDATE public."Sansano"
SET "idCargo" = (SELECT "idCargo" FROM public."Cargo" WHERE "nombreCargo" = 'Senior')
WHERE "rutSansano" = 50000001;

SELECT is(pg_temp.ejecutar('J', 'SELECT public.cargo_actual()', 'valor'), 'Senior', 'el ascenso aplica sin reiniciar sesión');
SELECT is(
	pg_temp.ejecutar('J', $q$UPDATE public."Juego" SET "nombreJuego" = "nombreJuego" WHERE "idJuego" = 2000000001$q$, 'efecto'),
	'true',
	'tras el ascenso puede editar inventario'
);

UPDATE public."Sansano" SET "idCargo" = NULL WHERE "rutSansano" = 50000001;

SELECT is(pg_temp.ejecutar('J', 'SELECT public.es_staff()::text', 'valor'), 'false', 'la baja revoca es_staff al instante');
SELECT is(pg_temp.ejecutar('J', 'SELECT count(*)::text FROM public.perfil_staff()', 'valor'), '0', 'la baja deja sin perfil de staff');
SELECT is(
	pg_temp.ejecutar('J', $q$SELECT 1 FROM public."Ejemplar" WHERE "idEjemplar" = 'TEST-MAT-1'$q$, 'efecto'),
	'false',
	'la baja revoca la lectura de inventario'
);
SELECT is(
	pg_temp.ejecutar('J', $q$INSERT INTO public."Prestamo" ("idSolicitud", "rutPrestador", "fechaRetiro", "estadoPrestamo") VALUES (2000000001, 50000003, now(), 'Activo')$q$, 'efecto'),
	'false',
	'la baja revoca la escritura de préstamos'
);

SELECT * FROM finish();
ROLLBACK;
