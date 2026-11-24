import { json } from '@sveltejs/kit';
import { juegoSchema, updateJuegoSchema } from '$lib/schemas';
import { integerIdSchema } from '$lib/schemas/common';
import { leerCuerpo } from '$lib/server/cajero';
import { autorizarInventario, respuestaErrorInventario } from '$lib/server/inventario';
import type { RequestHandler } from './$types';

function leerId(param: string): number | null {
	const id = integerIdSchema.safeParse(Number(param));
	return id.success ? id.data : null;
}

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const noAutorizado = autorizarInventario(locals.staff, 'inventario:editar');
	if (noAutorizado) return noAutorizado;

	const idJuego = leerId(params.id);
	if (idJuego === null) return json({ error: 'Identificador de juego inválido' }, { status: 400 });

	const { datos, error: invalido } = await leerCuerpo(request, updateJuegoSchema);
	if (invalido) return invalido;

	const { data, error } = await locals.supabase
		.from('Juego')
		.update(datos)
		.eq('idJuego', idJuego)
		.select()
		.maybeSingle();

	if (error) return respuestaErrorInventario(error, 'No se pudo actualizar el juego');
	if (!data) return json({ error: 'El juego no existe' }, { status: 404 });

	return json({ juego: juegoSchema.parse(data) });
};

// Borrado físico solo sin referencias (FK RESTRICT): la DB lo rechaza y se traduce el motivo.
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const noAutorizado = autorizarInventario(locals.staff, 'inventario:eliminar');
	if (noAutorizado) return noAutorizado;

	const idJuego = leerId(params.id);
	if (idJuego === null) return json({ error: 'Identificador de juego inválido' }, { status: 400 });

	const { data, error } = await locals.supabase
		.from('Juego')
		.delete()
		.eq('idJuego', idJuego)
		.select('idJuego')
		.maybeSingle();

	if (error) return respuestaErrorInventario(error, 'No se pudo eliminar el juego');
	if (!data) return json({ error: 'El juego no existe' }, { status: 404 });

	return json({ success: true });
};
