CREATE TYPE "tipo" AS ENUM (
	'Juego Base',
	'Expansión'
);

CREATE TYPE "dificultad" AS ENUM (
	'Fácil',
	'Intermedio',
	'Difícil'
);

CREATE TYPE "completitud" AS ENUM (
	'Completo',
	'Incompleto'
);

CREATE TYPE "estadoejem" AS ENUM (
	'En bodega',
	'Prestado',
	'Perdido',
	'Para revisar',
	'Con su dueño'
);

CREATE TYPE "estadosol" AS ENUM (
	'Pendiente',
	'Aprobada',
	'Rechazada',
	'Vencida'
);

CREATE TYPE "documentos" AS ENUM (
	'Carnet',
	'TNE',
	'TUI',
	'Otro'
);

CREATE TYPE "estadoprest" AS ENUM (
	'Activo',
	'Devuelto',
	'Cerrado'
);

CREATE TABLE IF NOT EXISTS "Juego" (
	-- Identificador único del juego de mesa
	"idJuego" SERIAL NOT NULL,
	-- Nombre del juego de mesa
	"nombreJuego" TEXT NOT NULL UNIQUE,
	-- Tipo de juego de mesa; Juego base o Expansión
	"tipo" TIPO NOT NULL,
	-- Edad mínima recomendada para el juego de mesa
	"edadMinima" SMALLINT,
	-- Cantidad mínima de jugadores para el juego de mesa
	"jugadoresMin" SMALLINT,
	-- Cantidad máxima de jugadores para el juego de mesa
	"jugadoresMax" SMALLINT,
	-- Duración (minutos) estimada de una partida del juego de mesa
	"duracion" SMALLINT,
	-- Calificación del juego de mesa
	"calificacion" NUMERIC(3,1),
	-- Dificultad del juego de mesa; Fácil, Intermedio o Difícil
	"dificultad" DIFICULTAD,
	-- Ruta interna de la imagen del juego de mesa
	"pathImagen" TEXT,
	-- Link al manual del juego de mesa
	"manual" TEXT,
	-- Link al video tutorial del juego de mesa
	"video" TEXT,
	PRIMARY KEY("idJuego")
);


COMMENT ON COLUMN "Juego"."idJuego" IS 'Identificador único del juego de mesa';
COMMENT ON COLUMN "Juego"."nombreJuego" IS 'Nombre del juego de mesa';
COMMENT ON COLUMN "Juego"."tipo" IS 'Tipo de juego de mesa; Juego base o Expansión';
COMMENT ON COLUMN "Juego"."edadMinima" IS 'Edad mínima recomendada para el juego de mesa';
COMMENT ON COLUMN "Juego"."jugadoresMin" IS 'Cantidad mínima de jugadores para el juego de mesa';
COMMENT ON COLUMN "Juego"."jugadoresMax" IS 'Cantidad máxima de jugadores para el juego de mesa';
COMMENT ON COLUMN "Juego"."duracion" IS 'Duración (minutos) estimada de una partida del juego de mesa';
COMMENT ON COLUMN "Juego"."calificacion" IS 'Calificación del juego de mesa';
COMMENT ON COLUMN "Juego"."dificultad" IS 'Dificultad del juego de mesa; Fácil, Intermedio o Difícil';
COMMENT ON COLUMN "Juego"."pathImagen" IS 'Ruta interna de la imagen del juego de mesa';
COMMENT ON COLUMN "Juego"."manual" IS 'Link al manual del juego de mesa';
COMMENT ON COLUMN "Juego"."video" IS 'Link al video tutorial del juego de mesa';
CREATE INDEX "idx_juego_tipo"
ON "Juego" ("tipo");

CREATE TABLE IF NOT EXISTS "Ejemplar" (
	-- Identificador único del ejemplar, gestionado como QR
	"idEjemplar" UUID NOT NULL,
	-- Identificador del juego al que pertenece el ejemplar
	"idJuego" INTEGER NOT NULL,
	-- Indicador de si el juego es propiedad del club (false) o está prestado al club (true)
	"esExterno" BOOLEAN NOT NULL,
	-- Estado de completitud del ejemplar; Completo o Incompleto
	"estadoCompletitud" COMPLETITUD NOT NULL,
	-- Descripción del estado general del juego (cartas plastificadas, código QR adherido, etc.)
	"situacion" TEXT,
	-- Descripción detallada de las piezas faltantes del ejemplar
	"comentarios" TEXT,
	-- Descripcion detallada de los componentes del ejemplar
	"componentes" TEXT,
	-- Estado actual del ejemplar; En bodega, Prestado, Perdido, Para revisar, Con su dueño
	"estadoEjemplar" ESTADOEJEM NOT NULL,
	PRIMARY KEY("idEjemplar")
);


COMMENT ON COLUMN "Ejemplar"."idEjemplar" IS 'Identificador único del ejemplar, gestionado como QR';
COMMENT ON COLUMN "Ejemplar"."idJuego" IS 'Identificador del juego al que pertenece el ejemplar';
COMMENT ON COLUMN "Ejemplar"."esExterno" IS 'Indicador de si el juego es propiedad del club (false) o está prestado al club (true)';
COMMENT ON COLUMN "Ejemplar"."estadoCompletitud" IS 'Estado de completitud del ejemplar; Completo o Incompleto';
COMMENT ON COLUMN "Ejemplar"."situacion" IS 'Descripción del estado general del juego (cartas plastificadas, código QR adherido, etc.)';
COMMENT ON COLUMN "Ejemplar"."comentarios" IS 'Descripción detallada de las piezas faltantes del ejemplar';
COMMENT ON COLUMN "Ejemplar"."componentes" IS 'Descripcion detallada de los componentes del ejemplar';
COMMENT ON COLUMN "Ejemplar"."estadoEjemplar" IS 'Estado actual del ejemplar; En bodega, Prestado, Perdido, Para revisar, Con su dueño';
CREATE INDEX "idx_ejemplar_juego_estado"
ON "Ejemplar" ("idJuego", "estadoEjemplar");
CREATE INDEX "idx_ejemplar_estado"
ON "Ejemplar" ("estadoEjemplar");

CREATE TABLE IF NOT EXISTS "Solicitud" (
	-- Identificado único de la solicitud
	"idSolicitud" SERIAL NOT NULL,
	-- Rut del sansano que realizó la solicitud
	"rutSansano" INTEGER NOT NULL,
	-- Identificador del ejemplar solicitado
	"idEjemplar" UUID NOT NULL,
	-- Identificador de la expansión solicitada. NULL si no se solicita
	"idExpansion" UUID,
	-- Timestamp de la solicitud
	"fechaSolicitud" TIMESTAMP NOT NULL,
	-- Día seleccionado por el sansano para retirar el ejemplar del juego de mesa
	"fechaSeleccionada" DATE NOT NULL,
	-- Estado actual de la solicitud; 
	-- Pendiente: En espera del retiro del ejemplar.
	-- Aprobado: Ejemplar retirado.
	-- Rechazado: Solicitud rechazada.
	-- Vencida: No se retiró el el ejemplar el día seleccionado
	"estadoSolicitud" ESTADOSOL NOT NULL,
	PRIMARY KEY("idSolicitud")
);


COMMENT ON COLUMN "Solicitud"."idSolicitud" IS 'Identificado único de la solicitud';
COMMENT ON COLUMN "Solicitud"."rutSansano" IS 'Rut del sansano que realizó la solicitud';
COMMENT ON COLUMN "Solicitud"."idEjemplar" IS 'Identificador del ejemplar solicitado';
COMMENT ON COLUMN "Solicitud"."idExpansion" IS 'Identificador de la expansión solicitada. NULL si no se solicita';
COMMENT ON COLUMN "Solicitud"."fechaSolicitud" IS 'Timestamp de la solicitud';
COMMENT ON COLUMN "Solicitud"."fechaSeleccionada" IS 'Día seleccionado por el sansano para retirar el ejemplar del juego de mesa';
COMMENT ON COLUMN "Solicitud"."estadoSolicitud" IS 'Estado actual de la solicitud; 
Pendiente: En espera del retiro del ejemplar.
Aprobado: Ejemplar retirado.
Rechazado: Solicitud rechazada.
Vencida: No se retiró el el ejemplar el día seleccionado';
CREATE INDEX "idx_solicitud_estado_fecha_seleccionada"
ON "Solicitud" ("estadoSolicitud", "fechaSeleccionada");
CREATE INDEX "idx_solicitud_rut_sansano"
ON "Solicitud" ("rutSansano");
CREATE INDEX "idx_solicitud_id_ejemplar"
ON "Solicitud" ("idEjemplar");
CREATE INDEX "idx_solicitud_fecha_solicitud"
ON "Solicitud" ("fechaSeleccionada");

CREATE TABLE IF NOT EXISTS "Prestamo" (
	-- Identificador único del préstamo
	-- 
	"idPrestamo" SERIAL NOT NULL,
	-- Identificador de la solicitud que origina el préstamo
	"idSolicitud" INTEGER NOT NULL,
	-- Rut del staff que entregó los ítems solicitados
	"rutPrestador" INTEGER NOT NULL,
	-- Rut del staff que recibió los ítems prestados
	"rutReceptor" INTEGER,
	-- Rut del staff que revisó los ítems prestados
	"rutRevisor" INTEGER,
	-- Timestamp de la entrega de los ítems solicitados
	"fechaRetiro" TIMESTAMP NOT NULL,
	-- Timestamp de la devolución de los ítems prestados
	"fechaDevolucion" TIMESTAMP,
	-- Timestamp de la revisión de los ítems prestados
	"fechaRevision" TIMESTAMP,
	-- Tipo de documento que se entregó al staff para realizar una solicitud; Carnet, TNE, TUI u Otro. Dejar en NULL si se trata de un prestamo general.
	"tipoDocumento" DOCUMENTOS,
	-- Comentarios opcionales sobre el préstamo
	"comentarios" TEXT,
	-- Estado actual del préstamo;
	-- Activo: Préstamo en curso. Devuelto: ítems regresados. Cerrado: Ítems revisados y el proceso finalizado.
	"estadoPrestamo" ESTADOPREST NOT NULL,
	PRIMARY KEY("idPrestamo")
);


COMMENT ON COLUMN "Prestamo"."idPrestamo" IS 'Identificador único del préstamo
';
COMMENT ON COLUMN "Prestamo"."idSolicitud" IS 'Identificador de la solicitud que origina el préstamo';
COMMENT ON COLUMN "Prestamo"."rutPrestador" IS 'Rut del staff que entregó los ítems solicitados';
COMMENT ON COLUMN "Prestamo"."rutReceptor" IS 'Rut del staff que recibió los ítems prestados';
COMMENT ON COLUMN "Prestamo"."rutRevisor" IS 'Rut del staff que revisó los ítems prestados';
COMMENT ON COLUMN "Prestamo"."fechaRetiro" IS 'Timestamp de la entrega de los ítems solicitados';
COMMENT ON COLUMN "Prestamo"."fechaDevolucion" IS 'Timestamp de la devolución de los ítems prestados';
COMMENT ON COLUMN "Prestamo"."fechaRevision" IS 'Timestamp de la revisión de los ítems prestados';
COMMENT ON COLUMN "Prestamo"."tipoDocumento" IS 'Tipo de documento que se entregó al staff para realizar una solicitud; Carnet, TNE, TUI u Otro. Dejar en NULL si se trata de un prestamo general.';
COMMENT ON COLUMN "Prestamo"."comentarios" IS 'Comentarios opcionales sobre el préstamo';
COMMENT ON COLUMN "Prestamo"."estadoPrestamo" IS 'Estado actual del préstamo;
Activo: Préstamo en curso. Devuelto: ítems regresados. Cerrado: Ítems revisados y el proceso finalizado.';
CREATE INDEX "idx_prestamo_id_solicitud"
ON "Prestamo" ("idSolicitud");
CREATE INDEX "idx_prestamo_estado"
ON "Prestamo" ("estadoPrestamo");

CREATE TABLE IF NOT EXISTS "Sansano" (
	-- Rut del sansano sin dígito verificador
	"rutSansano" INTEGER NOT NULL,
	-- Rol USM del sansano sin dígito verificador
	"rolSansano" BIGINT NOT NULL UNIQUE,
	-- Dígito verificador del rut y rol. El valor 10 representa K
	"digitoVerificador" SMALLINT NOT NULL,
	-- Identificador del cargo del sansano. NULL si no pertenece al CdRS
	"idCargo" INTEGER,
	-- Nombre completo del sansano
	"nombreSansano" TEXT NOT NULL,
	-- Número de teléfono móvil chileno, sin prefijo +569
	"telefono" INTEGER NOT NULL UNIQUE,
	-- Correo institucional del sansano
	"correoInstitucional" TEXT NOT NULL UNIQUE,
	-- Identificador del usuario asociado en Supabase Auth. NULL si no tiene cuenta.
	"authUserId" UUID UNIQUE,
	PRIMARY KEY("rutSansano")
);


COMMENT ON COLUMN "Sansano"."rutSansano" IS 'Rut del sansano sin dígito verificador';
COMMENT ON COLUMN "Sansano"."rolSansano" IS 'Rol USM del sansano sin dígito verificador';
COMMENT ON COLUMN "Sansano"."digitoVerificador" IS 'Dígito verificador del rut y rol. El valor 10 representa K';
COMMENT ON COLUMN "Sansano"."idCargo" IS 'Identificador del cargo del sansano. NULL si no pertenece al CdRS';
COMMENT ON COLUMN "Sansano"."nombreSansano" IS 'Nombre completo del sansano';
COMMENT ON COLUMN "Sansano"."telefono" IS 'Número de teléfono móvil chileno, sin prefijo +569';
COMMENT ON COLUMN "Sansano"."correoInstitucional" IS 'Correo institucional del sansano';
COMMENT ON COLUMN "Sansano"."authUserId" IS 'Identificador del usuario asociado en Supabase Auth. NULL si no tiene cuenta.';
CREATE INDEX "idx_sansano_id_cargo"
ON "Sansano" ("idCargo");

CREATE TABLE IF NOT EXISTS "Suspension" (
	-- Identificador único de la suspención
	"idSuspencion" SERIAL NOT NULL,
	-- Rut del sansano suspendido
	"rutSansano" INTEGER NOT NULL,
	-- Rut del moderador que aplicó la suspención
	"rutModerador" INTEGER NOT NULL,
	-- Timestamp del inicio de la suspención
	"fechaInicio" TIMESTAMP NOT NULL,
	-- Timestamp del termino de la suspención. NULL si es una suspención permanente
	"fechaTermino" TIMESTAMP,
	-- Razón de la suspención
	"razon" TEXT NOT NULL,
	PRIMARY KEY("idSuspencion")
);


COMMENT ON COLUMN "Suspension"."idSuspencion" IS 'Identificador único de la suspención';
COMMENT ON COLUMN "Suspension"."rutSansano" IS 'Rut del sansano suspendido';
COMMENT ON COLUMN "Suspension"."rutModerador" IS 'Rut del moderador que aplicó la suspención';
COMMENT ON COLUMN "Suspension"."fechaInicio" IS 'Timestamp del inicio de la suspención';
COMMENT ON COLUMN "Suspension"."fechaTermino" IS 'Timestamp del termino de la suspención. NULL si es una suspención permanente';
COMMENT ON COLUMN "Suspension"."razon" IS 'Razón de la suspención';
CREATE INDEX "idx_suspencion_sansano_fecha_fin"
ON "Suspension" ("rutSansano", "fechaTermino");

CREATE TABLE IF NOT EXISTS "Cargo" (
	-- Identificador único del cargo interno del club
	"idCargo" SERIAL NOT NULL,
	-- Nombre del cargo interno del club
	"nombreCargo" TEXT NOT NULL UNIQUE,
	-- Descripción opcional del cargo
	"descripcionCargo" TEXT,
	PRIMARY KEY("idCargo")
);


COMMENT ON COLUMN "Cargo"."idCargo" IS 'Identificador único del cargo interno del club';
COMMENT ON COLUMN "Cargo"."nombreCargo" IS 'Nombre del cargo interno del club';
COMMENT ON COLUMN "Cargo"."descripcionCargo" IS 'Descripción opcional del cargo';


CREATE TABLE IF NOT EXISTS "CargoPermiso" (
	-- Identificador del cargo
	"idCargo" INTEGER NOT NULL,
	-- Identificador del permiso
	"idPermiso" INTEGER NOT NULL,
	PRIMARY KEY("idCargo", "idPermiso")
);


COMMENT ON COLUMN "CargoPermiso"."idCargo" IS 'Identificador del cargo';
COMMENT ON COLUMN "CargoPermiso"."idPermiso" IS 'Identificador del permiso';


CREATE TABLE IF NOT EXISTS "Permiso" (
	-- Identificador único del permiso otorgado a un cargo
	"idPermiso" SERIAL NOT NULL,
	-- Nombre del permiso otorgado a un cargo
	"nombrePermiso" TEXT NOT NULL UNIQUE,
	-- Descripción opcional del permiso
	"descripcionPermiso" TEXT,
	PRIMARY KEY("idPermiso")
);


COMMENT ON COLUMN "Permiso"."idPermiso" IS 'Identificador único del permiso otorgado a un cargo';
COMMENT ON COLUMN "Permiso"."nombrePermiso" IS 'Nombre del permiso otorgado a un cargo';
COMMENT ON COLUMN "Permiso"."descripcionPermiso" IS 'Descripción opcional del permiso';

ALTER TABLE "Prestamo"
ADD FOREIGN KEY("rutRevisor") REFERENCES "Sansano"("rutSansano")
ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "Prestamo"
ADD FOREIGN KEY("rutReceptor") REFERENCES "Sansano"("rutSansano")
ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "Prestamo"
ADD FOREIGN KEY("rutPrestador") REFERENCES "Sansano"("rutSansano")
ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "Solicitud"
ADD FOREIGN KEY("rutSansano") REFERENCES "Sansano"("rutSansano")
ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "Ejemplar"
ADD FOREIGN KEY("idJuego") REFERENCES "Juego"("idJuego")
ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "Solicitud"
ADD FOREIGN KEY("idEjemplar") REFERENCES "Ejemplar"("idEjemplar")
ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "Solicitud"
ADD FOREIGN KEY("idExpansion") REFERENCES "Ejemplar"("idEjemplar")
ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "Prestamo"
ADD FOREIGN KEY("idSolicitud") REFERENCES "Solicitud"("idSolicitud")
ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "Suspension"
ADD FOREIGN KEY("rutSansano") REFERENCES "Sansano"("rutSansano")
ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "Suspension"
ADD FOREIGN KEY("rutModerador") REFERENCES "Sansano"("rutSansano")
ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "Sansano"
ADD FOREIGN KEY("idCargo") REFERENCES "Cargo"("idCargo")
ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE "CargoPermiso"
ADD FOREIGN KEY("idCargo") REFERENCES "Cargo"("idCargo")
ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "CargoPermiso"
ADD FOREIGN KEY("idPermiso") REFERENCES "Permiso"("idPermiso")
ON UPDATE CASCADE ON DELETE CASCADE;