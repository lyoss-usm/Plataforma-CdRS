import { z } from 'zod';
import {
	integerIdSchema,
	nonEmptyTextSchema,
	nullableTextSchema,
	nullableUrlSchema,
	positiveIntegerSchema
} from './common.ts';
import { dificultadSchema } from './enums.ts';

const juegoDetailsShape = {
	nombreJuego: nonEmptyTextSchema,
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

const juegoBaseShape = {
	...juegoDetailsShape,
	tipo: z.literal('Juego base'),
	idJuegoBase: z.null()
};

const expansionShape = {
	...juegoDetailsShape,
	tipo: z.literal('Expansión'),
	idJuegoBase: integerIdSchema
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

export const juegoSchema = z
	.discriminatedUnion('tipo', [
		z.object({ idJuego: integerIdSchema, ...juegoBaseShape }),
		z.object({ idJuego: integerIdSchema, ...expansionShape })
	])
	.refine(validatePlayerRange, {
		message: 'jugadoresMax debe ser mayor o igual a jugadoresMin',
		path: ['jugadoresMax']
	})
	.refine((data) => data.tipo === 'Juego base' || data.idJuegoBase !== data.idJuego, {
		message: 'una expansión no puede referenciarse a sí misma como juego base',
		path: ['idJuegoBase']
	});
export type Juego = z.infer<typeof juegoSchema>;

export const createJuegoSchema = z
	.discriminatedUnion('tipo', [z.object(juegoBaseShape), z.object(expansionShape)])
	.refine(validatePlayerRange, {
		message: 'jugadoresMax debe ser mayor o igual a jugadoresMin',
		path: ['jugadoresMax']
	});
export type CreateJuegoDto = z.infer<typeof createJuegoSchema>;

const partialJuegoDetailsShape = z.object(juegoDetailsShape).partial().shape;

export const updateJuegoSchema = z
	.union([
		z.object({
			...partialJuegoDetailsShape,
			tipo: z.literal('Juego base'),
			idJuegoBase: z.null()
		}),
		z.object({
			...partialJuegoDetailsShape,
			tipo: z.literal('Expansión'),
			idJuegoBase: integerIdSchema
		}),
		z.object({
			...partialJuegoDetailsShape,
			tipo: z.never().optional(),
			idJuegoBase: z.never().optional()
		})
	])
	.refine(validatePlayerRange, {
		message: 'jugadoresMax debe ser mayor o igual a jugadoresMin',
		path: ['jugadoresMax']
	});
export type UpdateJuegoDto = z.infer<typeof updateJuegoSchema>;
