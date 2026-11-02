import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { bggConfig } from '$lib/data/bgg';
import { procesarCaratula } from '$lib/bgg/caratula';
import {
	ErrorFormatoBgg,
	ErrorJuegoInexistente,
	dificultadDesdePeso,
	parseBusqueda,
	parseFicha
} from '$lib/bgg/normalizar';
import {
	bggFichaSchema,
	type BggBusquedaRespuesta,
	type BggCaratula,
	type BggFicha,
	type BggFichaRespuesta,
	type BggFuente,
	type BggSugerencia
} from '$lib/schemas/bgg';
import { tipoSchema } from '$lib/schemas/enums';
import type { StaffSesion } from './auth';
import { ErrorBgg, bggMockActivo, pedirBgg } from './bgg';
import type { ClienteSupabase } from './supabase';
import { leerImagenMock } from './bggMock';

const BUCKET = 'ludoteca';
const PERMISO = 'inventario:editar';
const TIMEOUT_IMAGEN_MS = 10_000;
const MAX_BYTES_ORIGINAL = 25 * 1024 * 1024;

/**
 * El guard de hooks ya autenticó y resolvió `locals.staff` para `/admin/*`; el layout no protege los
 * `+server.ts`, así que cada handler exige `inventario:editar`.
 */
export function autorizarInventarioApi(staff: StaffSesion | null): Response | null {
	if (!staff) return json({ error: 'No autorizado' }, { status: 401 });
	if (!staff.permisos.includes(PERMISO)) {
		return json({ error: 'Tu cargo no puede editar el inventario' }, { status: 403 });
	}
	return null;
}

export function respuestaErrorBgg(e: unknown): Response {
	if (e instanceof ErrorBgg) {
		switch (e.codigo) {
			case 'rate-limit':
				return json(
					{ error: 'BGG limitó las solicitudes; reintenta en unos segundos' },
					{
						status: 429,
						headers: e.reintentarEnSegundos ? { 'Retry-After': String(e.reintentarEnSegundos) } : {}
					}
				);
			case 'timeout':
				return json({ error: 'BGG no respondió a tiempo' }, { status: 504 });
			case 'no-configurado':
				return json({ error: 'Proxy BGG no configurado' }, { status: 503 });
			default:
				return json({ error: 'BGG no disponible' }, { status: 502 });
		}
	}
	if (e instanceof ErrorFormatoBgg) {
		console.error('[bgg]', e.message);
		return json({ error: 'BGG devolvió una respuesta inesperada' }, { status: 502 });
	}
	throw e;
}

// --- Caché (JuegoBgg) ---------------------------------------------------------------------------

const filaSchema = z.object({
	idBgg: z.number(),
	nombre: z.string(),
	anio: z.number().nullable(),
	tipo: tipoSchema,
	idBggBase: z.number().nullable(),
	edadMinima: z.number().nullable(),
	jugadoresMin: z.number().nullable(),
	jugadoresMax: z.number().nullable(),
	duracion: z.number().nullable(),
	calificacion: z.number().nullable(),
	peso: z.number().nullable(),
	urlImagenBgg: z.string().nullable(),
	pathImagen: z.string().nullable(),
	actualizadoEn: z.string()
});
type Fila = z.infer<typeof filaSchema>;

const aFicha = (f: Fila): BggFicha =>
	bggFichaSchema.parse({
		idBgg: f.idBgg,
		nombreJuego: f.nombre,
		tipo: f.tipo,
		idBggBase: f.idBggBase,
		anio: f.anio,
		edadMinima: f.edadMinima,
		jugadoresMin: f.jugadoresMin,
		jugadoresMax: f.jugadoresMax,
		duracion: f.duracion,
		calificacion: f.calificacion,
		// La dificultad se re-deriva del peso crudo: cambiar `bgg.json` aplica sin volver a BGG.
		dificultad: dificultadDesdePeso(f.peso, bggConfig),
		peso: f.peso,
		urlImagenBgg: f.urlImagenBgg
	});

const aFilaDb = (f: BggFicha) => ({
	idBgg: f.idBgg,
	nombre: f.nombreJuego,
	anio: f.anio,
	tipo: f.tipo,
	idBggBase: f.idBggBase,
	edadMinima: f.edadMinima,
	jugadoresMin: f.jugadoresMin,
	jugadoresMax: f.jugadoresMax,
	duracion: f.duracion,
	calificacion: f.calificacion,
	peso: f.peso,
	urlImagenBgg: f.urlImagenBgg,
	actualizadoEn: new Date().toISOString()
});

async function leerCache(supabase: ClienteSupabase, idBgg: number): Promise<Fila | null> {
	const { data, error } = await supabase
		.from('JuegoBgg')
		.select('*')
		.eq('idBgg', idBgg)
		.maybeSingle();
	if (error) throw new Error(`No se pudo leer la caché BGG: ${error.message}`);
	return data ? filaSchema.parse(data) : null;
}

function urlPublica(supabase: ClienteSupabase, path: string): string {
	return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

function caratulaDe(supabase: ClienteSupabase, fila: Pick<Fila, 'urlImagenBgg' | 'pathImagen'>) {
	const caratula: BggCaratula = fila.pathImagen
		? {
				estado: 'lista',
				pathImagen: fila.pathImagen,
				urlPublica: urlPublica(supabase, fila.pathImagen)
			}
		: {
				estado: fila.urlImagenBgg ? 'pendiente' : 'sin-imagen',
				pathImagen: null,
				urlPublica: null
			};
	return caratula;
}

async function idJuegoDe(supabase: ClienteSupabase, idBgg: number): Promise<number | null> {
	const { data } = await supabase.from('Juego').select('idJuego').eq('idBgg', idBgg).maybeSingle();
	return (data?.idJuego as number | undefined) ?? null;
}

// --- Ficha: la caché no expira; `refrescar` fuerza BGG y, si falla, se sirve la caché ---------

export async function obtenerFicha(
	supabase: ClienteSupabase,
	idBgg: number,
	refrescar = false
): Promise<BggFichaRespuesta | null> {
	const cache = await leerCache(supabase, idBgg);

	const responder = async (fila: Fila, origen: BggFichaRespuesta['origen']) => ({
		ficha: aFicha(fila),
		origen,
		caratula: caratulaDe(supabase, fila),
		idJuego: await idJuegoDe(supabase, idBgg)
	});

	if (cache && !refrescar) return responder(cache, 'cache');

	try {
		const xml = await pedirBgg('thing', { id: String(idBgg), stats: '1' });
		let ficha: BggFicha;
		try {
			ficha = parseFicha(xml, bggConfig);
		} catch (e) {
			// BGG respondió sin el juego: no existe (404), no es una caída.
			if (e instanceof ErrorJuegoInexistente) return null;
			throw e;
		}

		// Si cambió la imagen de origen, la carátula procesada ya no corresponde.
		const pathImagen = cache && cache.urlImagenBgg === ficha.urlImagenBgg ? cache.pathImagen : null;
		const { error } = await supabase
			.from('JuegoBgg')
			.upsert({ ...aFilaDb(ficha), pathImagen }, { onConflict: 'idBgg' });
		if (error) throw new Error(`No se pudo guardar en la caché BGG: ${error.message}`);

		return {
			ficha,
			origen: 'bgg',
			caratula: caratulaDe(supabase, { urlImagenBgg: ficha.urlImagenBgg, pathImagen }),
			idJuego: await idJuegoDe(supabase, idBgg)
		};
	} catch (e) {
		if (cache && (e instanceof ErrorBgg || e instanceof ErrorFormatoBgg)) {
			console.warn(`[bgg] ${e.message}: se sirve la caché desactualizada de ${idBgg}`);
			return responder(cache, 'cache-desactualizada');
		}
		throw e;
	}
}

// --- Búsqueda ----------------------------------------------------------------------------------

async function buscarLocal(supabase: ClienteSupabase, consulta: string): Promise<BggSugerencia[]> {
	const { data, error } = await supabase.rpc('buscar_juegos_bgg', {
		p_consulta: consulta,
		p_limite: bggConfig.busqueda.maximoResultados
	});
	if (error) throw new Error(`No se pudo buscar en la base local: ${error.message}`);
	return (data as BggSugerencia[]).map((f) => ({ ...f, anio: f.anio ?? null }));
}

async function buscarEnBgg(
	supabase: ClienteSupabase,
	consulta: string,
	exacta: boolean
): Promise<BggSugerencia[]> {
	const xml = await pedirBgg('search', {
		query: consulta,
		type: 'boardgame,boardgameexpansion',
		...(exacta ? { exact: '1' } : {})
	});
	const encontrados = parseBusqueda(xml, bggConfig);
	if (encontrados.length === 0) return [];

	const ids = encontrados.map((r) => r.idBgg);
	const [enCache, enCatalogo] = await Promise.all([
		supabase.from('JuegoBgg').select('idBgg').in('idBgg', ids),
		supabase.from('Juego').select('idBgg, idJuego').in('idBgg', ids)
	]);
	const idsCache = new Set((enCache.data ?? []).map((f) => f.idBgg as number));
	const juegos = new Map(
		(enCatalogo.data ?? []).map((f) => [f.idBgg as number, f.idJuego as number])
	);

	return encontrados.map((r) => ({
		...r,
		idJuego: juegos.get(r.idBgg) ?? null,
		enCache: idsCache.has(r.idBgg)
	}));
}

/**
 * `fuente=local`: DB local y, si no hay resultados, BGG (si BGG falla: `local-sin-bgg`).
 * `fuente=bgg`: salta la DB local y los errores de BGG se propagan.
 */
export async function buscar(
	supabase: ClienteSupabase,
	consulta: string,
	fuente: BggFuente,
	exacta: boolean
): Promise<BggBusquedaRespuesta> {
	if (fuente === 'bgg') {
		return { resultados: await buscarEnBgg(supabase, consulta, exacta), origen: 'bgg' };
	}

	const local = await buscarLocal(supabase, consulta);
	if (local.length > 0) return { resultados: local, origen: 'local' };

	try {
		return { resultados: await buscarEnBgg(supabase, consulta, exacta), origen: 'bgg' };
	} catch (e) {
		if (e instanceof ErrorBgg || e instanceof ErrorFormatoBgg) {
			console.warn(`[bgg] búsqueda "${consulta}" sin BGG: ${e.message}`);
			return { resultados: [], origen: 'local-sin-bgg' };
		}
		throw e;
	}
}

// --- Carátula ----------------------------------------------------------------------------------

async function descargarOriginal(idBgg: number, url: string): Promise<Buffer> {
	if (bggMockActivo()) return leerImagenMock(idBgg);

	const destino = new URL(url);
	if (
		destino.protocol !== 'https:' ||
		!bggConfig.caratula.hostsPermitidos.includes(destino.hostname)
	) {
		throw new ErrorBgg(
			'imagen-no-permitida',
			`Dominio de imagen no permitido: ${destino.hostname}`
		);
	}

	const res = await fetch(destino, {
		signal: AbortSignal.timeout(TIMEOUT_IMAGEN_MS),
		redirect: 'error'
	});
	if (!res.ok) throw new ErrorBgg('no-disponible', `La imagen respondió ${res.status}`);
	if (Number(res.headers.get('content-length')) > MAX_BYTES_ORIGINAL) {
		throw new ErrorBgg('imagen-no-permitida', 'La imagen original es demasiado grande');
	}

	const original = Buffer.from(await res.arrayBuffer());
	if (original.length > MAX_BYTES_ORIGINAL) {
		throw new ErrorBgg('imagen-no-permitida', 'La imagen original es demasiado grande');
	}
	return original;
}

export type ResultadoCaratula = { caratula: BggCaratula; bytes: number | null };

/** Descarga, procesa y sube la carátula. `null` = el juego no está en la caché. */
export async function procesarYSubirCaratula(
	supabase: ClienteSupabase,
	idBgg: number
): Promise<ResultadoCaratula | null> {
	const fila = await leerCache(supabase, idBgg);
	if (!fila) return null;
	if (fila.pathImagen) return { caratula: caratulaDe(supabase, fila), bytes: null };
	if (!fila.urlImagenBgg) return { caratula: caratulaDe(supabase, fila), bytes: null };

	const original = await descargarOriginal(idBgg, fila.urlImagenBgg);
	const { buffer, bytes } = await procesarCaratula(original, bggConfig.caratula);

	const path = `bgg/${idBgg}.jpg`;
	const subida = await supabase.storage
		.from(BUCKET)
		.upload(path, buffer, { contentType: 'image/jpeg', upsert: true });
	if (subida.error) throw new Error(`No se pudo subir la carátula: ${subida.error.message}`);

	const { error } = await supabase.from('JuegoBgg').update({ pathImagen: path }).eq('idBgg', idBgg);
	if (error) throw new Error(`No se pudo registrar la carátula: ${error.message}`);

	return { caratula: caratulaDe(supabase, { ...fila, pathImagen: path }), bytes };
}
