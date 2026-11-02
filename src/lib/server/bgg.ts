import { env } from '$env/dynamic/private';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { TTL_POR_DEFECTO_MS, parseTtl } from '$lib/bgg/normalizar';

const BASE_BGG = 'https://boardgamegeek.com/xmlapi2';
const TIMEOUT_MS = 3000;
const DIR_FIXTURES = join(process.cwd(), 'fixtures', 'bgg');

export type CodigoErrorBgg =
	| 'timeout'
	| 'rate-limit'
	| 'no-disponible'
	| 'no-configurado'
	| 'imagen-no-permitida';

/** Falla del proxy BGG; el handler la traduce a un código HTTP. */
export class ErrorBgg extends Error {
	constructor(
		readonly codigo: CodigoErrorBgg,
		message: string,
		readonly reintentarEnSegundos?: number
	) {
		super(message);
		this.name = 'ErrorBgg';
	}
}

export const bggMockActivo = () => env.BGG_MOCK === '1';

let ttlAvisado = false;
/** Validez de la caché (`BGG_CACHE_TTL`, `<n>(m|h|d)`); si es inválida usa 30d y avisa una vez. */
export function ttlCacheMs(): number {
	const ms = parseTtl(env.BGG_CACHE_TTL);
	if (ms !== null) return ms;
	if (env.BGG_CACHE_TTL && !ttlAvisado) {
		ttlAvisado = true;
		console.warn(`[bgg] BGG_CACHE_TTL inválido ("${env.BGG_CACHE_TTL}"): se usa 30d`);
	}
	return TTL_POR_DEFECTO_MS;
}

const XML_VACIO = '<?xml version="1.0" encoding="utf-8"?><items total="0"></items>';

function simularFalla() {
	switch (env.BGG_MOCK_FALLA) {
		case 'timeout':
			throw new ErrorBgg('timeout', 'BGG no respondió a tiempo (simulado)');
		case '429':
			throw new ErrorBgg('rate-limit', 'BGG limitó las solicitudes (simulado)', 5);
		case '503':
			throw new ErrorBgg('rate-limit', 'BGG respondió 503 (simulado)', 5);
	}
}

async function leerFixture(ruta: string): Promise<string> {
	try {
		return await readFile(join(DIR_FIXTURES, ruta), 'utf-8');
	} catch (e) {
		if ((e as NodeJS.ErrnoException).code === 'ENOENT') return XML_VACIO;
		throw e;
	}
}

const normalizar = (texto: string) =>
	texto
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();

/**
 * Búsqueda en modo mock: reúne los `<item>` de todos los `fixtures/bgg/search/*.xml` y deja los
 * cuyo nombre contiene la consulta (BGG coincide por subcadena; con `exact=1`, por igualdad).
 */
async function buscarEnFixtures(consulta: string, exacta: boolean): Promise<string> {
	const buscada = normalizar(consulta.trim());
	const items = new Map<string, string>();

	for (const archivo of await readdir(join(DIR_FIXTURES, 'search')).catch(() => [])) {
		if (!archivo.endsWith('.xml')) continue;
		const xml = await leerFixture(join('search', archivo));
		for (const item of xml.match(/<item\b[\s\S]*?<\/item>/g) ?? []) {
			const id = /\bid="(\d+)"/.exec(item)?.[1];
			const nombre = /<name\b[^>]*\bvalue="([^"]*)"/.exec(item)?.[1];
			if (!id || !nombre) continue;
			const candidato = normalizar(nombre);
			if (exacta ? candidato === buscada : candidato.includes(buscada)) items.set(id, item);
		}
	}

	return `<?xml version="1.0" encoding="utf-8"?><items total="${items.size}">${[...items.values()].join('')}</items>`;
}

/**
 * Único punto de entrada a BGG. Con `BGG_MOCK=1` traduce endpoint + parámetros a archivos de
 * `fixtures/bgg/` sin tocar la red; `BGG_MOCK_FALLA` simula timeout, 429 o 503.
 */
export async function pedirBgg(
	endpoint: 'thing' | 'search',
	params: Record<string, string>
): Promise<string> {
	if (bggMockActivo()) {
		simularFalla();
		return endpoint === 'thing'
			? leerFixture(join('thing', `${params.id}.xml`))
			: buscarEnFixtures(params.query ?? '', params.exact === '1');
	}

	if (!env.BGG_API_TOKEN) {
		throw new ErrorBgg('no-configurado', 'Proxy BGG no configurado (falta BGG_API_TOKEN)');
	}

	let res: Response;
	try {
		res = await fetch(`${BASE_BGG}/${endpoint}?${new URLSearchParams(params)}`, {
			headers: { Authorization: `Bearer ${env.BGG_API_TOKEN}` },
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
	} catch (e) {
		if (e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError')) {
			throw new ErrorBgg('timeout', 'BGG no respondió a tiempo');
		}
		throw new ErrorBgg('no-disponible', 'No se pudo contactar a BGG');
	}

	if (res.status === 429 || res.status === 503) {
		const reintento = Number(res.headers.get('Retry-After'));
		throw new ErrorBgg(
			'rate-limit',
			`BGG respondió ${res.status}`,
			Number.isFinite(reintento) && reintento > 0 ? reintento : undefined
		);
	}
	if (!res.ok) throw new ErrorBgg('no-disponible', `BGG respondió ${res.status}`);
	return res.text();
}
