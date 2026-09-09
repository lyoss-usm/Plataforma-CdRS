import { obtenerCatalogo } from '$lib/server/catalog';
import { catalogQuerySchema } from '$lib/schemas';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function optionalNumber(value: string | null): number | undefined {
	if (value === null || value === '') {
		return undefined;
	}

	return Number(value);
}

function optionalBoolean(value: string | null): boolean | string | undefined {
	if (value === null || value === '') {
		return undefined;
	}

	if (value === 'true') {
		return true;
	}

	if (value === 'false') {
		return false;
	}

	return value;
}

export const GET: RequestHandler = async ({ url, fetch }) => {
	const validation = catalogQuerySchema.safeParse({
		nombre: url.searchParams.get('nombre') ?? undefined,
		jugadores: optionalNumber(url.searchParams.get('jugadores')),
		duracionMin: optionalNumber(url.searchParams.get('duracionMin')),
		duracionMax: optionalNumber(url.searchParams.get('duracionMax')),
		disponible: optionalBoolean(url.searchParams.get('disponible')),
		calificacionMin: optionalNumber(url.searchParams.get('calificacionMin')),
		dificultad: url.searchParams.get('dificultad') ?? undefined,
		offset: optionalNumber(url.searchParams.get('offset')),
		limit: optionalNumber(url.searchParams.get('limit'))
	});

	if (!validation.success) {
		return json(
			{
				message: 'Los filtros del catálogo no son válidos.',
				issues: validation.error.issues
			},
			{ status: 400 }
		);
	}

	try {
		const catalogPage = await obtenerCatalogo(validation.data, fetch);
		return json(catalogPage);
	} catch (error) {
		console.error('No se pudo obtener el catálogo:', error);

		return json(
			{
				message: 'No se pudo cargar el catálogo.'
			},
			{ status: 500 }
		);
	}
};
