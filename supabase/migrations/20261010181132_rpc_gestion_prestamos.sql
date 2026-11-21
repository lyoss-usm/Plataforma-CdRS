CREATE OR REPLACE FUNCTION crear_prestamo_junta(
    p_id_ejemplar TEXT,
    p_rut_sansano INTEGER,    
    p_rut_staff INTEGER,     
    p_tipo_documento "documentos"
) RETURNS INTEGER AS $$
DECLARE
    v_id_solicitud INTEGER;
    v_id_prestamo INTEGER;
    v_estado_ejemplar "estadoejem";
    v_suspension_activa BOOLEAN;
BEGIN

    SELECT EXISTS (
        SELECT 1 FROM "Suspension" 
        WHERE "rutSansano" = p_rut_sansano 
          AND ("fechaTermino" IS NULL OR "fechaTermino" > NOW())
    ) INTO v_suspension_activa;

    IF v_suspension_activa THEN
        RAISE EXCEPTION 'El sansano % tiene una suspensión activa.', p_rut_sansano;
    END IF;

    -- Validar existencia y estado del ejemplar
    SELECT "estadoEjemplar" INTO v_estado_ejemplar 
    FROM "Ejemplar" 
    WHERE "idEjemplar" = p_id_ejemplar FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El ejemplar % no existe.', p_id_ejemplar;
    END IF;

    IF v_estado_ejemplar != 'En bodega' THEN
        RAISE EXCEPTION 'El ejemplar no está "En bodega". Estado actual: %', v_estado_ejemplar;
    END IF;

    -- Terminar préstamos activos previos del mismo ejemplar
    UPDATE "Prestamo" 
    SET "estadoPrestamo" = 'Devuelto'::estadoprest, "fechaDevolucion" = NOW()
    WHERE "idSolicitud" IN (
        SELECT "idSolicitud" FROM "Solicitud" WHERE "idEjemplar" = p_id_ejemplar
    ) AND "estadoPrestamo" = 'Activo'::estadoprest;

    -- Crear Solicitud Aprobada
    INSERT INTO "Solicitud" ("rutSansano", "idEjemplar", "fechaSolicitud", "fechaSeleccionada", "estadoSolicitud")
    VALUES (p_rut_sansano, p_id_ejemplar, NOW(), CURRENT_DATE, 'Aprobada'::estadosol)
    RETURNING "idSolicitud" INTO v_id_solicitud;

    -- Crear Préstamo Activo
    INSERT INTO "Prestamo" ("idSolicitud", "rutPrestador", "fechaRetiro", "tipoDocumento", "estadoPrestamo")
    VALUES (v_id_solicitud, p_rut_staff, NOW(), p_tipo_documento, 'Activo'::estadoprest)
    RETURNING "idPrestamo" INTO v_id_prestamo;

    -- Actualizar el ejemplar a Prestado
    UPDATE "Ejemplar" 
    SET "estadoEjemplar" = 'Prestado'::estadoejem 
    WHERE "idEjemplar" = p_id_ejemplar;

    RETURN v_id_prestamo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION devolver_prestamo(
    p_id_prestamo INTEGER,
    p_rut_receptor INTEGER,        -- Staff que recibe el juego de vuelta
    p_estado_final "estadoejem"    -- 'En bodega' o 'Para revisar'
) RETURNS VOID AS $$
DECLARE
    v_id_ejemplar TEXT;
BEGIN
    UPDATE "Prestamo"
    SET "estadoPrestamo" = 'Devuelto'::estadoprest,
        "fechaDevolucion" = NOW(),
        "rutReceptor" = p_rut_receptor
    WHERE "idPrestamo" = p_id_prestamo
    RETURNING (SELECT "idEjemplar" FROM "Solicitud" WHERE "Solicitud"."idSolicitud" = "Prestamo"."idSolicitud") INTO v_id_ejemplar;

    UPDATE "Ejemplar"
    SET "estadoEjemplar" = p_estado_final
    WHERE "idEjemplar" = v_id_ejemplar;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Otorgar permisos de ejecución a los usuarios autenticados
GRANT EXECUTE ON FUNCTION crear_prestamo_junta(TEXT, INTEGER, INTEGER, "documentos") TO authenticated;
GRANT EXECUTE ON FUNCTION devolver_prestamo(INTEGER, INTEGER, "estadoejem") TO authenticated;