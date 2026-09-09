import { env } from '$env/dynamic/private';
import {
	catalogGameSchema,
	catalogPageSchema,
	catalogQuerySchema,
	type CatalogPage,
	type CatalogQuery
} from '$lib/schemas';
import { z } from 'zod';

type FetchFunction = typeof globalThis.fetch;

const catalogRowSchema = catalogGameSchema.and(
	z.object({
		total: z.coerce.number().int().nonnegative()
	})
);

function getSupabaseConfig() {
	const url = env.SUPABASE_URL;
	const anonKey = env.SUPABASE_ANON_KEY;

	if (!url || !anonKey) {
		throw new Error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY.');
	}

	return {
		url: url.replace(/\/$/, ''),
		anonKey
	};
}

export async function obtenerCatalogo(
	query: CatalogQuery,
	fetchFunction: FetchFunction = globalThis.fetch
): Promise<CatalogPage> {
	const validatedQuery = catalogQuerySchema.parse(query);
	const { url, anonKey } = getSupabaseConfig();

	const response = await fetchFunction(`${url}/rest/v1/rpc/buscar_catalogo`, {
		method: 'POST',
		headers: {
			apikey: anonKey,
			Authorization: `Bearer ${anonKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			p_nombre: validatedQuery.nombre,
			p_jugadores: validatedQuery.jugadores,
			p_duracion_min: validatedQuery.duracionMin,
			p_duracion_max: validatedQuery.duracionMax,
			p_disponible: validatedQuery.disponible,
			p_calificacion_min: validatedQuery.calificacionMin,
			p_dificultad: validatedQuery.dificultad,
			p_offset: validatedQuery.offset,
			p_limit: validatedQuery.limit
		})
	});

	if (!response.ok) {
		throw new Error(`Supabase rechazó la consulta del catálogo: HTTP ${response.status}.`);
	}

	const rows = z.array(catalogRowSchema).parse(await response.json());
	const total = rows[0]?.total ?? 0;

	const juegos = rows.map(({ total: _total, ...juego }) => juego);

	return catalogPageSchema.parse({
		juegos,
		total,
		hayMas: validatedQuery.offset + juegos.length < total
	});
}
