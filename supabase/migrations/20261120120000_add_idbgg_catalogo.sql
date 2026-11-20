-- Expone "idBgg" en el catálogo público para poder enlazar cada juego a su ficha en
-- BoardGameGeek. Cambiar las columnas de RETURNS TABLE exige recrear la función, así que se
-- vuelven a aplicar los permisos (solo EXECUTE para anon y authenticated).
DROP FUNCTION IF EXISTS public.buscar_catalogo(
	TEXT,
	INTEGER,
	INTEGER,
	INTEGER,
	BOOLEAN,
	NUMERIC,
	public.dificultad,
	INTEGER,
	INTEGER
);

CREATE FUNCTION public.buscar_catalogo(
	p_nombre TEXT DEFAULT '',
	p_jugadores INTEGER DEFAULT NULL,
	p_duracion_min INTEGER DEFAULT NULL,
	p_duracion_max INTEGER DEFAULT NULL,
	p_disponible BOOLEAN DEFAULT NULL,
	p_calificacion_min NUMERIC DEFAULT NULL,
	p_dificultad public.dificultad DEFAULT NULL,
	p_offset INTEGER DEFAULT 0,
	p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
	"idJuego" INTEGER,
	"nombreJuego" TEXT,
	"tipo" public.tipo,
	"idJuegoBase" INTEGER,
	"edadMinima" SMALLINT,
	"jugadoresMin" SMALLINT,
	"jugadoresMax" SMALLINT,
	"duracion" SMALLINT,
	"calificacion" NUMERIC,
	"dificultad" public.dificultad,
	"pathImagen" TEXT,
	"manual" TEXT,
	"video" TEXT,
	"idBgg" INTEGER,
	"disponible" BOOLEAN,
	"total" BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
	WITH catalogo AS (
		SELECT
			j."idJuego",
			j."nombreJuego",
			j."tipo",
			j."idJuegoBase",
			j."edadMinima",
			j."jugadoresMin",
			j."jugadoresMax",
			j."duracion",
			j."calificacion",
			j."dificultad",
			j."pathImagen",
			j."manual",
			j."video",
			j."idBgg",
			EXISTS (
				SELECT 1
				FROM public."Ejemplar" AS e
				WHERE e."idJuego" = j."idJuego"
					AND e."estadoEjemplar" = 'En bodega'::public.estadoejem
			) AS "disponible"
		FROM public."Juego" AS j
	),
	filtrado AS (
		SELECT *
		FROM catalogo AS c
		WHERE
			(
				p_nombre IS NULL
				OR pg_catalog.btrim(p_nombre) = ''
				OR public.normalizar_texto(c."nombreJuego")
					LIKE '%' || public.normalizar_texto(pg_catalog.btrim(p_nombre)) || '%'
			)
			AND (
				p_jugadores IS NULL
				OR (
					c."jugadoresMin" <= p_jugadores
					AND c."jugadoresMax" >= p_jugadores
				)
			)
			AND (
				p_duracion_min IS NULL
				OR c."duracion" >= p_duracion_min
			)
			AND (
				p_duracion_max IS NULL
				OR c."duracion" <= p_duracion_max
			)
			AND (
				p_disponible IS NULL
				OR c."disponible" = p_disponible
			)
			AND (
				p_calificacion_min IS NULL
				OR c."calificacion" >= p_calificacion_min
			)
			AND (
				p_dificultad IS NULL
				OR c."dificultad" = p_dificultad
			)
	)
	SELECT
		f."idJuego",
		f."nombreJuego",
		f."tipo",
		f."idJuegoBase",
		f."edadMinima",
		f."jugadoresMin",
		f."jugadoresMax",
		f."duracion",
		f."calificacion",
		f."dificultad",
		f."pathImagen",
		f."manual",
		f."video",
		f."idBgg",
		f."disponible",
		pg_catalog.count(*) OVER () AS "total"
	FROM filtrado AS f
	ORDER BY
		public.normalizar_texto(f."nombreJuego"),
		f."idJuego"
    OFFSET GREATEST(COALESCE(p_offset, 0), 0)
    LIMIT GREATEST(
        LEAST(COALESCE(p_limit, 10), 50),
        1
    );
$$;

REVOKE ALL
ON FUNCTION public.buscar_catalogo(
	TEXT,
	INTEGER,
	INTEGER,
	INTEGER,
	BOOLEAN,
	NUMERIC,
	public.dificultad,
	INTEGER,
	INTEGER
)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.buscar_catalogo(
	TEXT,
	INTEGER,
	INTEGER,
	INTEGER,
	BOOLEAN,
	NUMERIC,
	public.dificultad,
	INTEGER,
	INTEGER
)
TO anon, authenticated;

COMMENT ON FUNCTION public.buscar_catalogo(
	TEXT,
	INTEGER,
	INTEGER,
	INTEGER,
	BOOLEAN,
	NUMERIC,
	public.dificultad,
	INTEGER,
	INTEGER
)
IS 'Devuelve el catálogo público filtrado y paginado con disponibilidad derivada de Ejemplar e idBgg para enlazar a BoardGameGeek.';