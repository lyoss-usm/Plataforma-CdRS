import { json } from '@sveltejs/kit';
import {
	autorizarInventarioApi,
	procesarYSubirCaratula,
	respuestaErrorBgg
} from '$lib/server/bggServicio';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	const noAutorizado = autorizarInventarioApi(locals.staff);
	if (noAutorizado) return noAutorizado;

	if (!/^[1-9]\d{0,9}$/.test(params.id)) return json({ error: 'id inválido' }, { status: 400 });

	try {
		const resultado = await procesarYSubirCaratula(locals.supabase, Number(params.id));
		if (!resultado) {
			return json(
				{ error: 'Consulta primero la ficha del juego (GET /api/bgg/{id})' },
				{ status: 404 }
			);
		}
		return json(resultado);
	} catch (e) {
		// La carátula no bloquea la ficha: queda pendiente y se puede reintentar.
		console.error('[bgg] carátula', e);
		try {
			return respuestaErrorBgg(e);
		} catch {
			return json(
				{
					error: 'No se pudo procesar la carátula',
					caratula: { estado: 'pendiente', pathImagen: null, urlPublica: null }
				},
				{ status: 502 }
			);
		}
	}
};
