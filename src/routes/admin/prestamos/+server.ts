import { json } from '@sveltejs/kit';
import { devolucionSchema, prestamoJuntaSchema } from '$lib/schemas';
import { autorizarCajero, leerCuerpo, respuestaErrorDb } from '$lib/server/cajero';
import type { RequestHandler } from './$types';

const autorizarJunta = (staff: App.Locals['staff']) =>
	autorizarCajero(staff, ['prestamos:junta'], 'Tu cargo no puede registrar préstamos de junta');

export const POST: RequestHandler = async ({ request, url, locals }) => {
	const noAutorizado = autorizarJunta(locals.staff);
	if (noAutorizado) return noAutorizado;

	if (url.searchParams.get('tipo') !== 'junta') {
		return json({ error: 'Endpoint configurado solo para préstamos de junta' }, { status: 400 });
	}

	const { datos, error: invalido } = await leerCuerpo(request, prestamoJuntaSchema);
	if (invalido) return invalido;

	const { data: idPrestamo, error } = await locals.supabase.rpc('crear_prestamo_junta', {
		p_id_ejemplar: datos.idEjemplar,
		p_rut_sansano: datos.rutSansano,
		p_tipo_documento: datos.tipoDocumento
	});

	if (error) {
		return respuestaErrorDb(error, 'No se pudo crear el préstamo de junta');
	}

	return json({ success: true, idPrestamo }, { status: 201 });
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
	const noAutorizado = autorizarJunta(locals.staff);
	if (noAutorizado) return noAutorizado;

	const { datos, error: invalido } = await leerCuerpo(request, devolucionSchema);
	if (invalido) return invalido;

	const { error } = await locals.supabase.rpc('devolver_prestamo', {
		p_id_prestamo: datos.idPrestamo,
		p_estado_final: datos.estadoFinal
	});

	if (error) {
		return respuestaErrorDb(error, 'No se pudo registrar la devolución');
	}

	return json({ success: true });
};
