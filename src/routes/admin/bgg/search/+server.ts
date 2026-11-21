import { json } from '@sveltejs/kit';
import { bggConfig } from '$lib/data/bgg';
import { bggFuenteSchema } from '$lib/schemas/bgg';
import { autorizarInventarioApi, buscar, respuestaErrorBgg } from '$lib/server/bggServicio';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const noAutorizado = autorizarInventarioApi(locals.staff);
	if (noAutorizado) return noAutorizado;

	const consulta = (url.searchParams.get('q') ?? '').trim();
	if (consulta.length < bggConfig.busqueda.largoMinimo) {
		return json(
			{ error: `La búsqueda requiere al menos ${bggConfig.busqueda.largoMinimo} caracteres` },
			{ status: 400 }
		);
	}

	const fuente = bggFuenteSchema.safeParse(url.searchParams.get('fuente') ?? 'local');
	if (!fuente.success) return json({ error: 'fuente inválida (local | bgg)' }, { status: 400 });

	try {
		const respuesta = await buscar(
			locals.supabase,
			consulta,
			fuente.data,
			url.searchParams.get('exacta') === '1'
		);
		return json(respuesta);
	} catch (e) {
		return respuestaErrorBgg(e);
	}
};
