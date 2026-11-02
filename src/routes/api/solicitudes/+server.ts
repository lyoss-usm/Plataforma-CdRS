import { crearSolicitudWebSchema } from '$lib/schemas';
import {
	ErrorSolicitudWeb,
	obtenerFechasRetiro,
	registrarSolicitudWeb,
	traducirBloqueRetiro
} from '$lib/server/solicitudes';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface ErrorPublicoSolicitud {
	status: number;
	message: string;
	field?: string;
}

const erroresConocidos: Record<string, ErrorPublicoSolicitud> = {
	rut_invalido: { status: 400, message: 'El RUT ingresado no es válido.', field: 'rut' },
	rol_invalido: { status: 400, message: 'El ROL ingresado no es válido.', field: 'rol' },
	nombre_invalido: {
		status: 400,
		message: 'El nombre ingresado no es válido.',
		field: 'nombreSansano'
	},
	telefono_invalido: {
		status: 400,
		message: 'El teléfono ingresado no es válido.',
		field: 'telefono'
	},
	correo_invalido: {
		status: 400,
		message: 'El correo institucional no es válido.',
		field: 'correoInstitucional'
	},
	terminos_no_aceptados: {
		status: 400,
		message: 'Debes aceptar los Términos y Condiciones.',
		field: 'aceptaTerminos'
	},
	fecha_no_disponible: {
		status: 409,
		message:
			'El bloque seleccionado ya no está disponible. Recarga las opciones e inténtalo nuevamente.',
		field: 'bloqueRetiro'
	},
	juego_base_invalido: {
		status: 400,
		message: 'Solo se puede solicitar un juego base.',
		field: 'idJuego'
	},
	juego_no_disponible: {
		status: 409,
		message: 'El juego ya no tiene ejemplares en bodega.'
	},
	expansion_invalida: {
		status: 400,
		message: 'La expansión no pertenece al juego seleccionado.',
		field: 'idJuegoExpansion'
	},
	expansion_no_disponible: {
		status: 409,
		message: 'La expansión ya no tiene ejemplares en bodega.',
		field: 'idJuegoExpansion'
	},
	datos_sansano_en_uso: {
		status: 409,
		message: 'Los datos ingresados ya están asociados a otro Sansano.'
	},
	sansano_suspendido: {
		status: 403,
		message: 'No puedes realizar solicitudes mientras tengas una suspensión activa.'
	}
};

function respuestaErrorBaseDatos(error: ErrorSolicitudWeb): ErrorPublicoSolicitud | null {
	if (error.hint === null) {
		return null;
	}

	return erroresConocidos[error.hint] ?? null;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const formulario = await request.formData();
		const fechas = await obtenerFechasRetiro(locals.supabase);
		const validacion = crearSolicitudWebSchema().safeParse(Object.fromEntries(formulario));

		if (!validacion.success) {
			return json(
				{
					message: 'Revisa los datos del formulario.',
					issues: validacion.error.issues
				},
				{ status: 400 }
			);
		}

		const { bloqueRetiro, ...datosSolicitud } = validacion.data;
		const fechaSeleccionada = traducirBloqueRetiro(fechas, bloqueRetiro);
		const idSolicitud = await registrarSolicitudWeb(locals.supabase, {
			...datosSolicitud,
			fechaSeleccionada
		});
		return json({ idSolicitud }, { status: 201 });
	} catch (error) {
		if (error instanceof ErrorSolicitudWeb) {
			const errorPublico = respuestaErrorBaseDatos(error);

			if (errorPublico !== null) {
				const { status, ...respuesta } = errorPublico;
				return json(respuesta, { status });
			}
		}

		console.error('No se pudo crear la solicitud web:', error);

		return json({ message: 'No se pudo registrar la solicitud.' }, { status: 500 });
	}
};
