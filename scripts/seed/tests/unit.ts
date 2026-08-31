import assert from 'node:assert/strict';
import {
	DEFAULT_DATABASE_URL,
	SEED_PROFILES,
	assertLocalDatabaseUrl,
	parseSeedOptions
} from '../config.ts';
import { datasetCounts, generateSeedDataset } from '../factories.ts';

const defaults = parseSeedOptions([]);
assert.equal(defaults.profile, 'small');
assert.deepEqual(defaults.counts, SEED_PROFILES.small);

const overridden = parseSeedOptions(['--profile', 'medium', '--sansanos', '12', '--seed', '42']);
assert.equal(overridden.counts.sansanos, 12);
assert.equal(overridden.counts.juegosBase, SEED_PROFILES.medium.juegosBase);
assert.equal(overridden.seed, 42);

assert.throws(() => parseSeedOptions(['--profile', 'unknown']), /Perfil desconocido/);
assert.throws(() => parseSeedOptions(['--sansanos=-1']), /entero no negativo/);
assert.throws(
	() => parseSeedOptions(['--juegosBase', '0', '--expansiones', '1']),
	/al menos un juego base/
);
assert.throws(
	() => parseSeedOptions(['--solicitudes', '1', '--prestamos', '2']),
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

console.log('Configuración y factories del seed: válidas');
