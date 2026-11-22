import { z } from 'zod';
import { ejemplarIdSchema, integerIdSchema, nullableTextSchema } from './common.ts';
import { completitudSchema, estadoEjemplarSchema } from './enums.ts';

const ejemplarShape = {
	idEjemplar: ejemplarIdSchema,
	idJuego: integerIdSchema,
	esExterno: z.boolean(),
	estadoCompletitud: completitudSchema,
	situacion: nullableTextSchema,
	comentarios: nullableTextSchema,
	componentes: nullableTextSchema,
	estadoEjemplar: estadoEjemplarSchema
};

export const ejemplarSchema = z.object(ejemplarShape);
export type Ejemplar = z.infer<typeof ejemplarSchema>;

export const createEjemplarSchema = z.object(ejemplarShape);
export type CreateEjemplarDto = z.infer<typeof createEjemplarSchema>;

export const updateEjemplarSchema = z.object(ejemplarShape).partial();
export type UpdateEjemplarDto = z.infer<typeof updateEjemplarSchema>;

// Inventario (#19, wiki §2.1): el sistema genera el idEjemplar y «Prestado» solo lo asignan los
// flujos de préstamo, nunca el inventario.
export const estadoInventarioSchema = estadoEjemplarSchema.exclude(['Prestado']);

export const altaEjemplarSchema = z
	.object({ ...ejemplarShape, estadoEjemplar: estadoInventarioSchema })
	.omit({ idEjemplar: true });
export type AltaEjemplarDto = z.infer<typeof altaEjemplarSchema>;

// Sin idEjemplar ni idJuego: un ejemplar no cambia de código ni de juego desde el inventario.
export const edicionEjemplarSchema = z
	.object(ejemplarShape)
	.omit({ idEjemplar: true, idJuego: true })
	.partial();
export type EdicionEjemplarDto = z.infer<typeof edicionEjemplarSchema>;
