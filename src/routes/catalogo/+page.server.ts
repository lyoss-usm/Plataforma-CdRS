import { catalogQuerySchema, type CatalogPage } from '$lib/schemas';
import { obtenerCatalogo } from '$lib/server/catalog';
import type { PageServerLoad } from './$types';

export const prerender = false;

function crearPaginaVacia(): CatalogPage {
	return {
		juegos: [],
		total: 0,
		hayMas: false
	};
}

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const consultaInicial = catalogQuerySchema.parse({});
		const catalogoInicial = await obtenerCatalogo(consultaInicial, fetch);

		return {
			catalogoInicial,
			errorCatalogo: null
		};
	} catch (error) {
		console.error('No se pudo cargar el catálogo inicial:', error);

		return {
			catalogoInicial: crearPaginaVacia(),
			errorCatalogo: 'No pudimos cargar el catálogo en este momento.'
		};
	}
};
