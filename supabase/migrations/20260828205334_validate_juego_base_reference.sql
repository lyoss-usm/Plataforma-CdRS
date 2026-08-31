-- La FK recursiva garantiza que el registro exista, pero no que sea de tipo Juego base.
-- El bloqueo compartido evita que el juego referenciado cambie de tipo concurrentemente.
CREATE OR REPLACE FUNCTION fn_validar_juego_base()
RETURNS TRIGGER AS $$
DECLARE
    v_tipo_base TIPO;
BEGIN
    IF TG_OP = 'UPDATE'
       AND NEW."tipo" IS DISTINCT FROM OLD."tipo"
       AND EXISTS (
           SELECT 1
             FROM "Juego"
            WHERE "idJuegoBase" = OLD."idJuego"
       ) THEN
        RAISE EXCEPTION 'El juego % no puede cambiar de tipo porque tiene expansiones', OLD."idJuego";
    END IF;

    IF NEW."tipo" = 'Expansión' THEN
        SELECT "tipo"
          INTO v_tipo_base
          FROM "Juego"
         WHERE "idJuego" = NEW."idJuegoBase"
           FOR SHARE;

        IF v_tipo_base IS DISTINCT FROM 'Juego base' THEN
            RAISE EXCEPTION 'El juego % no es un juego base válido', NEW."idJuegoBase";
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_juego_base
    BEFORE INSERT OR UPDATE OF "tipo", "idJuegoBase" ON "Juego"
    FOR EACH ROW EXECUTE FUNCTION fn_validar_juego_base();
