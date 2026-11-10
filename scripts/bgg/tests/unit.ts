// Pruebas sin DB ni red de la integración BGG. Uso: pnpm bgg:test
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { procesarCaratula } from '../../../src/lib/bgg/caratula.ts';
import {
	ErrorJuegoInexistente,
	dificultadDesdePeso,
	parseBusqueda,
	parseFicha,
	relevancia
} from '../../../src/lib/bgg/normalizar.ts';
import { bggConfigSchema, type BggConfig } from '../../../src/lib/schemas/bgg.ts';
import { generarImagenGrande } from '../imagenes-sinteticas.ts';

const leer = (ruta: string) => readFile(new URL(`../../../${ruta}`, import.meta.url), 'utf-8');
const config = bggConfigSchema.parse(JSON.parse(await leer('src/lib/data/bgg.json')));

// --- Fichas reales (fixtures capturados de BGG) ---
const gloomhaven = parseFicha(await leer('fixtures/bgg/thing/174430.xml'), config);
assert.equal(gloomhaven.nombreJuego, 'Gloomhaven');
assert.equal(gloomhaven.tipo, 'Juego base');
assert.equal(gloomhaven.idBggBase, null);
assert.equal(gloomhaven.edadMinima, 14);
assert.equal(gloomhaven.dificultad, 'Difícil');
assert.match(gloomhaven.urlImagenBgg ?? '', /^https:\/\/cf\.geekdo-images\.com\//);
assert.ok(gloomhaven.calificacion !== null && gloomhaven.calificacion > 8);

const catan = parseFicha(await leer('fixtures/bgg/thing/13.xml'), config);
assert.equal(catan.dificultad, 'Intermedio');
assert.equal(catan.idBggBase, null);
assert.deepEqual([catan.jugadoresMin, catan.jugadoresMax], [3, 4]);

// --- Expansión real: vuelve a su juego base por el link inbound ---
const seafarers = parseFicha(await leer('fixtures/bgg/thing/325.xml'), config);
assert.equal(seafarers.tipo, 'Expansión');
assert.equal(seafarers.idBggBase, 13);

// --- Casos borde (fixture sintético): los "0" de BGG pasan a null y pocos votos no califican ---
const sintetica = parseFicha(await leer('fixtures/bgg/thing/999001.xml'), config);
assert.equal(sintetica.tipo, 'Expansión');
assert.equal(sintetica.idBggBase, 13);
assert.equal(sintetica.anio, null);
assert.equal(sintetica.duracion, null);
assert.equal(sintetica.edadMinima, null);
assert.equal(sintetica.dificultad, null, 'peso 0 = sin dato');
assert.equal(sintetica.calificacion, null, 'pocos votos = sin calificación');
assert.equal(sintetica.urlImagenBgg, null);

// --- Juego inexistente y XML roto ---
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

// --- Búsqueda real "catan": 283 ítems con expansiones repetidas y sin orden por relevancia ---
const xmlCatan = await leer('fixtures/bgg/search/catan.xml');
const crudos = xmlCatan.match(/<item\b/g)?.length ?? 0;
assert.ok(
	crudos > config.busqueda.porPagina,
	'el fixture debe tener más resultados que una página'
);

const catanBusqueda = parseBusqueda(xmlCatan, config, 'catan');
const ids = catanBusqueda.resultados.map((r) => r.idBgg);
assert.equal(new Set(ids).size, ids.length, 'sin ids repetidos');
assert.ok(catanBusqueda.total < crudos, 'deduplicar reduce el total');
assert.ok(catanBusqueda.resultados.length <= config.busqueda.maximoResultados);
assert.equal(catanBusqueda.resultados[0].idBgg, 13, 'el nombre exacto va primero');
const seafarersBusqueda = catanBusqueda.resultados.find((r) => r.idBgg === 325);
assert.equal(seafarersBusqueda?.tipo, 'Expansión', 'se prefiere el tipo expansión');
assert.ok(
	catanBusqueda.resultados.findIndex((r) => r.idBgg === 325) < config.busqueda.porPagina * 3,
	'la expansión de Catan aparece entre los primeros resultados'
);

const recortada: BggConfig = { ...config, busqueda: { ...config.busqueda, maximoResultados: 5 } };
const corta = parseBusqueda(xmlCatan, recortada, 'catan');
assert.equal(corta.resultados.length, 5);
assert.equal(corta.total, catanBusqueda.total, 'el total cuenta antes del tope');
assert.deepEqual(parseBusqueda('<items total="0"></items>', config, 'x'), {
	resultados: [],
	total: 0
});

// --- Relevancia ---
assert.equal(relevancia('Catan', 'catan'), 0);
assert.equal(relevancia('Catan: Seafarers', 'CATAN'), 1);
assert.equal(relevancia('Settlers of Catan', 'catan'), 2);
assert.equal(relevancia('Baden-Württemberg Catan', 'catán'), 2);
assert.equal(relevancia('Cathedral', 'cat'), 1);
assert.equal(relevancia('Concatenation', 'cat'), 3);

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

console.log('BGG: ficha, búsqueda, config y carátulas válidos');
