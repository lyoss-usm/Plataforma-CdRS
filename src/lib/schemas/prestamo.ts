import { z } from 'zod';
import {
	ejemplarIdSchema,
	integerIdSchema,
	nullableTextSchema,
	rutSchema,
	timestampSchema
} from './common.ts';
import { documentoSchema, estadoPrestamoSchema } from './enums.ts';
import { suspensionSchema } from './administracion.ts';
import { ejemplarSchema } from './ejemplar.ts';
import { juegoSchema } from './juego.ts';
import { sansanoSchema } from './sansano.ts';
import { solicitudSchema } from './solicitud.ts';

const prestamoShape = {
	idPrestamo: integerIdSchema,
	idSolicitud: integerIdSchema,
	rutPrestador: rutSchema,
	rutReceptor: rutSchema.nullable(),
	rutRevisor: rutSchema.nullable(),
	fechaRetiro: timestampSchema,
	fechaDevolucion: timestampSchema.nullable(),
	fechaRevision: timestampSchema.nullable(),
	tipoDocumento: documentoSchema.nullable(),
	comentarios: nullableTextSchema,
	estadoPrestamo: estadoPrestamoSchema
};

export const prestamoSchema = z.object(prestamoShape);
export type Prestamo = z.infer<typeof prestamoSchema>;

export const createPrestamoSchema = z.object(prestamoShape).omit({ idPrestamo: true });
export type CreatePrestamoDto = z.infer<typeof createPrestamoSchema>;

/** Cuerpo de POST /admin/prestamos?tipo=junta (RPC crear_prestamo_junta). */
export const prestamoJuntaSchema = z.object({
	idEjemplar: ejemplarIdSchema,
	rutSansano: rutSchema,
	tipoDocumento: documentoSchema
});
export type PrestamoJuntaDto = z.infer<typeof prestamoJuntaSchema>;

/** Estados en que puede quedar un ejemplar al devolverse (§ 1.4). */
export const estadoDevolucionSchema = z.enum(['En bodega', 'Para revisar']);
export type EstadoDevolucion = z.infer<typeof estadoDevolucionSchema>;

/** Cuerpo de PATCH /admin/prestamos (RPC devolver_prestamo). */
export const devolucionSchema = z.object({
	idPrestamo: integerIdSchema,
	estadoFinal: estadoDevolucionSchema
});
export type DevolucionDto = z.infer<typeof devolucionSchema>;

// Respuestas de las búsquedas del cajero (GET /admin/prestamos/ejemplares|sansanos).

export const fichaEjemplarSchema = z.object({
	ejemplar: ejemplarSchema,
	juego: juegoSchema
});
export type FichaEjemplar = z.infer<typeof fichaEjemplarSchema>;

export const prestamoEnCursoSchema = z.object({
	prestamo: prestamoSchema,
	solicitud: solicitudSchema,
	ejemplar: ejemplarSchema,
	juego: juegoSchema,
	sansano: sansanoSchema
});
export type PrestamoEnCurso = z.infer<typeof prestamoEnCursoSchema>;

export const busquedaEjemplarSchema = z.object({
	ficha: fichaEjemplarSchema,
	prestamoActivo: prestamoEnCursoSchema.nullable()
});
export type BusquedaEjemplar = z.infer<typeof busquedaEjemplarSchema>;

export const busquedaSolicitanteSchema = z.object({
	sansano: sansanoSchema,
	suspension: suspensionSchema.nullable(),
	prestamoActivo: prestamoEnCursoSchema.nullable()
});
export type BusquedaSolicitante = z.infer<typeof busquedaSolicitanteSchema>;
