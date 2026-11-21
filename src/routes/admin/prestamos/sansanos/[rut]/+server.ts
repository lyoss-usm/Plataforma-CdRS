import { json } from '@sveltejs/kit';
import { rutSchema } from '$lib/schemas/common';
import { autorizarCajero, buscarSolicitante } from '$lib/server/cajero';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	const noAutorizado = autorizarCajero(locals.staff);
	if (noAutorizado) return noAutorizado;

	const rut = rutSchema.safeParse(Number(params.rut));
	if (!rut.success) {
		return json({ error: 'RUT inválido' }, { status: 400 });
	}

	try {
		const resultado = await buscarSolicitante(locals.supabase, rut.data);

		if (!resultado) {
			return json({ error: `El sansano ${rut.data} no está registrado` }, { status: 404 });
		}

		return json(resultado);
	} catch (error) {
		console.error('No se pudo buscar al solicitante:', error);
		return json({ error: 'Error interno del servidor' }, { status: 500 });
	}
};
