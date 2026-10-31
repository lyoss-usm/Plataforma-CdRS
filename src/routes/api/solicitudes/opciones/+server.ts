import { obtenerOpcionesSolicitud } from '$lib/server/solicitudes';
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';

const consultaOpcionesSchema = z.object({
	idJuego: z.coerce.number().int().positive()
});

export const GET: RequestHandler = async ({ url, locals }) => {
	const validacion = consultaOpcionesSchema.safeParse({
		idJuego: url.searchParams.get('idJuego')
	});

	if (!validacion.success) {
		return json(
			{
				message: 'El identificador del juego no es válido.',
				issues: validacion.error.issues
			},
			{ status: 400 }
		);
	}

	try {
		const opciones = await obtenerOpcionesSolicitud(locals.supabase, validacion.data.idJuego);
		return json(opciones);
	} catch (error) {
		console.error('No se pudieron obtener las opciones de la solicitud:', error);

		return json(
			{ message: 'No se pudieron cargar las opciones de la solicitud.' },
			{ status: 500 }
		);
	}
};
