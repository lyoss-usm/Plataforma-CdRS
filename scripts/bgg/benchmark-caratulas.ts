// Benchmark del procesamiento de carátulas con sharp (ver docs/bgg-caratulas.md).
// Uso: pnpm bgg:benchmark
import { readdir, readFile } from 'node:fs/promises';
import { procesarCaratula } from '../../src/lib/bgg/caratula.ts';
import { bggConfigSchema } from '../../src/lib/schemas/bgg.ts';
import { DIR_LUDOTECA, generarImagenGrande } from './imagenes-sinteticas.ts';

const config = bggConfigSchema.parse(
	JSON.parse(await readFile(new URL('../../src/lib/data/bgg.json', import.meta.url), 'utf-8'))
).caratula;
const LIMITE_BYTES = config.pesoMaximoBytes;
const LIMITE_MS = 1000;

type Muestra = { nombre: string; buffer: Buffer };

const procesar = async (buffer: Buffer) => (await procesarCaratula(buffer, config)).buffer;

const percentil = (valores: number[], p: number) => {
	const orden = [...valores].sort((a, b) => a - b);
	return orden[Math.min(orden.length - 1, Math.ceil(p * orden.length) - 1)];
};
const kb = (bytes: number) => Math.round(bytes / 1024);

async function medir(titulo: string, muestras: Muestra[]) {
	const pesos: number[] = [];
	const tiempos: number[] = [];
	const rss0 = process.memoryUsage().rss;
	let rssMax = rss0;

	for (const { buffer } of muestras) {
		const inicio = performance.now();
		const salida = await procesar(buffer);
		tiempos.push(performance.now() - inicio);
		pesos.push(salida.length);
		rssMax = Math.max(rssMax, process.memoryUsage().rss);
	}

	const bajoPeso = pesos.filter((p) => p <= LIMITE_BYTES).length;
	const bajoTiempo = tiempos.filter((t) => t < LIMITE_MS).length;
	console.log(`\n== ${titulo} (${muestras.length}) ==`);
	console.log(
		`entrada KB p50/máx: ${kb(
			percentil(
				muestras.map((m) => m.buffer.length),
				0.5
			)
		)}/${kb(Math.max(...muestras.map((m) => m.buffer.length)))}`
	);
	console.log(
		`salida  KB p50/p95/máx: ${kb(percentil(pesos, 0.5))}/${kb(percentil(pesos, 0.95))}/${kb(Math.max(...pesos))}`
	);
	console.log(
		`tiempo  ms p50/p95/máx: ${percentil(tiempos, 0.5).toFixed(0)}/${percentil(tiempos, 0.95).toFixed(0)}/${Math.max(...tiempos).toFixed(0)}`
	);
	console.log(
		`≤ 1 MiB: ${bajoPeso}/${pesos.length} · < 1 s: ${bajoTiempo}/${tiempos.length} · RAM extra: ${Math.round((rssMax - rss0) / 1024 / 1024)} MB`
	);
}

const reales: Muestra[] = [];
for (const nombre of (await readdir(DIR_LUDOTECA)).sort()) {
	reales.push({ nombre, buffer: await readFile(DIR_LUDOTECA + nombre) });
}

const borde: Muestra[] = [
	{ nombre: '2k-jpeg', buffer: await generarImagenGrande(2000, 'jpeg', 90) },
	{ nombre: '4k-jpeg', buffer: await generarImagenGrande(4000, 'jpeg', 95) },
	{ nombre: '3k-png', buffer: await generarImagenGrande(3000, 'png') }
];

await procesar(reales[0].buffer); // calentamiento
await medir('Reales (static/ludoteca)', reales);
await medir('Casos borde sintéticos', borde);
