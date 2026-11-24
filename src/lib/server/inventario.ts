import { json } from '@sveltejs/kit';
import { z } from 'zod';
import type { PostgrestError } from '@supabase/supabase-js';
import {
	ejemplarSchema,
	juegoSchema,
	type Ejemplar,
	type Juego,
	type NombrePermiso
} from '$lib/schemas';
import type { StaffSesion } from './auth';
import type { ClienteSupabase } from './supabase';

export interface InventarioCompleto {
	juegos: Juego[];
	ejemplares: Ejemplar[];
}

/**
 * El guard de `/admin` (layout) no protege los `+server.ts`: cada handler valida sesión y permiso.
 * La autoridad sigue siendo la RLS (`juego_*_inventario`, `ejemplar_*_inventario`).
 */
export function autorizarInventario(
	staff: StaffSesion | null,
	permiso: Extract<NombrePermiso, 'inventario:editar' | 'inventario:eliminar'>
): Response | null {
	if (!staff) {
		return json({ error: 'No autorizado' }, { status: 401 });
	}

	if (!staff.permisos.includes(permiso)) {
		return json({ error: 'Tu cargo no puede administrar el inventario' }, { status: 403 });
	}

	return null;
}

/**
 * Inventario completo (juegos y ejemplares). El del club son cientos de filas, así que se carga
 * entero y la tabla filtra y pagina en el cliente; si crece, pasar a paginación en la DB (wiki §2.1).
 */
export async function cargarInventario(supabase: ClienteSupabase): Promise<InventarioCompleto> {
	const [juegos, ejemplares] = await Promise.all([
		supabase.from('Juego').select('*').order('nombreJuego'),
		supabase.from('Ejemplar').select('*').order('idEjemplar')
	]);

	if (juegos.error) throw new Error(`No se pudieron leer los juegos: ${juegos.error.message}`);
	if (ejemplares.error) {
		throw new Error(`No se pudieron leer los ejemplares: ${ejemplares.error.message}`);
	}

	return {
		juegos: z.array(juegoSchema).parse(juegos.data),
		ejemplares: z.array(ejemplarSchema).parse(ejemplares.data)
	};
}

/**
 * `idEjemplar` generado por el sistema (wiki §2.1): 3 letras del nombre + correlativo, p. ej.
 * `CAT-003`. Corto para escribirlo a mano en el cajero y en mayúsculas porque el cajero normaliza
 * así lo escaneado. Los IDs importados de AppSheet (#48) tienen otro formato y no chocan.
 */
export function prefijoEjemplar(nombreJuego: string): string {
	return nombreJuego
		.normalize('NFD')
		.replace(/[^a-zA-Z0-9]/g, '')
		.slice(0, 3)
		.toUpperCase()
		.padEnd(3, 'X');
}

export async function siguienteIdEjemplar(
	supabase: ClienteSupabase,
	nombreJuego: string
): Promise<string> {
	const prefijo = prefijoEjemplar(nombreJuego);
	const { data, error } = await supabase
		.from('Ejemplar')
		.select('idEjemplar')
		.like('idEjemplar', `${prefijo}-%`);

	if (error) throw new Error(`No se pudo generar el idEjemplar: ${error.message}`);

	const mayor = data.reduce((max, { idEjemplar }) => {
		const correlativo = Number(idEjemplar.slice(prefijo.length + 1));
		return Number.isInteger(correlativo) ? Math.max(max, correlativo) : max;
	}, 0);

	return `${prefijo}-${String(mayor + 1).padStart(3, '0')}`;
}

// Restricciones de Juego/Ejemplar: el detalle de Postgres nombra la columna o tabla en conflicto.
const duplicados: [columna: string, mensaje: string][] = [
	['nombreJuego', 'Ya existe un juego con ese nombre.'],
	['idBgg', 'Ese juego de BGG ya está enlazado a otra ficha.'],
	['idEjemplar', 'Ya existe un ejemplar con ese código.']
];

const referencias: [tabla: string, mensaje: string][] = [
	['"Ejemplar"', 'Tiene ejemplares asociados. Elimínalos primero.'],
	[
		'"Juego"',
		'Es el juego base de una o más expansiones. Cambia o elimina esas expansiones primero.'
	],
	[
		'"Solicitud"',
		'Tiene historial de solicitudes o préstamos. Márcalo «Perdido» o «Con su dueño» en vez de borrarlo.'
	]
];

/** Traduce errores de Postgres (UNIQUE, FK RESTRICT, triggers de Juego) a respuestas legibles. */
export function respuestaErrorInventario(error: PostgrestError, contexto: string): Response {
	if (error.code === '42501') {
		return json({ error: 'Tu cargo no puede administrar el inventario' }, { status: 403 });
	}

	if (error.code === '23505') {
		const duplicado = duplicados.find(([columna]) => error.details?.includes(columna));
		return json({ error: duplicado?.[1] ?? 'El registro ya existe.' }, { status: 409 });
	}

	if (error.code === '23503') {
		const referencia = referencias.find(([tabla]) => error.details?.includes(tabla));
		return json(
			{ error: referencia?.[1] ?? 'El registro está en uso y no se puede eliminar.' },
			{ status: 409 }
		);
	}

	// chk_juego_base_expansion (mensaje de Postgres en inglés) y trg_validar_juego_base (en español).
	if (error.code === '23514') {
		return json(
			{ error: 'Una expansión necesita su juego base y un juego base no lleva uno.' },
			{ status: 409 }
		);
	}

	if (error.code === 'P0001') {
		return json({ error: error.message }, { status: 409 });
	}

	console.error(`${contexto}:`, error);
	return json({ error: 'Error interno del servidor' }, { status: 500 });
}
