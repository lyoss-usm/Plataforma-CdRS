import { json } from '@sveltejs/kit';
import { z } from 'zod';
import type { PostgrestError } from '@supabase/supabase-js';
import {
	busquedaSolicitanteSchema,
	fichaEjemplarSchema,
	prestamoEnCursoSchema,
	sansanoSchema,
	suspensionSchema,
	type AltaSansanoDto,
	type BusquedaEjemplar,
	type BusquedaSolicitante,
	type FichaEjemplar,
	type PrestamoEnCurso,
	type Sansano
} from '$lib/schemas';
import type { StaffSesion } from './auth';
import type { ClienteSupabase } from './supabase';

/**
 * El guard de `/admin` (layout) no protege los `+server.ts`: cada handler del cajero valida sesión y
 * `prestamos:junta`. La autoridad sigue siendo la DB (RPC y RLS validan cada operación).
 */
export function autorizarCajero(staff: StaffSesion | null): Response | null {
	if (!staff) {
		return json({ error: 'No autorizado' }, { status: 401 });
	}

	if (!staff.permisos.includes('prestamos:junta')) {
		return json({ error: 'Tu cargo no puede registrar préstamos de junta' }, { status: 403 });
	}

	return null;
}

/** Valida el cuerpo JSON; si falla devuelve la respuesta 400 con los errores por campo. */
export async function leerCuerpo<T extends z.ZodType>(
	request: Request,
	schema: T
): Promise<{ datos: z.infer<T>; error: null } | { datos: null; error: Response }> {
	const cuerpo = await request.json().catch(() => undefined);
	const validacion = schema.safeParse(cuerpo);

	if (!validacion.success) {
		return {
			datos: null,
			error: json(
				{ error: 'Datos inválidos', detalles: z.flattenError(validacion.error).fieldErrors },
				{ status: 400 }
			)
		};
	}

	return { datos: validacion.data, error: null };
}

// Restricciones UNIQUE de Sansano: el detalle de Postgres nombra la columna repetida.
const duplicadosSansano: [columna: string, mensaje: string][] = [
	['rutSansano', 'Ya existe un sansano con ese RUT.'],
	['rolSansano', 'Ya existe un sansano con ese rol.'],
	['telefono', 'El teléfono ya está registrado.'],
	['correoInstitucional', 'El correo ya está registrado.']
];

/** Traduce errores de Postgres/RPC (ver 20261030120000_endurecer_rpc_prestamos.sql). */
export function respuestaErrorDb(error: PostgrestError, contexto: string): Response {
	if (error.code === '42501') {
		return json({ error: error.message }, { status: 403 });
	}

	if (error.code === 'P0001') {
		const status = error.hint?.endsWith('_inexistente') ? 404 : 409;
		return json({ error: error.message }, { status });
	}

	if (error.code === '23505') {
		const duplicado = duplicadosSansano.find(([columna]) => error.details?.includes(columna));
		return json({ error: duplicado?.[1] ?? 'El registro ya existe.' }, { status: 409 });
	}

	console.error(`${contexto}:`, error);
	return json({ error: 'Error interno del servidor' }, { status: 500 });
}

function fallar(error: PostgrestError, contexto: string): never {
	throw new Error(`${contexto}: ${error.message}`, { cause: error });
}

async function fichaDe(
	supabase: ClienteSupabase,
	idEjemplar: string
): Promise<FichaEjemplar | null> {
	const { data: ejemplar, error } = await supabase
		.from('Ejemplar')
		.select('*')
		.eq('idEjemplar', idEjemplar)
		.maybeSingle();

	if (error) fallar(error, 'No se pudo leer el ejemplar');
	if (!ejemplar) return null;

	const { data: juego, error: errorJuego } = await supabase
		.from('Juego')
		.select('*')
		.eq('idJuego', ejemplar.idJuego)
		.single();

	if (errorJuego) fallar(errorJuego, 'No se pudo leer el juego');

	return fichaEjemplarSchema.parse({ ejemplar, juego });
}

async function sansanoDe(supabase: ClienteSupabase, rut: number): Promise<Sansano | null> {
	const { data, error } = await supabase
		.from('Sansano')
		.select('*')
		.eq('rutSansano', rut)
		.maybeSingle();

	if (error) fallar(error, 'No se pudo leer el sansano');

	return data ? sansanoSchema.parse(data) : null;
}

/** Préstamo 'Activo' del ejemplar o del sansano, con su contexto para la ficha del mesón. */
async function prestamoActivo(
	supabase: ClienteSupabase,
	filtro: { idEjemplar: string } | { rutSansano: number }
): Promise<PrestamoEnCurso | null> {
	const [columna, valor] = Object.entries(filtro)[0];

	const { data, error } = await supabase
		.from('Prestamo')
		.select('*, Solicitud!inner(*)')
		.eq('estadoPrestamo', 'Activo')
		.eq(`Solicitud.${columna}`, valor)
		.order('fechaRetiro', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (error) fallar(error, 'No se pudo leer el préstamo activo');
	if (!data) return null;

	const { Solicitud: solicitud, ...prestamo } = data;
	const [ficha, sansano] = await Promise.all([
		fichaDe(supabase, solicitud.idEjemplar),
		sansanoDe(supabase, solicitud.rutSansano)
	]);

	if (!ficha || !sansano) return null;

	return prestamoEnCursoSchema.parse({ prestamo, solicitud, ...ficha, sansano });
}

export async function buscarEjemplar(
	supabase: ClienteSupabase,
	idEjemplar: string
): Promise<BusquedaEjemplar | null> {
	const ficha = await fichaDe(supabase, idEjemplar);

	if (!ficha) return null;

	return { ficha, prestamoActivo: await prestamoActivo(supabase, { idEjemplar }) };
}

export async function buscarSolicitante(
	supabase: ClienteSupabase,
	rut: number
): Promise<BusquedaSolicitante | null> {
	const sansano = await sansanoDe(supabase, rut);

	if (!sansano) return null;

	// suspension_activa() decide la vigencia en la DB (evita comparar TIMESTAMP sin zona en JS);
	// la fila más reciente da la razón que se muestra en el mesón.
	const [{ data: suspendido, error: errorVigencia }, activo] = await Promise.all([
		supabase.rpc('suspension_activa', { p_rut: rut }),
		prestamoActivo(supabase, { rutSansano: rut })
	]);

	if (errorVigencia) fallar(errorVigencia, 'No se pudo consultar la suspensión');

	let suspension = null;

	if (suspendido) {
		const { data, error } = await supabase
			.from('Suspension')
			.select('*')
			.eq('rutSansano', rut)
			.order('fechaInicio', { ascending: false })
			.limit(1)
			.single();

		if (error) fallar(error, 'No se pudo leer la suspensión');
		suspension = suspensionSchema.parse(data);
	}

	return busquedaSolicitanteSchema.parse({ sansano, suspension, prestamoActivo: activo });
}

/** Alta de un sansano común (sin cargo ni cuenta); la RLS `sansano_insert_staff` lo permite a todo el staff. */
export async function crearSansano(
	supabase: ClienteSupabase,
	datos: AltaSansanoDto
): Promise<{ sansano: Sansano; error: null } | { sansano: null; error: PostgrestError }> {
	const { data, error } = await supabase
		.from('Sansano')
		.insert({ ...datos, idCargo: null, authUserId: null })
		.select('*')
		.single();

	if (error) return { sansano: null, error };

	return { sansano: sansanoSchema.parse(data), error: null };
}
