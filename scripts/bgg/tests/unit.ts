// Pruebas sin DB ni red de la integración BGG. Uso: pnpm bgg:test
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { procesarCaratula } from '../../../src/lib/bgg/caratula.ts';
import {
	ErrorJuegoInexistente,
	dificultadDesdePeso,
	parseBusqueda,
	parseFicha,
	parseTtl,
	TTL_POR_DEFECTO_MS
} from '../../../src/lib/bgg/normalizar.ts';
import { bggConfigSchema, type BggConfig } from '../../../src/lib/schemas/bgg.ts';
import { generarImagenGrande } from '../imagenes-sinteticas.ts';

const leer = (ruta: string) => readFile(new URL(`../../../${ruta}`, import.meta.url), 'utf-8');
const config = bggConfigSchema.parse(JSON.parse(await leer('src/lib/data/bgg.json')));

// --- Ficha de juego base: normalización y estadísticas ---
const gloomhaven = parseFicha(await leer('fixtures/bgg/thing/174430.xml'), config);
assert.equal(gloomhaven.nombreJuego, 'Gloomhaven');
assert.equal(gloomhaven.tipo, 'Juego base');
assert.equal(gloomhaven.idBggBase, null);
assert.equal(gloomhaven.edadMinima, 14);
assert.equal(gloomhaven.calificacion, 8.6);
assert.equal(gloomhaven.dificultad, 'Difícil');

const catan = parseFicha(await leer('fixtures/bgg/thing/13.xml'), config);
assert.equal(catan.dificultad, 'Intermedio');
assert.equal(catan.idBggBase, null);

// --- Expansión: vuelve a su juego base y los "0" de BGG pasan a null ---
const seafarers = parseFicha(await leer('fixtures/bgg/thing/325.xml'), config);
assert.equal(seafarers.tipo, 'Expansión');
assert.equal(seafarers.idBggBase, 13);
assert.equal(seafarers.duracion, null);
assert.equal(seafarers.edadMinima, null);
assert.equal(seafarers.dificultad, null, 'peso 0 = sin dato');
assert.equal(seafarers.calificacion, null, 'pocos votos = sin calificación');

// --- Sin imagen y juego inexistente ---
assert.equal(parseFicha(await leer('fixtures/bgg/thing/30549.xml'), config).urlImagenBgg, null);
assert.throws(
	() => parseFicha('<items total="0"></items>', config),
	(e) => e instanceof ErrorJuegoInexistente
);
assert.throws(() => parseFicha('<html>caído</html>', config), /sin <items>/);
assert.throws(
	() =>
		parseFicha(
			'<items><item type="boardgameaccessory" id="1"><name type="primary" value="x"/></item></items>',
			config
		),
	/no soportado/
);

// --- Búsqueda ---
const resultados = parseBusqueda(await leer('fixtures/bgg/search/catan.xml'), config);
assert.deepEqual(
	resultados.map((r) => [r.idBgg, r.tipo]),
	[
		[13, 'Juego base'],
		[325, 'Expansión']
	]
);
assert.equal(parseBusqueda('<items total="0"></items>', config).length, 0);
const recortada: BggConfig = { ...config, busqueda: { ...config.busqueda, maximoResultados: 1 } };
assert.equal(parseBusqueda(await leer('fixtures/bgg/search/catan.xml'), recortada).length, 1);

// --- Umbrales de dificultad (editables en bgg.json) ---
assert.equal(dificultadDesdePeso(1.9, config), 'Fácil');
assert.equal(dificultadDesdePeso(2, config), 'Intermedio');
assert.equal(dificultadDesdePeso(3.5, config), 'Difícil');
assert.equal(dificultadDesdePeso(null, config), null);

// --- Config inválida ---
const base = JSON.parse(await leer('src/lib/data/bgg.json'));
assert.throws(() =>
	bggConfigSchema.parse({ ...base, dificultad: { facilHasta: 4, intermedioHasta: 3 } })
);
assert.throws(() => bggConfigSchema.parse({ ...base, tipos: { boardgame: 'Otro' } }));
assert.throws(() => bggConfigSchema.parse({ ...base, caratula: { ...base.caratula, calidad: 0 } }));
assert.throws(() => bggConfigSchema.parse({ ...base, busqueda: undefined }));

// --- TTL ---
assert.equal(parseTtl('30d'), 30 * 86_400_000);
assert.equal(parseTtl('12h'), 12 * 3_600_000);
assert.equal(parseTtl('90m'), 90 * 60_000);
for (const invalido of ['', undefined, '30', 'd', '0d', '-1d', '1.5d', '30 días']) {
	assert.equal(parseTtl(invalido), null, `TTL inválido: ${invalido}`);
}
assert.equal(TTL_POR_DEFECTO_MS, 30 * 86_400_000);

// --- Procesamiento de carátulas ---
const grande = await generarImagenGrande(4000, 'jpeg', 95);
assert.ok(grande.length > 1024 * 1024, 'la imagen de prueba debe superar 1 MiB');
const procesada = await procesarCaratula(grande, config.caratula);
assert.ok(procesada.bytes <= config.caratula.pesoMaximoBytes);
assert.equal(procesada.buffer.subarray(0, 2).toString('hex'), 'ffd8', 'salida JPEG');
await assert.rejects(
	procesarCaratula(grande, { ...config.caratula, pesoMaximoBytes: 1000 }),
	/excede/
);

console.log('BGG: ficha, búsqueda, config, TTL y carátulas válidos');
