// Captura respuestas reales de BGG y valida que nuestro parser las acepte (requiere BGG_API_TOKEN).
// Uso: pnpm bgg:capturar 13 174430 --q catan [--salida <carpeta>]
//   <idBgg>     → thing?id=…&stats=1 → <salida>/thing/<id>.xml
//   --q <texto> → search?query=…     → <salida>/search/<texto>.xml
// La salida por defecto es fixtures/bgg/; el diff de git muestra los cambios de formato de la API.
// Pocas peticiones, en serie, con pausa y reintento si BGG responde 429/503. Las imágenes no se capturan.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseBusqueda, parseFicha } from '../../src/lib/bgg/normalizar.ts';
import { bggConfigSchema } from '../../src/lib/schemas/bgg.ts';

const PAUSA_MS = 1500;
const MAX_REINTENTOS = 3;

const token = process.env.BGG_API_TOKEN;
const args = process.argv.slice(2);

const ids: string[] = [];
const consultas: string[] = [];
let salida = fileURLToPath(new URL('../../fixtures/bgg/', import.meta.url));

for (let i = 0; i < args.length; i++) {
	if (args[i] === '--q') consultas.push(args[++i] ?? '');
	else if (args[i] === '--salida') salida = args[++i] ?? salida;
	else ids.push(args[i]);
}

if (!token) {
	console.error('Falta BGG_API_TOKEN (en .env o en el entorno)');
	process.exit(1);
}
if (
	(ids.length === 0 && consultas.length === 0) ||
	ids.some((id) => !/^[1-9]\d*$/.test(id)) ||
	consultas.some((q) => q.trim().length < 2)
) {
	console.error('Uso: pnpm bgg:capturar <idBgg…> [--q <texto>…] [--salida <carpeta>]');
	process.exit(1);
}
if (!salida.endsWith('/')) salida += '/';

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
const slug = (q: string) =>
	q
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

async function pedir(endpoint: string, params: Record<string, string>): Promise<string | null> {
	const url = `https://boardgamegeek.com/xmlapi2/${endpoint}?${new URLSearchParams(params)}`;

	for (let intento = 1; intento <= MAX_REINTENTOS; intento++) {
		const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
		if (res.ok) return res.text();

		if (res.status !== 429 && res.status !== 503) {
			console.error(`  BGG respondió ${res.status}`);
			return null;
		}
		const segundos = Number(res.headers.get('Retry-After')) || 5 * intento;
		console.warn(
			`  BGG respondió ${res.status}; reintento ${intento}/${MAX_REINTENTOS} en ${segundos} s`
		);
		await espera(segundos * 1000);
	}
	return null;
}

const config = bggConfigSchema.parse(
	JSON.parse(await readFile(new URL('../../src/lib/data/bgg.json', import.meta.url), 'utf-8'))
);

type Tarea = {
	etiqueta: string;
	ruta: string;
	pedir: () => Promise<string | null>;
	validar: (xml: string) => string;
};

const tareas: Tarea[] = [
	...ids.map((id) => ({
		etiqueta: `thing ${id}`,
		ruta: `thing/${id}.xml`,
		pedir: () => pedir('thing', { id, stats: '1' }),
		validar: (xml: string) => {
			const f = parseFicha(xml, config);
			return `${f.nombreJuego} · ${f.tipo} · base=${f.idBggBase ?? '-'} · cal=${f.calificacion ?? '-'} · dif=${f.dificultad ?? '-'} · peso=${f.peso ?? '-'}`;
		}
	})),
	...consultas.map((q) => ({
		etiqueta: `search "${q}"`,
		ruta: `search/${slug(q)}.xml`,
		pedir: () => pedir('search', { query: q, type: 'boardgame,boardgameexpansion' }),
		validar: (xml: string) =>
			`${parseBusqueda(xml, config).length} resultados (máx. ${config.busqueda.maximoResultados})`
	}))
];

for (const [i, tarea] of tareas.entries()) {
	if (i > 0) await espera(PAUSA_MS);
	console.log(`${tarea.etiqueta}`);

	const xml = await tarea.pedir();
	if (!xml) {
		process.exitCode = 1;
		continue;
	}

	const destino = new URL(tarea.ruta, `file://${salida}`);
	await mkdir(new URL('.', destino), { recursive: true });
	await writeFile(destino, xml);

	try {
		console.log(`  ✓ ${tarea.ruta}: ${tarea.validar(xml)}`);
	} catch (e) {
		console.error(
			`  ✗ ${tarea.ruta}: el parser no aceptó la respuesta real: ${(e as Error).message}`
		);
		process.exitCode = 1;
	}
}
