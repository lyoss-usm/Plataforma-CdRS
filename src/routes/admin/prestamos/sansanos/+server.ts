import { json } from '@sveltejs/kit';
import { altaSansanoSchema } from '$lib/schemas';
import { autorizarCajero, crearSansano, leerCuerpo, respuestaErrorDb } from '$lib/server/cajero';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const noAutorizado = autorizarCajero(locals.staff);
	if (noAutorizado) return noAutorizado;

	const { datos, error: invalido } = await leerCuerpo(request, altaSansanoSchema);
	if (invalido) return invalido;

	const { sansano, error } = await crearSansano(locals.supabase, datos);

	if (error) {
		return respuestaErrorDb(error, 'No se pudo dar de alta al sansano');
	}

	return json({ sansano }, { status: 201 });
};
