-- Autorización en la capa de datos (#7). El código es público: la anon key también lo es, así
-- que la RLS es la autoridad real; el guard de /admin y la UI solo deciden qué se ve.
-- Wiki: Flujos del Sistema § 1.1, § 3.2, § 3.3 y § 3.4.

-- ---------------------------------------------------------------------------------------------
-- 1. Matriz de cargos y permisos (§ 3.3). Los cargos son inclusivos.
-- ---------------------------------------------------------------------------------------------
INSERT INTO public."Cargo" ("nombreCargo", "descripcionCargo")
VALUES
	('Junior', 'Staff que opera el cajero de Juntas Masivas y recibe devoluciones'),
	('Senior', 'Staff que además atiende préstamos generales, solicitudes web e inventario'),
	('Directivo', 'Staff con gestión de usuarios y moderación')
ON CONFLICT ("nombreCargo") DO NOTHING;

INSERT INTO public."Permiso" ("nombrePermiso", "descripcionPermiso")
VALUES
	('prestamos:junta', 'Registrar préstamos en Juntas Masivas (cajero)'),
	('prestamos:general', 'Registrar préstamos generales presenciales'),
	('prestamos:devolver', 'Registrar devoluciones y revisiones de préstamos'),
	('solicitudes:atender', 'Atender solicitudes web'),
	('inventario:editar', 'Crear y editar juegos y ejemplares'),
	('inventario:eliminar', 'Eliminar juegos y ejemplares'),
	('usuarios:gestionar', 'Gestionar staff, cargos y permisos'),
	('moderacion:suspender', 'Aplicar y levantar suspensiones'),
	('catalogo:leer', 'Leer el catálogo y la nómina')
ON CONFLICT ("nombrePermiso") DO NOTHING;

INSERT INTO public."CargoPermiso" ("idCargo", "idPermiso")
SELECT c."idCargo", p."idPermiso"
FROM (
	VALUES
		('Junior', 'prestamos:junta'),
		('Junior', 'prestamos:devolver'),
		('Junior', 'catalogo:leer'),
		('Senior', 'prestamos:junta'),
		('Senior', 'prestamos:general'),
		('Senior', 'prestamos:devolver'),
		('Senior', 'solicitudes:atender'),
		('Senior', 'inventario:editar'),
		('Senior', 'inventario:eliminar'),
		('Senior', 'catalogo:leer'),
		('Directivo', 'prestamos:junta'),
		('Directivo', 'prestamos:general'),
		('Directivo', 'prestamos:devolver'),
		('Directivo', 'solicitudes:atender'),
		('Directivo', 'inventario:editar'),
		('Directivo', 'inventario:eliminar'),
		('Directivo', 'usuarios:gestionar'),
		('Directivo', 'moderacion:suspender'),
		('Directivo', 'catalogo:leer')
) AS matriz ("nombreCargo", "nombrePermiso")
JOIN public."Cargo" AS c ON c."nombreCargo" = matriz."nombreCargo"
JOIN public."Permiso" AS p ON p."nombrePermiso" = matriz."nombrePermiso"
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------------------------
-- 2. Funciones de sesión: auth.uid() → Sansano.authUserId → idCargo → CargoPermiso → Permiso.
-- SECURITY DEFINER para que las políticas puedan consultar tablas que el llamador no lee.
-- ---------------------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "idx_sansano_correo_institucional"
ON public."Sansano" ("correoInstitucional");

CREATE OR REPLACE FUNCTION public.rut_staff_actual()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
	SELECT s."rutSansano"
	FROM public."Sansano" AS s
	WHERE s."authUserId" = auth.uid()
		AND s."idCargo" IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.es_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
	SELECT public.rut_staff_actual() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.cargo_actual()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
	SELECT c."nombreCargo"
	FROM public."Sansano" AS s
	JOIN public."Cargo" AS c ON c."idCargo" = s."idCargo"
	WHERE s."authUserId" = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.tiene_permiso(p_permiso TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
	SELECT EXISTS (
		SELECT 1
		FROM public."Sansano" AS s
		JOIN public."CargoPermiso" AS cp ON cp."idCargo" = s."idCargo"
		JOIN public."Permiso" AS p ON p."idPermiso" = cp."idPermiso"
		WHERE s."authUserId" = auth.uid()
			AND p."nombrePermiso" = p_permiso
	);
$$;

-- Perfil completo para el guard de /admin: una sola llamada por request.
CREATE OR REPLACE FUNCTION public.perfil_staff()
RETURNS TABLE (
	"rutSansano" INTEGER,
	"nombreSansano" TEXT,
	"correoInstitucional" TEXT,
	"nombreCargo" TEXT,
	"permisos" TEXT[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
	SELECT
		s."rutSansano",
		s."nombreSansano",
		s."correoInstitucional",
		c."nombreCargo",
		COALESCE(
			ARRAY(
				SELECT p."nombrePermiso"
				FROM public."CargoPermiso" AS cp
				JOIN public."Permiso" AS p ON p."idPermiso" = cp."idPermiso"
				WHERE cp."idCargo" = s."idCargo"
				ORDER BY p."nombrePermiso"
			),
			ARRAY[]::TEXT[]
		)
	FROM public."Sansano" AS s
	JOIN public."Cargo" AS c ON c."idCargo" = s."idCargo"
	WHERE s."authUserId" = auth.uid();
$$;

-- Vinculación al primer ingreso (§ 3.2): el staff invitado existe como Sansano con cargo y
-- authUserId NULL; al autenticarse se enlaza por correo institucional.
CREATE OR REPLACE FUNCTION public.vincular_cuenta_staff()
RETURNS VOID
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
	UPDATE public."Sansano" AS s
	SET "authUserId" = auth.uid()
	WHERE auth.uid() IS NOT NULL
		AND pg_catalog.lower(s."correoInstitucional") = pg_catalog.lower(auth.email())
		AND s."authUserId" IS NULL
		AND s."idCargo" IS NOT NULL
		AND NOT EXISTS (
			SELECT 1 FROM public."Sansano" AS otro WHERE otro."authUserId" = auth.uid()
		);
$$;

-- Suspensión vigente (§ 3.4). Usa idx_suspencion_sansano_fecha_fin.
CREATE OR REPLACE FUNCTION public.suspension_activa(p_rut INTEGER)
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

REVOKE ALL ON FUNCTION public.rut_staff_actual() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.es_staff() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cargo_actual() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tiene_permiso(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.perfil_staff() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.vincular_cuenta_staff() FROM PUBLIC, anon;
-- anon no debe poder averiguar quién está suspendido.
REVOKE ALL ON FUNCTION public.suspension_activa(INTEGER) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.rut_staff_actual() TO authenticated;
GRANT EXECUTE ON FUNCTION public.es_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cargo_actual() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tiene_permiso(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.perfil_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.vincular_cuenta_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.suspension_activa(INTEGER) TO authenticated;

COMMENT ON FUNCTION public.cargo_actual() IS 'Cargo (Junior, Senior, Directivo) del staff autenticado; NULL si no es staff.';
COMMENT ON FUNCTION public.tiene_permiso(TEXT) IS 'Indica si el staff autenticado tiene el permiso recurso:accion.';
COMMENT ON FUNCTION public.perfil_staff() IS 'Perfil y permisos del staff autenticado, usado por el guard de /admin.';
COMMENT ON FUNCTION public.vincular_cuenta_staff() IS 'Enlaza auth.uid() con el Sansano con cargo cuyo correo coincide (primer ingreso).';
COMMENT ON FUNCTION public.suspension_activa(INTEGER) IS 'Indica si el RUT tiene una Suspension vigente.';

-- ---------------------------------------------------------------------------------------------
-- 3. Baneo en la capa de datos (§ 3.4). Trigger y no solo policy: aplica también a service_role
-- y a funciones SECURITY DEFINER, que no pasan por la RLS.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_bloquear_solicitud_suspendida()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
	IF public.suspension_activa(NEW."rutSansano") THEN
		RAISE EXCEPTION 'El sansano % tiene una suspensión activa', NEW."rutSansano"
			USING ERRCODE = 'P0001', HINT = 'sansano_suspendido';
	END IF;

	RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_bloquear_solicitud_suspendida() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE TRIGGER trg_bloquear_solicitud_suspendida
	BEFORE INSERT ON public."Solicitud"
	FOR EACH ROW EXECUTE FUNCTION public.fn_bloquear_solicitud_suspendida();

-- fn_validar_solicitud lee Ejemplar/Juego con los privilegios del llamador; con RLS, anon no ve
-- Ejemplar y toda solicitud web fallaría. Se ejecuta como dueño sin cambiar su lógica.
ALTER FUNCTION public.fn_validar_solicitud() SECURITY DEFINER SET search_path = public;
REVOKE ALL ON FUNCTION public.fn_validar_solicitud() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 4. Row Level Security. Sin política = acceso denegado para anon y authenticated.
-- ---------------------------------------------------------------------------------------------
ALTER TABLE public."Juego" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Ejemplar" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Solicitud" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Prestamo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Sansano" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Suspension" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Cargo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Permiso" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CargoPermiso" ENABLE ROW LEVEL SECURITY;

-- Juego: lectura pública; el inventario lo edita el staff con permiso.
CREATE POLICY "juego_select_publico" ON public."Juego"
	FOR SELECT TO anon, authenticated
	USING (true);
CREATE POLICY "juego_insert_inventario" ON public."Juego"
	FOR INSERT TO authenticated
	WITH CHECK (public.tiene_permiso('inventario:editar'));
CREATE POLICY "juego_update_inventario" ON public."Juego"
	FOR UPDATE TO authenticated
	USING (public.tiene_permiso('inventario:editar'))
	WITH CHECK (public.tiene_permiso('inventario:editar'));
CREATE POLICY "juego_delete_inventario" ON public."Juego"
	FOR DELETE TO authenticated
	USING (public.tiene_permiso('inventario:eliminar'));

-- Ejemplar: inventario interno; el público ve la disponibilidad solo vía buscar_catalogo.
CREATE POLICY "ejemplar_select_staff" ON public."Ejemplar"
	FOR SELECT TO authenticated
	USING (public.es_staff());
CREATE POLICY "ejemplar_insert_inventario" ON public."Ejemplar"
	FOR INSERT TO authenticated
	WITH CHECK (public.tiene_permiso('inventario:editar'));
-- Atender préstamos cambia estadoEjemplar (Prestado, Para revisar, En bodega).
CREATE POLICY "ejemplar_update_staff" ON public."Ejemplar"
	FOR UPDATE TO authenticated
	USING (
		public.tiene_permiso('inventario:editar')
		OR public.tiene_permiso('prestamos:junta')
		OR public.tiene_permiso('prestamos:general')
		OR public.tiene_permiso('prestamos:devolver')
	)
	WITH CHECK (
		public.tiene_permiso('inventario:editar')
		OR public.tiene_permiso('prestamos:junta')
		OR public.tiene_permiso('prestamos:general')
		OR public.tiene_permiso('prestamos:devolver')
	);
CREATE POLICY "ejemplar_delete_inventario" ON public."Ejemplar"
	FOR DELETE TO authenticated
	USING (public.tiene_permiso('inventario:eliminar'));

-- Solicitud: el público solo crea solicitudes Pendientes (§ 1.1); el staff las atiende.
CREATE POLICY "solicitud_insert_publico" ON public."Solicitud"
	FOR INSERT TO anon
	WITH CHECK ("estadoSolicitud" = 'Pendiente');
CREATE POLICY "solicitud_select_staff" ON public."Solicitud"
	FOR SELECT TO authenticated
	USING (public.es_staff());
CREATE POLICY "solicitud_insert_staff" ON public."Solicitud"
	FOR INSERT TO authenticated
	WITH CHECK (public.es_staff());
CREATE POLICY "solicitud_update_staff" ON public."Solicitud"
	FOR UPDATE TO authenticated
	USING (
		public.tiene_permiso('solicitudes:atender')
		OR public.tiene_permiso('prestamos:junta')
		OR public.tiene_permiso('prestamos:general')
	)
	WITH CHECK (
		public.tiene_permiso('solicitudes:atender')
		OR public.tiene_permiso('prestamos:junta')
		OR public.tiene_permiso('prestamos:general')
	);

-- Prestamo: escritura exclusiva del staff autenticado.
CREATE POLICY "prestamo_select_staff" ON public."Prestamo"
	FOR SELECT TO authenticated
	USING (public.es_staff());
CREATE POLICY "prestamo_insert_staff" ON public."Prestamo"
	FOR INSERT TO authenticated
	WITH CHECK (
		public.tiene_permiso('prestamos:junta')
		OR public.tiene_permiso('prestamos:general')
	);
CREATE POLICY "prestamo_update_staff" ON public."Prestamo"
	FOR UPDATE TO authenticated
	USING (
		public.tiene_permiso('prestamos:junta')
		OR public.tiene_permiso('prestamos:general')
		OR public.tiene_permiso('prestamos:devolver')
	)
	WITH CHECK (
		public.tiene_permiso('prestamos:junta')
		OR public.tiene_permiso('prestamos:general')
		OR public.tiene_permiso('prestamos:devolver')
	);

-- Sansano: datos personales, solo staff. Cualquier staff puede dar de alta a un sansano común
-- (cajero, § 1.3), pero solo usuarios:gestionar asigna cargos o cuentas (evita auto-escalar).
CREATE POLICY "sansano_select_staff" ON public."Sansano"
	FOR SELECT TO authenticated
	USING (public.es_staff());
CREATE POLICY "sansano_insert_staff" ON public."Sansano"
	FOR INSERT TO authenticated
	WITH CHECK (
		public.tiene_permiso('usuarios:gestionar')
		OR (public.es_staff() AND "idCargo" IS NULL AND "authUserId" IS NULL)
	);
CREATE POLICY "sansano_update_gestion" ON public."Sansano"
	FOR UPDATE TO authenticated
	USING (public.tiene_permiso('usuarios:gestionar'))
	WITH CHECK (public.tiene_permiso('usuarios:gestionar'));
CREATE POLICY "sansano_delete_gestion" ON public."Sansano"
	FOR DELETE TO authenticated
	USING (public.tiene_permiso('usuarios:gestionar'));

-- Suspension: el staff consulta (cajero); solo moderación aplica/levanta. Sin DELETE: historial.
CREATE POLICY "suspension_select_staff" ON public."Suspension"
	FOR SELECT TO authenticated
	USING (public.es_staff());
CREATE POLICY "suspension_insert_moderacion" ON public."Suspension"
	FOR INSERT TO authenticated
	WITH CHECK (public.tiene_permiso('moderacion:suspender'));
CREATE POLICY "suspension_update_moderacion" ON public."Suspension"
	FOR UPDATE TO authenticated
	USING (public.tiene_permiso('moderacion:suspender'))
	WITH CHECK (public.tiene_permiso('moderacion:suspender'));

-- Cargo, Permiso y CargoPermiso: matriz administrada por usuarios:gestionar.
CREATE POLICY "cargo_select_staff" ON public."Cargo"
	FOR SELECT TO authenticated
	USING (public.es_staff());
CREATE POLICY "cargo_write_gestion" ON public."Cargo"
	FOR ALL TO authenticated
	USING (public.tiene_permiso('usuarios:gestionar'))
	WITH CHECK (public.tiene_permiso('usuarios:gestionar'));

CREATE POLICY "permiso_select_staff" ON public."Permiso"
	FOR SELECT TO authenticated
	USING (public.es_staff());
CREATE POLICY "permiso_write_gestion" ON public."Permiso"
	FOR ALL TO authenticated
	USING (public.tiene_permiso('usuarios:gestionar'))
	WITH CHECK (public.tiene_permiso('usuarios:gestionar'));

CREATE POLICY "cargo_permiso_select_staff" ON public."CargoPermiso"
	FOR SELECT TO authenticated
	USING (public.es_staff());
CREATE POLICY "cargo_permiso_write_gestion" ON public."CargoPermiso"
	FOR ALL TO authenticated
	USING (public.tiene_permiso('usuarios:gestionar'))
	WITH CHECK (public.tiene_permiso('usuarios:gestionar'));
