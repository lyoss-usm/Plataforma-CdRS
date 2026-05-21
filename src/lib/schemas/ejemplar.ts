import { z } from 'zod';
import { integerIdSchema, nullableTextSchema, uuidSchema } from './common.ts';
import { completitudSchema, estadoEjemplarSchema } from './enums.ts';

const ejemplarShape = {
	idEjemplar: uuidSchema,
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
