import { json } from '@sveltejs/kit';
import { ejemplarIdSchema } from '$lib/schemas/common';
import { autorizarCajero, buscarEjemplar } from '$lib/server/cajero';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	const noAutorizado = autorizarCajero(locals.staff);
	if (noAutorizado) return noAutorizado;

	const id = ejemplarIdSchema.safeParse(params.id.trim().toUpperCase());
	if (!id.success) {
		return json({ error: 'Código de ejemplar inválido' }, { status: 400 });
	}

	try {
		const resultado = await buscarEjemplar(locals.supabase, id.data);

		if (!resultado) {
			return json({ error: `El ejemplar ${id.data} no existe` }, { status: 404 });
		}

		return json(resultado);
	} catch (error) {
		console.error('No se pudo buscar el ejemplar:', error);
		return json({ error: 'Error interno del servidor' }, { status: 500 });
	}
};
