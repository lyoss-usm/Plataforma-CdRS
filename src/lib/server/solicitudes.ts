import {
	expansionSolicitudSchema,
	fechaRetiroDisponibleSchema,
	opcionesSolicitudWebSchema,
	type OpcionesSolicitudWeb,
	type SolicitudWebData
} from '$lib/schemas';
import { z } from 'zod';
import type { ClienteSupabase } from './supabase';

const idSolicitudSchema = z.number().int().positive();

export class ErrorSolicitudWeb extends Error {
	constructor(
		message: string,
		readonly hint: string | null,
		readonly code: string | null
	) {
		super(message);
		this.name = 'ErrorSolicitudWeb';
	}
}

export async function obtenerFechasRetiro(
	supabase: ClienteSupabase
): Promise<OpcionesSolicitudWeb['fechas']> {
	const { data, error } = await supabase.rpc('fechas_retiro_disponibles');

	if (error) {
		throw new ErrorSolicitudWeb(error.message, error.hint, error.code);
	}

	return z.array(fechaRetiroDisponibleSchema).length(2).parse(data);
}

export async function obtenerOpcionesSolicitud(
	supabase: ClienteSupabase,
	idJuego: number
): Promise<OpcionesSolicitudWeb> {
	const idJuegoValidado = z.number().int().positive().parse(idJuego);
	const [fechas, respuestaExpansiones] = await Promise.all([
		obtenerFechasRetiro(supabase),
		supabase.rpc('expansiones_disponibles', {
			p_id_juego_base: idJuegoValidado
		})
	]);

	if (respuestaExpansiones.error) {
		throw new ErrorSolicitudWeb(
			respuestaExpansiones.error.message,
			respuestaExpansiones.error.hint,
			respuestaExpansiones.error.code
		);
	}

	return opcionesSolicitudWebSchema.parse({
		fechas,
		expansiones: z.array(expansionSolicitudSchema).parse(respuestaExpansiones.data)
	});
}

export async function registrarSolicitudWeb(
	supabase: ClienteSupabase,
	datos: SolicitudWebData
): Promise<number> {
	const { data, error } = await supabase.rpc('crear_solicitud_web', {
		p_id_juego: datos.idJuego,
		p_rut_sansano: datos.rutSansano,
		p_rol_sansano: datos.rolSansano,
		p_digito_verificador: datos.digitoVerificador,
		p_nombre_sansano: datos.nombreSansano,
		p_telefono: datos.telefono,
		p_correo_institucional: datos.correoInstitucional,
		p_fecha_seleccionada: datos.fechaSeleccionada,
		p_acepta_terminos: datos.aceptaTerminos,
		p_id_juego_expansion: datos.idJuegoExpansion
	});

	if (error) {
		throw new ErrorSolicitudWeb(error.message, error.hint, error.code);
	}

	return idSolicitudSchema.parse(data);
}
