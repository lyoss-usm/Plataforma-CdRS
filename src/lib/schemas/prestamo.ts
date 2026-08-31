import { z } from 'zod';
import { integerIdSchema, nullableTextSchema, rutSchema, timestampSchema } from './common.ts';
import { documentoSchema, estadoPrestamoSchema } from './enums.ts';

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
