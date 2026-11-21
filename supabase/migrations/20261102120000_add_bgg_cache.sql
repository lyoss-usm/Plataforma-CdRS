-- Caché del proxy BGG (#8). El proxy escribe solo aquí; el Juego se crea o enlaza al guardar la ficha (#19).

ALTER TABLE public."Juego" ADD COLUMN IF NOT EXISTS "idBgg" INTEGER UNIQUE;
COMMENT ON COLUMN public."Juego"."idBgg" IS 'Identificador del juego en BoardGameGeek; NULL si no está enlazado';

CREATE TABLE IF NOT EXISTS public."JuegoBgg" (
	"idBgg" INTEGER PRIMARY KEY,
	"nombre" TEXT NOT NULL,
	"anio" SMALLINT,
	"tipo" TIPO NOT NULL,
	-- Si es expansión, id BGG del juego base; NULL si es base o BGG no lo informa.
	"idBggBase" INTEGER,
	"edadMinima" SMALLINT,
	"jugadoresMin" SMALLINT,
	"jugadoresMax" SMALLINT,
	"duracion" SMALLINT,
	"calificacion" NUMERIC(3,1),
	-- Peso crudo de BGG (1-5): permite re-traducir la dificultad si cambia la configuración.
	"peso" NUMERIC(4,2),
	"urlImagenBgg" TEXT,
	-- Ruta relativa al bucket `ludoteca`; NULL mientras la carátula no se procesa.
	"pathImagen" TEXT,
	"actualizadoEn" TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public."JuegoBgg" IS 'Caché de fichas de BoardGameGeek consultadas por el staff';

ALTER TABLE public."JuegoBgg" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "juegobgg_select_inventario" ON public."JuegoBgg"
	FOR SELECT TO authenticated
	USING (public.tiene_permiso('inventario:editar'));
CREATE POLICY "juegobgg_insert_inventario" ON public."JuegoBgg"
	FOR INSERT TO authenticated
	WITH CHECK (public.tiene_permiso('inventario:editar'));
CREATE POLICY "juegobgg_update_inventario" ON public."JuegoBgg"
	FOR UPDATE TO authenticated
	USING (public.tiene_permiso('inventario:editar'))
	WITH CHECK (public.tiene_permiso('inventario:editar'));

GRANT SELECT, INSERT, UPDATE ON public."JuegoBgg" TO authenticated;

-- Storage: el staff con permiso sube carátulas solo bajo `bgg/` (la lectura ya es pública).
CREATE POLICY "ludoteca_bgg_insert_inventario" ON storage.objects
	FOR INSERT TO authenticated
	WITH CHECK (
		bucket_id = 'ludoteca'
		AND name LIKE 'bgg/%'
		AND public.tiene_permiso('inventario:editar')
	);
CREATE POLICY "ludoteca_bgg_update_inventario" ON storage.objects
	FOR UPDATE TO authenticated
	USING (
		bucket_id = 'ludoteca'
		AND name LIKE 'bgg/%'
		AND public.tiene_permiso('inventario:editar')
	)
	WITH CHECK (
		bucket_id = 'ludoteca'
		AND name LIKE 'bgg/%'
		AND public.tiene_permiso('inventario:editar')
	);

-- El upsert de Storage también lee la fila existente.
CREATE POLICY "ludoteca_bgg_select_inventario" ON storage.objects
	FOR SELECT TO authenticated
	USING (
		bucket_id = 'ludoteca'
		AND name LIKE 'bgg/%'
		AND public.tiene_permiso('inventario:editar')
	);

-- Búsqueda local para el auto-completado: Juego enlazado a BGG + caché, sin tildes ni mayúsculas.
CREATE OR REPLACE FUNCTION public.buscar_juegos_bgg(p_consulta TEXT, p_limite INTEGER DEFAULT 20)
RETURNS TABLE (
	"idBgg" INTEGER,
	"nombre" TEXT,
	"anio" SMALLINT,
	"tipo" TIPO,
	"idJuego" INTEGER,
	"enCache" BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
	v_patron TEXT;
BEGIN
	IF NOT public.tiene_permiso('inventario:editar') THEN
		RAISE EXCEPTION 'Tu cargo no puede editar el inventario' USING ERRCODE = '42501';
	END IF;

	v_patron := replace(replace(replace(public.normalizar_texto(trim(p_consulta)), '\', '\\'), '%', '\%'), '_', '\_');

	RETURN QUERY
	SELECT
		COALESCE(j."idBgg", b."idBgg"),
		COALESCE(j."nombreJuego", b."nombre"),
		b."anio",
		COALESCE(j."tipo", b."tipo"),
		j."idJuego",
		b."idBgg" IS NOT NULL
	FROM public."Juego" j
	FULL JOIN public."JuegoBgg" b ON b."idBgg" = j."idBgg"
	WHERE COALESCE(j."idBgg", b."idBgg") IS NOT NULL
		AND public.normalizar_texto(COALESCE(j."nombreJuego", b."nombre")) LIKE '%' || v_patron || '%'
	ORDER BY
		(public.normalizar_texto(COALESCE(j."nombreJuego", b."nombre")) LIKE v_patron || '%') DESC,
		COALESCE(j."nombreJuego", b."nombre")
	LIMIT GREATEST(p_limite, 1);
END;
$$;

REVOKE ALL ON FUNCTION public.buscar_juegos_bgg(TEXT, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buscar_juegos_bgg(TEXT, INTEGER) TO authenticated;
