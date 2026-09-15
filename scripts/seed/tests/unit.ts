import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
	DEFAULT_DATABASE_URL,
	DEFAULT_SUPABASE_URL,
	SEED_PROFILES,
	assertLocalDatabaseUrl,
	normalizeSupabaseUrl,
	parseSeedOptions
} from '../config.ts';
import {
	LUDOTECA_BUCKET,
	SAMPLE_GAME_IMAGES,
	datasetCounts,
	generateSeedDataset
} from '../factories.ts';

const defaults = parseSeedOptions([], {});
assert.equal(defaults.profile, 'small');
assert.deepEqual(defaults.counts, SEED_PROFILES.small);
assert.equal(defaults.supabaseUrl, DEFAULT_SUPABASE_URL);

const overridden = parseSeedOptions(
	['--profile', 'medium', '--sansanos', '12', '--seed', '42'],
	{}
);
assert.equal(overridden.counts.sansanos, 12);
assert.equal(overridden.counts.juegosBase, SEED_PROFILES.medium.juegosBase);
assert.equal(overridden.seed, 42);

const fromEnvironment = parseSeedOptions([], {
	SUPABASE_URL: 'https://entorno.supabase.co/'
});
assert.equal(fromEnvironment.supabaseUrl, 'https://entorno.supabase.co');

const fromArgument = parseSeedOptions(['--supabase-url', 'https://argumento.supabase.co/'], {
	SUPABASE_URL: 'https://entorno.supabase.co'
});
assert.equal(fromArgument.supabaseUrl, 'https://argumento.supabase.co');

assert.throws(() => normalizeSupabaseUrl('esto-no-es-una-url'), /URL válida/);
assert.throws(() => normalizeSupabaseUrl('ftp://example.com'), /HTTP o HTTPS/);
assert.throws(() => normalizeSupabaseUrl('https://example.com/una/ruta'), /solamente el origen/);

assert.throws(() => parseSeedOptions(['--profile', 'unknown'], {}), /Perfil desconocido/);
assert.throws(() => parseSeedOptions(['--sansanos=-1'], {}), /entero no negativo/);
assert.throws(
	() => parseSeedOptions(['--juegosBase', '0', '--expansiones', '1'], {}),
	/al menos un juego base/
);
assert.throws(
	() => parseSeedOptions(['--solicitudes', '1', '--prestamos', '2'], {}),
	/prestamos no puede superar solicitudes/
);

assert.doesNotThrow(() => assertLocalDatabaseUrl(DEFAULT_DATABASE_URL));
assert.throws(
	() => assertLocalDatabaseUrl('postgresql://postgres:postgres@example.com:54322/postgres'),
	/solo puede conectarse a Supabase local/
);
assert.throws(
	() => assertLocalDatabaseUrl('postgresql://postgres:postgres@127.0.0.1:5432/postgres'),
	/solo puede conectarse a Supabase local/
);

const first = generateSeedDataset(SEED_PROFILES.small, 1234);
const second = generateSeedDataset(SEED_PROFILES.small, 1234);
assert.deepEqual(first, second);
assert.deepEqual(datasetCounts(first), {
	Cargo: 3,
	Permiso: 6,
	CargoPermiso: 10,
	Sansano: 20,
	Suspension: 3,
	Juego: 12,
	Ejemplar: 17,
	Solicitud: 16,
	Prestamo: 10
});

const gameById = new Map(first.juegos.map((game) => [game.idJuego, game]));
const copyById = new Map(first.ejemplares.map((copy) => [copy.idEjemplar, copy]));
for (const request of first.solicitudes) {
	const baseCopy = copyById.get(request.idEjemplar);
	assert.equal(gameById.get(baseCopy?.idJuego ?? -1)?.tipo, 'Juego base');
	if (request.idExpansion) {
		const expansionCopy = copyById.get(request.idExpansion);
		const expansion = gameById.get(expansionCopy?.idJuego ?? -1);
		assert.equal(expansion?.tipo, 'Expansión');
		assert.equal(expansion?.tipo === 'Expansión' ? expansion.idJuegoBase : null, baseCopy?.idJuego);
	}
}

for (const loan of first.prestamos) {
	assert.ok(
		new Date(loan.fechaRetiro).getTime() <=
			(loan.fechaDevolucion ? new Date(loan.fechaDevolucion).getTime() : Infinity)
	);
	assert.ok(
		!loan.fechaRevision ||
			(loan.fechaDevolucion &&
				new Date(loan.fechaDevolucion).getTime() <= new Date(loan.fechaRevision).getTime())
	);
	if (loan.estadoPrestamo === 'Activo') {
		assert.equal(loan.fechaDevolucion, null);
		assert.equal(loan.fechaRevision, null);
	}
}

const activeCopyIds = first.prestamos
	.filter((loan) => loan.estadoPrestamo === 'Activo')
	.flatMap((loan) => {
		const request = first.solicitudes.find(
			(candidate) => candidate.idSolicitud === loan.idSolicitud
		);
		return request
			? [request.idEjemplar, request.idExpansion].filter((id): id is string => id !== null)
			: [];
	});
assert.equal(new Set(activeCopyIds).size, activeCopyIds.length);
for (const copyId of activeCopyIds) {
	assert.equal(copyById.get(copyId)?.estadoEjemplar, 'Prestado');
}

const ludotecaDirectory = fileURLToPath(new URL('../../../static/ludoteca/', import.meta.url));
const localImageNames = readdirSync(ludotecaDirectory, { withFileTypes: true })
	.filter((entry) => entry.isFile())
	.map((entry) => entry.name)
	.sort();
const expectedImageNames = [...SAMPLE_GAME_IMAGES].sort();

assert.deepEqual(
	localImageNames,
	expectedImageNames,
	'Las imágenes locales deben coincidir con SAMPLE_GAME_IMAGES'
);

const storageUrl = 'https://catalogo-ejemplo.supabase.co';
const imageDataset = generateSeedDataset(SEED_PROFILES.medium, 1234, storageUrl);
const imagePrefix = `/storage/v1/object/public/${LUDOTECA_BUCKET}/`;
const allowedImageNames = new Set<string>(SAMPLE_GAME_IMAGES);
const generatedImageNames = new Set<string>();

for (const juego of imageDataset.juegos) {
	if (juego.pathImagen === null) {
		assert.fail(`El juego ${juego.idJuego} no tiene una imagen`);
	}

	const imageUrl = new URL(juego.pathImagen);
	assert.equal(imageUrl.origin, storageUrl);
	assert.equal(
		imageUrl.pathname.startsWith(imagePrefix),
		true,
		`La imagen de ${juego.nombreJuego} no pertenece al bucket ${LUDOTECA_BUCKET}`
	);

	const imageName = decodeURIComponent(imageUrl.pathname.slice(imagePrefix.length));
	assert.equal(
		allowedImageNames.has(imageName),
		true,
		`La imagen ${imageName} no existe en static/ludoteca`
	);
	generatedImageNames.add(imageName);
}

assert.deepEqual(
	[...generatedImageNames].sort(),
	expectedImageNames,
	'El perfil medium debe utilizar todas las imágenes de muestra'
);

console.log('Configuración, factories e imágenes del seed: válidas');
