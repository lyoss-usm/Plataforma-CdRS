import {
	expansionSolicitudSchema,
	fechaRetiroDisponibleSchema,
	opcionesSolicitudWebSchema,
	type BloqueRetiro,
	type FechaRetiroDisponible,
	type OpcionesSolicitudWeb,
	type SolicitudWebData
} from '$lib/schemas';
import { z } from 'zod';
import type { ClienteSupabase } from './supabase';

const idSolicitudSchema = z.number().int().positive();

type SolicitudWebPersistible = Omit<SolicitudWebData, 'bloqueRetiro'> & {
	fechaSeleccionada: string;
};

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
): Promise<FechaRetiroDisponible[]> {
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
	const respuestaExpansiones = await supabase.rpc('expansiones_disponibles', {
		p_id_juego_base: idJuegoValidado
	});

	if (respuestaExpansiones.error) {
		throw new ErrorSolicitudWeb(
			respuestaExpansiones.error.message,
			respuestaExpansiones.error.hint,
			respuestaExpansiones.error.code
		);
	}

	return opcionesSolicitudWebSchema.parse({
		expansiones: z.array(expansionSolicitudSchema).parse(respuestaExpansiones.data)
	});
}

export function traducirBloqueRetiro(
	fechas: FechaRetiroDisponible[],
	bloque: BloqueRetiro
): string {
	const diaSemana = bloque === 'martes' ? 2 : 4;
	const opcion = fechas.find(
		({ fechaSeleccionada }) => new Date(`${fechaSeleccionada}T00:00:00Z`).getUTCDay() === diaSemana
	);

	if (!opcion) {
		throw new ErrorSolicitudWeb(
			'No existe una fecha vigente para el bloque seleccionado.',
			'fecha_no_disponible',
			'P0001'
		);
	}

	return opcion.fechaSeleccionada;
}

export async function registrarSolicitudWeb(
	supabase: ClienteSupabase,
	datos: SolicitudWebPersistible
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
