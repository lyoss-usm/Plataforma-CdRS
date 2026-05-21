import { z } from 'zod';
import {
	integerIdSchema,
	nonEmptyTextSchema,
	nullableTextSchema,
	nullableUrlSchema,
	positiveIntegerSchema
} from './common.ts';
import { dificultadSchema, tipoSchema } from './enums.ts';

const juegoShape = {
	idJuego: integerIdSchema,
	nombreJuego: nonEmptyTextSchema,
	tipo: tipoSchema,
	edadMinima: positiveIntegerSchema.nullable(),
	jugadoresMin: positiveIntegerSchema.nullable(),
	jugadoresMax: positiveIntegerSchema.nullable(),
	duracion: positiveIntegerSchema.nullable(),
	calificacion: z.number().min(0).max(10).nullable(),
	dificultad: dificultadSchema.nullable(),
	pathImagen: nullableTextSchema,
	manual: nullableUrlSchema,
	video: nullableUrlSchema
};

const validatePlayerRange = (data: {
	jugadoresMin?: number | null;
	jugadoresMax?: number | null;
}) => {
	if (data.jugadoresMin == null || data.jugadoresMax == null) {
		return true;
	}

	return data.jugadoresMax >= data.jugadoresMin;
};

export const juegoSchema = z.object(juegoShape).refine(validatePlayerRange, {
	message: 'jugadoresMax debe ser mayor o igual a jugadoresMin',
	path: ['jugadoresMax']
});
export type Juego = z.infer<typeof juegoSchema>;

const createJuegoShape = z.object(juegoShape).omit({ idJuego: true });

export const createJuegoSchema = createJuegoShape.refine(validatePlayerRange, {
	message: 'jugadoresMax debe ser mayor o igual a jugadoresMin',
	path: ['jugadoresMax']
});
export type CreateJuegoDto = z.infer<typeof createJuegoSchema>;

export const updateJuegoSchema = createJuegoShape.partial().refine(validatePlayerRange, {
	message: 'jugadoresMax debe ser mayor o igual a jugadoresMin',
	path: ['jugadoresMax']
});
export type UpdateJuegoDto = z.infer<typeof updateJuegoSchema>;
