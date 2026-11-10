-- Opciones públicas para el selector de expansiones de una solicitud web.
-- No expone ejemplares: solo informa las expansiones compatibles que tienen
-- al menos una copia en bodega.
CREATE OR REPLACE FUNCTION public.expansiones_disponibles(
	p_id_juego_base INTEGER
)
RETURNS TABLE (
	"idJuego" INTEGER,
	"nombreJuego" TEXT
)
LANGUAGE sql
STABLE
STRICT
SECURITY DEFINER
SET search_path = ''
AS $$
	SELECT
		j."idJuego",
		j."nombreJuego"
	FROM public."Juego" AS j
	WHERE j."tipo" = 'Expansión'::public.tipo
	  AND j."idJuegoBase" = p_id_juego_base
	  AND EXISTS (
		SELECT 1
		FROM public."Ejemplar" AS e
		WHERE e."idJuego" = j."idJuego"
		  AND e."estadoEjemplar" = 'En bodega'::public.estadoejem
	  )
	ORDER BY public.normalizar_texto(j."nombreJuego"), j."idJuego";
$$;

COMMENT ON FUNCTION public.expansiones_disponibles(INTEGER) IS
	'Lista las expansiones de un juego base que tienen al menos un ejemplar en bodega.';

REVOKE ALL
ON FUNCTION public.expansiones_disponibles(INTEGER)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.expansiones_disponibles(INTEGER)
TO anon, authenticated;
