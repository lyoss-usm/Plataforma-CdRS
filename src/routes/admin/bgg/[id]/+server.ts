import { json } from '@sveltejs/kit';
import { autorizarInventarioApi, obtenerFicha, respuestaErrorBgg } from '$lib/server/bggServicio';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	const noAutorizado = autorizarInventarioApi(locals.staff);
	if (noAutorizado) return noAutorizado;

	if (!/^[1-9]\d{0,9}$/.test(params.id)) return json({ error: 'id inválido' }, { status: 400 });

	try {
		const respuesta = await obtenerFicha(locals.supabase, Number(params.id));
		if (!respuesta) return json({ error: 'El juego no existe en BGG' }, { status: 404 });
		return json(respuesta);
	} catch (e) {
		return respuestaErrorBgg(e);
	}
};
