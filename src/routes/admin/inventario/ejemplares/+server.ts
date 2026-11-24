import { json } from '@sveltejs/kit';
import { altaEjemplarSchema, ejemplarSchema } from '$lib/schemas';
import { leerCuerpo } from '$lib/server/cajero';
import {
	autorizarInventario,
	respuestaErrorInventario,
	siguienteIdEjemplar
} from '$lib/server/inventario';
import type { RequestHandler } from './$types';

const INTENTOS = 5;

// Alta de Ejemplar: el sistema genera el idEjemplar (wiki §2.1). Si otro alta concurrente tomó el
// mismo correlativo (UNIQUE), se reintenta con el siguiente.
export const POST: RequestHandler = async ({ request, locals }) => {
	const noAutorizado = autorizarInventario(locals.staff, 'inventario:editar');
	if (noAutorizado) return noAutorizado;

	const { datos, error: invalido } = await leerCuerpo(request, altaEjemplarSchema);
	if (invalido) return invalido;

	const { data: juego, error: errorJuego } = await locals.supabase
		.from('Juego')
		.select('nombreJuego')
		.eq('idJuego', datos.idJuego)
		.maybeSingle();

	if (errorJuego) return respuestaErrorInventario(errorJuego, 'No se pudo leer el juego');
	if (!juego) return json({ error: 'El juego no existe' }, { status: 404 });

	try {
		for (let intento = 1; intento <= INTENTOS; intento += 1) {
			const idEjemplar = await siguienteIdEjemplar(locals.supabase, juego.nombreJuego);
			const { data, error } = await locals.supabase
				.from('Ejemplar')
				.insert({ ...datos, idEjemplar })
				.select()
				.single();

			if (!error) return json({ ejemplar: ejemplarSchema.parse(data) }, { status: 201 });
			if (error.code !== '23505' || intento === INTENTOS) {
				return respuestaErrorInventario(error, 'No se pudo crear el ejemplar');
			}
		}
	} catch (error) {
		console.error('No se pudo crear el ejemplar:', error);
	}

	return json({ error: 'Error interno del servidor' }, { status: 500 });
};
