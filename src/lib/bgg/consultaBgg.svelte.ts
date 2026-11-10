import { bggConfig } from '$lib/data/bgg';
import {
	bggBusquedaRespuestaSchema,
	bggCaratulaSchema,
	bggFichaRespuestaSchema,
	type BggBusquedaRespuesta,
	type BggFichaRespuesta,
	type BggSugerencia
} from '$lib/schemas/bgg';

export type FaseBgg =
	| 'inactivo'
	| 'buscando-local'
	| 'consultando-bgg'
	| 'procesando-caratula'
	| 'listo'
	| 'error';

class ErrorConsulta extends Error {}

const esAborto = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';

async function pedirJson(url: string, init: RequestInit, senal: AbortSignal): Promise<unknown> {
	const res = await fetch(url, { ...init, signal: senal });
	// Sin sesión, el guard de /admin redirige al login (HTML), no responde 401.
	if (res.redirected && new URL(res.url).pathname === '/login') {
		throw new ErrorConsulta('Tu sesión expiró: vuelve a iniciar sesión');
	}
	const cuerpo = await res.json().catch(() => null);
	if (res.ok) return cuerpo;

	const reintento = Number(res.headers.get('Retry-After'));
	const detalle = res.status === 429 && reintento > 0 ? ` (reintenta en ${reintento} s)` : '';
	throw new ErrorConsulta(`${cuerpo?.error ?? 'No se pudo consultar BGG'}${detalle}`);
}

/**
 * Orquesta búsqueda → ficha → carátula contra `/admin/bgg/*` mostrando en qué fase está. Cada
 * consulta nueva cancela la anterior; la búsqueda espera `debounceMs` y un largo mínimo (config)
 * para no gatillar el rate limit de BGG.
 */
export class ConsultaBgg {
	consulta = $state('');
	soloBgg = $state(false);
	fase = $state<FaseBgg>('inactivo');
	resultados = $state<BggSugerencia[]>([]);
	/** Resultados únicos que halló la búsqueda; si supera `resultados.length`, el servidor la cortó. */
	total = $state(0);
	/** Cuántos resultados se muestran: la búsqueda se pagina localmente, sin nuevas llamadas. */
	mostrados = $state(bggConfig.busqueda.porPagina);
	origenBusqueda = $state<BggBusquedaRespuesta['origen'] | null>(null);
	respuesta = $state<BggFichaRespuesta | null>(null);
	error = $state<string | null>(null);
	/** La carátula no se pudo procesar: la ficha sigue usable y se puede reintentar. */
	caratulaFallida = $state(false);

	readonly largoMinimo = bggConfig.busqueda.largoMinimo;

	#controlador: AbortController | null = null;
	#temporizador: ReturnType<typeof setTimeout> | undefined;
	#reintentar: (() => Promise<void>) | null = null;

	get visibles() {
		return this.resultados.slice(0, this.mostrados);
	}

	get hayMas() {
		return this.mostrados < this.resultados.length;
	}

	mostrarMas() {
		this.mostrados += bggConfig.busqueda.porPagina;
	}

	get ocupado() {
		return (
			this.fase === 'buscando-local' ||
			this.fase === 'consultando-bgg' ||
			this.fase === 'procesando-caratula'
		);
	}

	/** Llamar en cada cambio del input o del checkbox: aplica debounce y largo mínimo. */
	programarBusqueda() {
		clearTimeout(this.#temporizador);
		const q = this.consulta.trim();

		if (q.length < this.largoMinimo) {
			this.#cancelar();
			this.resultados = [];
			this.total = 0;
			this.origenBusqueda = null;
			this.error = null;
			this.fase = 'inactivo';
			return;
		}

		this.#temporizador = setTimeout(() => void this.buscar(), bggConfig.busqueda.debounceMs);
	}

	async buscar() {
		const q = this.consulta.trim();
		if (q.length < this.largoMinimo) return;

		const senal = this.#nuevaConsulta();
		this.respuesta = null;
		this.error = null;
		this.fase = this.soloBgg ? 'consultando-bgg' : 'buscando-local';
		this.#reintentar = () => this.buscar();

		try {
			const fuente = this.soloBgg ? 'bgg' : 'local';
			const datos = bggBusquedaRespuestaSchema.parse(
				await pedirJson(`/admin/bgg/search?q=${encodeURIComponent(q)}&fuente=${fuente}`, {}, senal)
			);
			this.resultados = datos.resultados;
			this.total = datos.total;
			this.mostrados = bggConfig.busqueda.porPagina;
			this.origenBusqueda = datos.origen;
			this.fase = 'listo';
		} catch (e) {
			this.#fallar(e, senal);
		}
	}

	/** Trae la ficha (con caché) y luego procesa la carátula en una llamada aparte. */
	async seleccionar(
		sugerencia: BggSugerencia,
		refrescar = false
	): Promise<BggFichaRespuesta | null> {
		const senal = this.#nuevaConsulta();
		this.error = null;
		this.caratulaFallida = false;
		this.fase = 'consultando-bgg';
		this.#reintentar = async () => void (await this.seleccionar(sugerencia, refrescar));

		try {
			let datos = bggFichaRespuestaSchema.parse(
				await pedirJson(
					`/admin/bgg/${sugerencia.idBgg}${refrescar ? '?refrescar=1' : ''}`,
					{},
					senal
				)
			);
			this.respuesta = datos;

			if (datos.caratula.estado === 'pendiente') {
				this.fase = 'procesando-caratula';
				try {
					const resultado = (await pedirJson(
						`/admin/bgg/${sugerencia.idBgg}/caratula`,
						{ method: 'POST' },
						senal
					)) as { caratula?: unknown };
					datos = { ...datos, caratula: bggCaratulaSchema.parse(resultado.caratula) };
					this.respuesta = datos;
				} catch (e) {
					if (esAborto(e)) throw e;
					this.caratulaFallida = true;
				}
			}

			this.fase = 'listo';
			return datos;
		} catch (e) {
			this.#fallar(e, senal);
			return null;
		}
	}

	/** Fuerza una nueva consulta a BGG para la ficha mostrada (la caché no expira sola). */
	refrescar(sugerencia: BggSugerencia) {
		return this.seleccionar(sugerencia, true);
	}

	reintentar() {
		return this.#reintentar?.();
	}

	cancelar() {
		clearTimeout(this.#temporizador);
		this.#cancelar();
	}

	#cancelar() {
		this.#controlador?.abort();
		this.#controlador = null;
	}

	#nuevaConsulta(): AbortSignal {
		this.#cancelar();
		this.#controlador = new AbortController();
		return this.#controlador.signal;
	}

	#fallar(e: unknown, senal: AbortSignal) {
		if (senal.aborted || esAborto(e)) return; // la reemplazó otra consulta
		this.error = e instanceof ErrorConsulta ? e.message : 'Respuesta inesperada del servidor';
		this.fase = 'error';
	}
}
