import { json } from '@sveltejs/kit';
import { createJuegoSchema, juegoSchema } from '$lib/schemas';
import { leerCuerpo } from '$lib/server/cajero';
import { autorizarInventario, respuestaErrorInventario } from '$lib/server/inventario';
import type { RequestHandler } from './$types';

// Alta de Juego (wiki §2.1). La coherencia tipo ↔ idJuegoBase y el nombre único los valida la DB.
export const POST: RequestHandler = async ({ request, locals }) => {
	const noAutorizado = autorizarInventario(locals.staff, 'inventario:editar');
	if (noAutorizado) return noAutorizado;

	const { datos, error: invalido } = await leerCuerpo(request, createJuegoSchema);
	if (invalido) return invalido;

	// Cliente sin tipos generados: la unión base/expansión se pasa como fila plana.
	const fila: Record<string, unknown> = { ...datos };
	const { data, error } = await locals.supabase.from('Juego').insert(fila).select().single();

	if (error) return respuestaErrorInventario(error, 'No se pudo crear el juego');

	return json({ juego: juegoSchema.parse(data) }, { status: 201 });
};
