import { z } from 'zod';
import { integerIdSchema, nonEmptyTextSchema, positiveIntegerSchema } from './common.ts';
import { dificultadSchema, tipoSchema } from './enums.ts';

/** Configuración editable de la integración con BGG (`src/lib/data/bgg.json`). */
export const bggConfigSchema = z.object({
	dificultad: z
		.object({
			// Peso de BGG (1-5): < facilHasta → Fácil; < intermedioHasta → Intermedio; el resto → Difícil.
			facilHasta: z.number().min(1).max(5),
			intermedioHasta: z.number().min(1).max(5)
		})
		.refine((d) => d.facilHasta < d.intermedioHasta, {
			message: 'facilHasta debe ser menor que intermedioHasta',
			path: ['intermedioHasta']
		}),
	tipos: z.record(z.string().min(1), tipoSchema).refine((t) => Object.keys(t).length > 0, {
		message: 'tipos no puede estar vacío'
	}),
	calificacion: z.object({
		decimales: z.number().int().min(0).max(1),
		minimoVotos: z.number().int().nonnegative()
	}),
	// Valores numéricos con que BGG indica "sin dato" (p. ej. 0).
	sinDato: z.array(z.number()),
	caratula: z.object({
		ladoMaximo: positiveIntegerSchema,
		calidad: z.number().int().min(1).max(100),
		formato: z.literal('jpeg'),
		pesoMaximoBytes: positiveIntegerSchema,
		hostsPermitidos: z.array(nonEmptyTextSchema).min(1)
	}),
	busqueda: z.object({
		largoMinimo: positiveIntegerSchema,
		// Tope que devuelve el servidor (BGG no pagina); el cliente los muestra de a `porPagina`.
		maximoResultados: positiveIntegerSchema,
		porPagina: positiveIntegerSchema,
		debounceMs: z.number().int().nonnegative()
	})
});
export type BggConfig = z.infer<typeof bggConfigSchema>;

export const bggFuenteSchema = z.enum(['local', 'bgg']);
export type BggFuente = z.infer<typeof bggFuenteSchema>;

export const bggOrigenBusquedaSchema = z.enum(['local', 'bgg', 'local-sin-bgg']);
export type BggOrigenBusqueda = z.infer<typeof bggOrigenBusquedaSchema>;

/** Resultado de búsqueda: BGG solo entrega id, nombre y año. */
export const bggSugerenciaSchema = z.object({
	idBgg: integerIdSchema,
	nombre: nonEmptyTextSchema,
	anio: z.number().int().nullable(),
	tipo: tipoSchema.nullable(),
	// Si ya está en el catálogo (Juego.idBgg) y si solo existe en la caché.
	idJuego: integerIdSchema.nullable(),
	enCache: z.boolean()
});
export type BggSugerencia = z.infer<typeof bggSugerenciaSchema>;

export const bggBusquedaRespuestaSchema = z.object({
	resultados: z.array(bggSugerenciaSchema),
	// Resultados únicos antes del tope; si supera `resultados.length`, la búsqueda se cortó.
	total: z.number().int().nonnegative(),
	origen: bggOrigenBusquedaSchema
});
export type BggBusquedaRespuesta = z.infer<typeof bggBusquedaRespuestaSchema>;

/** Ficha normalizada al dominio; alineada con `createJuegoSchema` (sin imagen ni manual/video). */
export const bggFichaSchema = z.object({
	idBgg: integerIdSchema,
	nombreJuego: nonEmptyTextSchema,
	tipo: tipoSchema,
	// Para expansiones: id BGG del juego base (el mapeo a idJuegoBase local es de #19).
	idBggBase: integerIdSchema.nullable(),
	anio: z.number().int().nullable(),
	edadMinima: positiveIntegerSchema.nullable(),
	jugadoresMin: positiveIntegerSchema.nullable(),
	jugadoresMax: positiveIntegerSchema.nullable(),
	duracion: positiveIntegerSchema.nullable(),
	calificacion: z.number().min(0).max(10).nullable(),
	dificultad: dificultadSchema.nullable(),
	peso: z.number().min(0).max(5).nullable(),
	urlImagenBgg: z.string().url().nullable()
});
export type BggFicha = z.infer<typeof bggFichaSchema>;

export const bggCaratulaSchema = z.object({
	estado: z.enum(['lista', 'pendiente', 'sin-imagen']),
	pathImagen: z.string().nullable(),
	// URL pública en Storage (para <img>); `pathImagen` es relativa al bucket.
	urlPublica: z.string().nullable()
});
export type BggCaratula = z.infer<typeof bggCaratulaSchema>;

export const bggFichaOrigenSchema = z.enum(['cache', 'bgg', 'cache-desactualizada']);
export type BggFichaOrigen = z.infer<typeof bggFichaOrigenSchema>;

export const bggFichaRespuestaSchema = z.object({
	ficha: bggFichaSchema,
	origen: bggFichaOrigenSchema,
	caratula: bggCaratulaSchema,
	idJuego: integerIdSchema.nullable()
});
export type BggFichaRespuesta = z.infer<typeof bggFichaRespuestaSchema>;
