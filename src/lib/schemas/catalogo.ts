import { z } from 'zod';
import { nonNegativeIntegerSchema, positiveIntegerSchema } from './common.ts';
import { dificultadSchema } from './enums.ts';
import { juegoSchema } from './juego.ts';

export const CATALOG_PAGE_SIZE = 10;
export const CATALOG_MAX_PAGE_SIZE = 50;

export const catalogGameSchema = juegoSchema.and(
	z.object({
		disponible: z.boolean()
	})
);

export type CatalogGame = z.infer<typeof catalogGameSchema>;

export type CatalogFilterValues = Pick<
	CatalogQuery,
	'nombre' | 'jugadores' | 'duracionMin' | 'duracionMax' | 'disponible' | 'calificacionMin'
>;

export const catalogQuerySchema = z
	.object({
		nombre: z.string().trim().default(''),
		jugadores: positiveIntegerSchema.nullable().default(null),
		duracionMin: positiveIntegerSchema.nullable().default(null),
		duracionMax: positiveIntegerSchema.nullable().default(null),
		disponible: z.boolean().nullable().default(null),
		calificacionMin: z.number().min(0).max(10).nullable().default(null),
		dificultad: dificultadSchema.nullable().default(null),
		offset: nonNegativeIntegerSchema.default(0),
		limit: z.number().int().min(1).max(CATALOG_MAX_PAGE_SIZE).default(CATALOG_PAGE_SIZE)
	})
	.refine(
		(query) =>
			query.duracionMin === null ||
			query.duracionMax === null ||
			query.duracionMin <= query.duracionMax,
		{
			message: 'duracionMin no puede ser mayor que duracionMax',
			path: ['duracionMax']
		}
	);

export type CatalogQuery = z.infer<typeof catalogQuerySchema>;

export const catalogPageSchema = z.object({
	juegos: z.array(catalogGameSchema),
	total: nonNegativeIntegerSchema,
	hayMas: z.boolean()
});

export type CatalogPage = z.infer<typeof catalogPageSchema>;
