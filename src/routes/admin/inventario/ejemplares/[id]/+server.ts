import { json } from '@sveltejs/kit';
import { edicionEjemplarSchema, ejemplarSchema } from '$lib/schemas';
import { ejemplarIdSchema } from '$lib/schemas/common';
import { leerCuerpo } from '$lib/server/cajero';
import { autorizarInventario, respuestaErrorInventario } from '$lib/server/inventario';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const noAutorizado = autorizarInventario(locals.staff, 'inventario:editar');
	if (noAutorizado) return noAutorizado;

	const id = ejemplarIdSchema.safeParse(params.id);
	if (!id.success) return json({ error: 'Código de ejemplar inválido' }, { status: 400 });

	const { datos, error: invalido } = await leerCuerpo(request, edicionEjemplarSchema);
	if (invalido) return invalido;

	const { data: actual, error: errorActual } = await locals.supabase
		.from('Ejemplar')
		.select('estadoEjemplar')
		.eq('idEjemplar', id.data)
		.maybeSingle();

	if (errorActual) return respuestaErrorInventario(errorActual, 'No se pudo leer el ejemplar');
	if (!actual) return json({ error: 'El ejemplar no existe' }, { status: 404 });

	// «Prestado» entra y sale solo por los flujos de préstamo (wiki §2.1): el inventario no lo asigna
	// ni lo quita, pero sí puede corregir el resto de la ficha de un ejemplar prestado.
	const cambiaEstado =
		datos.estadoEjemplar !== undefined && datos.estadoEjemplar !== actual.estadoEjemplar;
	if (
		cambiaEstado &&
		(datos.estadoEjemplar === 'Prestado' || actual.estadoEjemplar === 'Prestado')
	) {
		return json(
			{
				error: 'El estado «Prestado» solo lo asignan y lo quitan los préstamos, no el inventario.'
			},
			{ status: 409 }
		);
	}

	const { data, error } = await locals.supabase
		.from('Ejemplar')
		.update(datos)
		.eq('idEjemplar', id.data)
		.select()
		.maybeSingle();

	if (error) return respuestaErrorInventario(error, 'No se pudo actualizar el ejemplar');
	if (!data) return json({ error: 'El ejemplar no existe' }, { status: 404 });

	return json({ ejemplar: ejemplarSchema.parse(data) });
};

// Borrado físico solo sin historial (FK RESTRICT desde Solicitud): la DB lo rechaza y se traduce.
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const noAutorizado = autorizarInventario(locals.staff, 'inventario:eliminar');
	if (noAutorizado) return noAutorizado;

	const id = ejemplarIdSchema.safeParse(params.id);
	if (!id.success) return json({ error: 'Código de ejemplar inválido' }, { status: 400 });

	const { data, error } = await locals.supabase
		.from('Ejemplar')
		.delete()
		.eq('idEjemplar', id.data)
		.select('idEjemplar')
		.maybeSingle();

	if (error) return respuestaErrorInventario(error, 'No se pudo eliminar el ejemplar');
	if (!data) return json({ error: 'El ejemplar no existe' }, { status: 404 });

	return json({ success: true });
};
