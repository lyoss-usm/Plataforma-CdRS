-- CHECK: coherencia entre tipo y idJuegoBase
ALTER TABLE "Juego"
    ADD CONSTRAINT "chk_juego_base_expansion" CHECK (
        ("tipo" = 'Expansión'  AND "idJuegoBase" IS NOT NULL AND "idJuegoBase" <> "idJuego")
        OR
        ("tipo" = 'Juego base' AND "idJuegoBase" IS NULL)
    );

-- Función del trigger de validación de solicitud
CREATE OR REPLACE FUNCTION fn_validar_solicitud()
RETURNS TRIGGER AS $$
DECLARE
    v_tipo_base       TIPO;
    v_idJuegoBase     INTEGER;
    v_tipo_expansion  TIPO;
    v_idJuegoBaseExp  INTEGER;
BEGIN
    -- 1. El idEjemplar debe corresponder a un Juego base
    SELECT j."tipo", j."idJuego"
      INTO v_tipo_base, v_idJuegoBase
      FROM "Ejemplar" e
      JOIN "Juego" j ON j."idJuego" = e."idJuego"
     WHERE e."idEjemplar" = NEW."idEjemplar";

    IF v_tipo_base IS DISTINCT FROM 'Juego base' THEN
        RAISE EXCEPTION 'El ejemplar % no corresponde a un juego base', NEW."idEjemplar";
    END IF;

    -- 2. Si se pide expansión, debe ser tipo Expansión y del mismo juego base
    IF NEW."idExpansion" IS NOT NULL THEN
        SELECT j."tipo", j."idJuegoBase"
          INTO v_tipo_expansion, v_idJuegoBaseExp
          FROM "Ejemplar" e
          JOIN "Juego" j ON j."idJuego" = e."idJuego"
         WHERE e."idEjemplar" = NEW."idExpansion";

        IF v_tipo_expansion IS DISTINCT FROM 'Expansión' THEN
            RAISE EXCEPTION 'El ejemplar % no corresponde a una expansión', NEW."idExpansion";
        END IF;

        IF v_idJuegoBaseExp IS DISTINCT FROM v_idJuegoBase THEN
            RAISE EXCEPTION 'La expansión % no pertenece al juego del ejemplar %',
                NEW."idExpansion", NEW."idEjemplar";
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que ejecuta la función antes de cada INSERT o UPDATE en Solicitud
CREATE OR REPLACE TRIGGER trg_validar_solicitud
    BEFORE INSERT OR UPDATE ON "Solicitud"
    FOR EACH ROW EXECUTE FUNCTION fn_validar_solicitud();
