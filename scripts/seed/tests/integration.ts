import assert from 'node:assert/strict';
import postgres from 'postgres';
import {
	DEFAULT_DATABASE_URL,
	SEED_ID_END,
	SEED_ID_START,
	assertLocalDatabaseUrl
} from '../config.ts';
import { clearSeedData, expectedPersistedCounts, replaceSeedData } from '../database.ts';
import { generateSeedDataset } from '../factories.ts';

const databaseUrl = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
assertLocalDatabaseUrl(databaseUrl);
const sql = postgres(databaseUrl, { max: 1, connect_timeout: 5 });
const sentinelId = 999_999_999;
const sentinelName = '[MANUAL TEST] Cargo preservado por test-seed-integration';
let sentinelInserted = false;

try {
	const dataset = generateSeedDataset(
		{
			cargos: 3,
			permisos: 6,
			cargoPermisos: 10,
			sansanos: 20,
			suspensiones: 3,
			juegosBase: 8,
			expansiones: 4,
			ejemplaresBase: 12,
			ejemplaresExpansion: 5,
			solicitudes: 16,
			prestamos: 10
		},
		4321
	);
	const expected = expectedPersistedCounts(dataset);

	await replaceSeedData(databaseUrl, dataset);
	const firstSnapshot = await seedSnapshot();

	await sql`
		INSERT INTO "Cargo" ("idCargo", "nombreCargo", "descripcionCargo")
		VALUES (${sentinelId}, ${sentinelName}, 'Registro manual temporal para comprobar aislamiento')
	`;
	sentinelInserted = true;

	const secondCounts = await replaceSeedData(databaseUrl, dataset);
	assert.deepEqual(secondCounts, expected);
	assert.deepEqual(await seedSnapshot(), firstSnapshot);
	assert.equal(
		(await sql`SELECT count(*)::int AS count FROM "Cargo" WHERE "idCargo" = ${sentinelId}`)[0]
			.count,
		1
	);

	const invalidDataset = structuredClone(dataset);
	invalidDataset.cargos[1].nombreCargo = invalidDataset.cargos[0].nombreCargo;
	await assert.rejects(() => replaceSeedData(databaseUrl, invalidDataset));
	assert.deepEqual(
		await seedSnapshot(),
		firstSnapshot,
		'El rollback debe restaurar el seed anterior'
	);

	const [invalidExpansions] = await sql`
		SELECT count(*)::int AS count
		FROM "Juego" expansion
		LEFT JOIN "Juego" base ON base."idJuego" = expansion."idJuegoBase"
		WHERE expansion."idJuego" BETWEEN ${SEED_ID_START} AND ${SEED_ID_END}
		  AND expansion."tipo" = 'Expansión'
		  AND (base."idJuego" IS NULL OR base."tipo" <> 'Juego base')
	`;
	assert.equal(invalidExpansions.count, 0);

	const [invalidLoanDates] = await sql`
		SELECT count(*)::int AS count
		FROM "Prestamo"
		WHERE "idPrestamo" BETWEEN ${SEED_ID_START} AND ${SEED_ID_END}
		  AND (
			("estadoPrestamo" = 'Activo' AND ("fechaDevolucion" IS NOT NULL OR "fechaRevision" IS NOT NULL))
			OR ("fechaDevolucion" IS NOT NULL AND "fechaDevolucion" < "fechaRetiro")
			OR ("fechaRevision" IS NOT NULL AND ("fechaDevolucion" IS NULL OR "fechaRevision" < "fechaDevolucion"))
		  )
	`;
	assert.equal(invalidLoanDates.count, 0);

	const [invalidActiveCopies] = await sql`
		WITH active_copies AS (
			SELECT s."idEjemplar" AS id
			FROM "Prestamo" p JOIN "Solicitud" s USING ("idSolicitud")
			WHERE p."estadoPrestamo" = 'Activo' AND p."idPrestamo" BETWEEN ${SEED_ID_START} AND ${SEED_ID_END}
			UNION ALL
			SELECT s."idExpansion" AS id
			FROM "Prestamo" p JOIN "Solicitud" s USING ("idSolicitud")
			WHERE p."estadoPrestamo" = 'Activo' AND p."idPrestamo" BETWEEN ${SEED_ID_START} AND ${SEED_ID_END}
			  AND s."idExpansion" IS NOT NULL
		)
		SELECT count(*)::int AS count
		FROM active_copies active
		JOIN "Ejemplar" copy ON copy."idEjemplar" = active.id
		WHERE copy."estadoEjemplar" <> 'Prestado'
	`;
	assert.equal(invalidActiveCopies.count, 0);

	const deletedCounts = await clearSeedData(databaseUrl);
	assert.deepEqual(deletedCounts, expected);
	assert.deepEqual(await clearSeedData(databaseUrl), zeroCounts(expected));
	assert.equal(
		(await sql`SELECT count(*)::int AS count FROM "Cargo" WHERE "idCargo" = ${sentinelId}`)[0]
			.count,
		1
	);
	await replaceSeedData(databaseUrl, dataset);

	console.log(
		'Seed integrado: conteos, idempotencia, limpieza, aislamiento, relaciones y rollback válidos'
	);
} finally {
	if (sentinelInserted) {
		await sql`DELETE FROM "Cargo" WHERE "idCargo" = ${sentinelId} AND "nombreCargo" = ${sentinelName}`;
	}
	await sql.end({ timeout: 5 });
}

async function seedSnapshot(): Promise<unknown> {
	return sql`
		SELECT "idJuego", "nombreJuego", "tipo", "idJuegoBase"
		FROM "Juego"
		WHERE "idJuego" BETWEEN ${SEED_ID_START} AND ${SEED_ID_END}
		ORDER BY "idJuego"
	`;
}

function zeroCounts(counts: Record<string, number>): Record<string, number> {
	return Object.fromEntries(Object.keys(counts).map((entity) => [entity, 0]));
}
