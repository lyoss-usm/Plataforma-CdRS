-- Calcula el dígito verificador de un RUT chileno mediante módulo 11.
-- La letra K se representa como 10, igual que en la columna
-- Sansano.digitoVerificador.
CREATE OR REPLACE FUNCTION public.fn_digito_verificador_rut(p_rut INTEGER)
RETURNS SMALLINT
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path = ''
AS $$
DECLARE
    v_numero INTEGER := p_rut;
    v_suma INTEGER := 0;
    v_multiplicador INTEGER := 2;
    v_resto INTEGER;
BEGIN
    IF p_rut <= 0 THEN
        RAISE EXCEPTION 'El RUT debe ser un número positivo'
            USING ERRCODE = '22023';
    END IF;

    WHILE v_numero > 0 LOOP
        v_suma := v_suma + (v_numero % 10) * v_multiplicador;
        v_numero := v_numero / 10;

        v_multiplicador := CASE
            WHEN v_multiplicador = 7 THEN 2
            ELSE v_multiplicador + 1
        END;
    END LOOP;

    v_resto := v_suma % 11;

    RETURN CASE
        WHEN v_resto = 0 THEN 0
        WHEN v_resto = 1 THEN 10
        ELSE 11 - v_resto
    END::SMALLINT;
END;
$$;

COMMENT ON FUNCTION public.fn_digito_verificador_rut(INTEGER) IS
    'Calcula el dígito verificador de un RUT chileno. La letra K se representa como 10.';

-- Es una función auxiliar interna: el público utilizará solamente
-- la RPC de creación de solicitudes.
REVOKE ALL
ON FUNCTION public.fn_digito_verificador_rut(INTEGER)
FROM PUBLIC, anon, authenticated;

-- Obtiene las dos próximas fechas de retiro permitidas.
-- Un martes o jueves puede utilizarse el mismo día solamente antes de las 12:30.
CREATE OR REPLACE FUNCTION public.fn_fechas_retiro_permitidas(
    p_instante TIMESTAMPTZ
)
RETURNS DATE[]
LANGUAGE plpgsql
STABLE
STRICT
SET search_path = ''
AS $$
DECLARE
    v_fecha_hora_local TIMESTAMP;
    v_fecha_local DATE;
    v_hora_local TIME;
    v_dia_semana INTEGER;
    v_dias_hasta_martes INTEGER;
    v_dias_hasta_jueves INTEGER;
BEGIN
    v_fecha_hora_local := p_instante AT TIME ZONE 'America/Santiago';
    v_fecha_local := v_fecha_hora_local::DATE;
    v_hora_local := v_fecha_hora_local::TIME;
    v_dia_semana := EXTRACT(ISODOW FROM v_fecha_local)::INTEGER;

    -- ISO: lunes = 1, martes = 2, ..., domingo = 7.
    v_dias_hasta_martes := (2 - v_dia_semana + 7) % 7;
    v_dias_hasta_jueves := (4 - v_dia_semana + 7) % 7;

    IF v_dias_hasta_martes = 0 AND v_hora_local >= TIME '12:30' THEN
        v_dias_hasta_martes := 7;
    END IF;

    IF v_dias_hasta_jueves = 0 AND v_hora_local >= TIME '12:30' THEN
        v_dias_hasta_jueves := 7;
    END IF;

    RETURN ARRAY(
        SELECT fecha
        FROM unnest(
            ARRAY[
                v_fecha_local + v_dias_hasta_martes,
                v_fecha_local + v_dias_hasta_jueves
            ]
        ) AS opciones(fecha)
        ORDER BY fecha
    );
END;
$$;

COMMENT ON FUNCTION public.fn_fechas_retiro_permitidas(TIMESTAMPTZ) IS
    'Calcula las dos próximas fechas de retiro: martes y jueves, considerando las 12:30 en America/Santiago.';

-- Esta función acepta un instante como argumento para poder probarla.
-- No se expone directamente al público, porque un cliente podría enviar una hora falsa.
REVOKE ALL
ON FUNCTION public.fn_fechas_retiro_permitidas(TIMESTAMPTZ)
FROM PUBLIC, anon, authenticated;

-- API pública de solo lectura para construir las opciones del formulario.
-- No recibe un instante: la hora autoritativa siempre proviene de PostgreSQL.
CREATE OR REPLACE FUNCTION public.fechas_retiro_disponibles()
RETURNS TABLE (
    "fechaSeleccionada" DATE,
    "etiqueta" TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        fecha AS "fechaSeleccionada",
        CASE EXTRACT(ISODOW FROM fecha)::INTEGER
            WHEN 2 THEN 'Martes Bloque Libre (12:30 - 13:40)'
            WHEN 4 THEN 'Jueves Bloque Libre (12:30 - 13:40)'
        END AS "etiqueta"
    FROM pg_catalog.unnest(
        public.fn_fechas_retiro_permitidas(pg_catalog.statement_timestamp())
    ) AS fechas(fecha)
    ORDER BY fecha;
$$;

COMMENT ON FUNCTION public.fechas_retiro_disponibles() IS
    'Devuelve los próximos bloques de retiro de martes y jueves usando la hora de America/Santiago.';

REVOKE ALL
ON FUNCTION public.fechas_retiro_disponibles()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.fechas_retiro_disponibles()
TO anon, authenticated;

-- Selecciona el ejemplar en bodega más apto de un juego.
-- Las solicitudes pendientes no excluyen ejemplares: las sobresolicitudes
-- serán resueltas posteriormente por la administración.
CREATE OR REPLACE FUNCTION public.fn_seleccionar_ejemplar_apto(
    p_id_juego INTEGER
)
RETURNS TEXT
LANGUAGE sql
STABLE
STRICT
SET search_path = ''
AS $$
    SELECT e."idEjemplar"
    FROM public."Ejemplar" AS e
    WHERE e."idJuego" = p_id_juego
      AND e."estadoEjemplar" = 'En bodega'::public.estadoejem
    ORDER BY
        CASE e."estadoCompletitud"
            WHEN 'Completo'::public.completitud THEN 0
            ELSE 1
        END,
        e."idEjemplar"
    LIMIT 1;
$$;

COMMENT ON FUNCTION public.fn_seleccionar_ejemplar_apto(INTEGER) IS
    'Selecciona un ejemplar en bodega, priorizando los completos y usando su identificador para desempatar.';

REVOKE ALL
ON FUNCTION public.fn_seleccionar_ejemplar_apto(INTEGER)
FROM PUBLIC, anon, authenticated;

-- Crea una solicitud web completa en una única transacción.
-- Los datos de un Sansano existente nunca se actualizan desde el formulario público.
CREATE OR REPLACE FUNCTION public.crear_solicitud_web(
    p_id_juego INTEGER,
    p_rut_sansano INTEGER,
    p_rol_sansano BIGINT,
    p_digito_verificador SMALLINT,
    p_nombre_sansano TEXT,
    p_telefono INTEGER,
    p_correo_institucional TEXT,
    p_fecha_seleccionada DATE,
    p_acepta_terminos BOOLEAN,
    p_id_juego_expansion INTEGER DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_instante TIMESTAMPTZ := pg_catalog.clock_timestamp();
    v_fechas_permitidas DATE[];
    v_tipo_juego public.tipo;
    v_tipo_expansion public.tipo;
    v_id_juego_base_expansion INTEGER;
    v_id_ejemplar TEXT;
    v_id_expansion TEXT;
    v_id_solicitud INTEGER;
    v_nombre_sansano TEXT;
    v_correo_institucional TEXT;
BEGIN
    -- Validación defensiva de los datos personales recibidos.
    IF p_rut_sansano IS NULL OR p_rut_sansano <= 0 THEN
        RAISE EXCEPTION 'El RUT debe ser un número positivo'
            USING ERRCODE = '22023', HINT = 'rut_invalido';
    END IF;

    IF p_digito_verificador IS NULL
       OR p_digito_verificador NOT BETWEEN 0 AND 10
       OR public.fn_digito_verificador_rut(p_rut_sansano) <> p_digito_verificador THEN
        RAISE EXCEPTION 'El dígito verificador del RUT no es válido'
            USING ERRCODE = '22023', HINT = 'rut_invalido';
    END IF;

    IF p_rol_sansano IS NULL OR p_rol_sansano <= 0 THEN
        RAISE EXCEPTION 'El ROL debe ser un número positivo'
            USING ERRCODE = '22023', HINT = 'rol_invalido';
    END IF;

    v_nombre_sansano := pg_catalog.regexp_replace(
        pg_catalog.btrim(p_nombre_sansano),
        '[[:space:]]+',
        ' ',
        'g'
    );

    IF v_nombre_sansano IS NULL
       OR v_nombre_sansano = ''
       OR pg_catalog.char_length(v_nombre_sansano) > 120 THEN
        RAISE EXCEPTION 'El nombre debe contener entre 1 y 120 caracteres'
            USING ERRCODE = '22023', HINT = 'nombre_invalido';
    END IF;

    IF p_telefono IS NULL OR p_telefono NOT BETWEEN 10000000 AND 99999999 THEN
        RAISE EXCEPTION 'El teléfono debe contener los 8 dígitos posteriores a +569'
            USING ERRCODE = '22023', HINT = 'telefono_invalido';
    END IF;

    v_correo_institucional := pg_catalog.lower(pg_catalog.btrim(p_correo_institucional));

    IF v_correo_institucional IS NULL
       OR v_correo_institucional !~ '^[^@[:space:]]+@(usm[.]cl|alumnos[.]usm[.]cl|sansano[.]usm[.]cl|titulados[.]usm[.]cl|postgrado[.]usm[.]cl|externos[.]usm[.]cl)$' THEN
        RAISE EXCEPTION 'El correo debe pertenecer a un dominio institucional USM permitido'
            USING ERRCODE = '22023', HINT = 'correo_invalido';
    END IF;

    IF p_acepta_terminos IS DISTINCT FROM TRUE THEN
        RAISE EXCEPTION 'Debes aceptar los Términos y Condiciones'
            USING ERRCODE = '22023', HINT = 'terminos_no_aceptados';
    END IF;

    -- La hora autoritativa es la de la base de datos, convertida a Chile.
    v_fechas_permitidas := public.fn_fechas_retiro_permitidas(v_instante);

    IF p_fecha_seleccionada IS NULL
       OR NOT (p_fecha_seleccionada = ANY(v_fechas_permitidas)) THEN
        RAISE EXCEPTION 'La fecha seleccionada no corresponde a un bloque de retiro disponible'
            USING ERRCODE = '22023', HINT = 'fecha_no_disponible';
    END IF;

    -- La solicitud siempre debe comenzar con un juego base.
    SELECT j."tipo"
    INTO v_tipo_juego
    FROM public."Juego" AS j
    WHERE j."idJuego" = p_id_juego;

    IF v_tipo_juego IS DISTINCT FROM 'Juego base'::public.tipo THEN
        RAISE EXCEPTION 'El juego solicitado no corresponde a un juego base'
            USING ERRCODE = '22023', HINT = 'juego_base_invalido';
    END IF;

    v_id_ejemplar := public.fn_seleccionar_ejemplar_apto(p_id_juego);

    IF v_id_ejemplar IS NULL THEN
        RAISE EXCEPTION 'No existen ejemplares en bodega para el juego solicitado'
            USING ERRCODE = 'P0001', HINT = 'juego_no_disponible';
    END IF;

    -- La expansión es opcional, pero debe pertenecer al juego base solicitado.
    IF p_id_juego_expansion IS NOT NULL THEN
        SELECT j."tipo", j."idJuegoBase"
        INTO v_tipo_expansion, v_id_juego_base_expansion
        FROM public."Juego" AS j
        WHERE j."idJuego" = p_id_juego_expansion;

        IF v_tipo_expansion IS DISTINCT FROM 'Expansión'::public.tipo
           OR v_id_juego_base_expansion IS DISTINCT FROM p_id_juego THEN
            RAISE EXCEPTION 'La expansión seleccionada no pertenece al juego base solicitado'
                USING ERRCODE = '22023', HINT = 'expansion_invalida';
        END IF;

        v_id_expansion := public.fn_seleccionar_ejemplar_apto(p_id_juego_expansion);

        IF v_id_expansion IS NULL THEN
            RAISE EXCEPTION 'No existen ejemplares en bodega para la expansión seleccionada'
                USING ERRCODE = 'P0001', HINT = 'expansion_no_disponible';
        END IF;
    END IF;

    -- Si el RUT ya existe, sus datos se conservan sin modificaciones.
    IF NOT EXISTS (
        SELECT 1
        FROM public."Sansano" AS s
        WHERE s."rutSansano" = p_rut_sansano
    ) THEN
        BEGIN
            INSERT INTO public."Sansano" (
                "rutSansano",
                "rolSansano",
                "digitoVerificador",
                "idCargo",
                "nombreSansano",
                "telefono",
                "correoInstitucional",
                "authUserId"
            )
            VALUES (
                p_rut_sansano,
                p_rol_sansano,
                p_digito_verificador,
                NULL,
                v_nombre_sansano,
                p_telefono,
                v_correo_institucional,
                NULL
            )
            ON CONFLICT ("rutSansano") DO NOTHING;
        EXCEPTION
            WHEN unique_violation THEN
                RAISE EXCEPTION 'Los datos ingresados ya están asociados a otro Sansano'
                    USING ERRCODE = 'P0001', HINT = 'datos_sansano_en_uso';
        END;
    END IF;

    INSERT INTO public."Solicitud" (
        "rutSansano",
        "idEjemplar",
        "idExpansion",
        "fechaSolicitud",
        "fechaSeleccionada",
        "estadoSolicitud"
    )
    VALUES (
        p_rut_sansano,
        v_id_ejemplar,
        v_id_expansion,
        v_instante AT TIME ZONE 'America/Santiago',
        p_fecha_seleccionada,
        'Pendiente'::public.estadosol
    )
    RETURNING "idSolicitud" INTO v_id_solicitud;

    RETURN v_id_solicitud;
END;
$$;

COMMENT ON FUNCTION public.crear_solicitud_web(
    INTEGER,
    INTEGER,
    BIGINT,
    SMALLINT,
    TEXT,
    INTEGER,
    TEXT,
    DATE,
    BOOLEAN,
    INTEGER
) IS
    'Registra un Sansano nuevo cuando corresponde y crea una solicitud web pendiente con los ejemplares más aptos.';

REVOKE ALL
ON FUNCTION public.crear_solicitud_web(
    INTEGER,
    INTEGER,
    BIGINT,
    SMALLINT,
    TEXT,
    INTEGER,
    TEXT,
    DATE,
    BOOLEAN,
    INTEGER
)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.crear_solicitud_web(
    INTEGER,
    INTEGER,
    BIGINT,
    SMALLINT,
    TEXT,
    INTEGER,
    TEXT,
    DATE,
    BOOLEAN,
    INTEGER
)
TO anon, authenticated;

-- La creación pública debe pasar exclusivamente por crear_solicitud_web.
DROP POLICY IF EXISTS "solicitud_insert_publico" ON public."Solicitud";
REVOKE INSERT ON public."Solicitud" FROM anon;
