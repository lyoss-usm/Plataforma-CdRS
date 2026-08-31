import postgres, { type TransactionSql } from 'postgres';
import { SEED_ID_END, SEED_ID_START, assertLocalDatabaseUrl } from './config.ts';
import { datasetCounts, type SeedDataset } from './factories.ts';

const BATCH_SIZE = 500;

export async function clearSeedData(databaseUrl: string): Promise<Record<string, number>> {
	assertLocalDatabaseUrl(databaseUrl);
	const sql = postgres(databaseUrl, { max: 1, connect_timeout: 5 });

	try {
		return await sql.begin((tx) => deletePreviousSeed(tx));
	} finally {
		await sql.end({ timeout: 5 });
	}
}

export async function replaceSeedData(
	databaseUrl: string,
	dataset: SeedDataset
): Promise<Record<string, number>> {
	assertLocalDatabaseUrl(databaseUrl);
	const sql = postgres(databaseUrl, { max: 1, connect_timeout: 5 });

	try {
		await sql.begin(async (tx) => {
			await deletePreviousSeed(tx);
			await insertDataset(tx, dataset);
		});
		return await countPersistedSeed(sql);
	} finally {
		await sql.end({ timeout: 5 });
	}
}

async function deletePreviousSeed(tx: TransactionSql): Promise<Record<string, number>> {
	const prestamo =
		await tx`DELETE FROM "Prestamo" WHERE "idPrestamo" BETWEEN ${SEED_ID_START} AND ${SEED_ID_END}`;
	const suspension =
		await tx`DELETE FROM "Suspension" WHERE "idSuspencion" BETWEEN ${SEED_ID_START} AND ${SEED_ID_END}`;
	const solicitud =
		await tx`DELETE FROM "Solicitud" WHERE "idSolicitud" BETWEEN ${SEED_ID_START} AND ${SEED_ID_END}`;
	const ejemplar = await tx`DELETE FROM "Ejemplar" WHERE "idEjemplar" LIKE 'SEED-%'`;
	const cargoPermiso =
		await tx`DELETE FROM "CargoPermiso" WHERE "idCargo" BETWEEN ${SEED_ID_START} AND ${SEED_ID_END} OR "idPermiso" BETWEEN ${SEED_ID_START} AND ${SEED_ID_END}`;
	const sansano =
		await tx`DELETE FROM "Sansano" WHERE "correoInstitucional" LIKE 'seed.sansano.%@alumnos.usm.cl'`;
	const expansion =
		await tx`DELETE FROM "Juego" WHERE "idJuego" BETWEEN ${SEED_ID_START} AND ${SEED_ID_END} AND "tipo" = 'Expansión'`;
	const juegoBase =
		await tx`DELETE FROM "Juego" WHERE "idJuego" BETWEEN ${SEED_ID_START} AND ${SEED_ID_END}`;
	const cargo =
		await tx`DELETE FROM "Cargo" WHERE "idCargo" BETWEEN ${SEED_ID_START} AND ${SEED_ID_END}`;
	const permiso =
		await tx`DELETE FROM "Permiso" WHERE "idPermiso" BETWEEN ${SEED_ID_START} AND ${SEED_ID_END}`;

	return {
		Cargo: cargo.count,
		Permiso: permiso.count,
		CargoPermiso: cargoPermiso.count,
		Sansano: sansano.count,
		Suspension: suspension.count,
		Juego: expansion.count + juegoBase.count,
		Ejemplar: ejemplar.count,
		Solicitud: solicitud.count,
		Prestamo: prestamo.count
	};
}

async function insertDataset(tx: TransactionSql, dataset: SeedDataset): Promise<void> {
	await insertBatches(tx, 'Cargo', dataset.cargos);
	await insertBatches(tx, 'Permiso', dataset.permisos);
	await insertBatches(tx, 'CargoPermiso', dataset.cargoPermisos);
	await insertBatches(tx, 'Sansano', dataset.sansanos);
	await insertBatches(
		tx,
		'Juego',
		dataset.juegos.filter((game) => game.tipo === 'Juego base')
	);
	await insertBatches(
		tx,
		'Juego',
		dataset.juegos.filter((game) => game.tipo === 'Expansión')
	);
	await insertBatches(tx, 'Ejemplar', dataset.ejemplares);
	await insertBatches(tx, 'Solicitud', dataset.solicitudes);
	await insertBatches(tx, 'Prestamo', dataset.prestamos);
	await insertBatches(tx, 'Suspension', dataset.suspensiones);
}

async function insertBatches(tx: TransactionSql, table: string, rows: object[]): Promise<void> {
	for (let start = 0; start < rows.length; start += BATCH_SIZE) {
		const batch = rows.slice(start, start + BATCH_SIZE);
		if (batch.length === 0) continue;
		await tx`INSERT INTO ${tx(table)} ${tx(batch)}`;
	}
}

async function countPersistedSeed(sql: postgres.Sql): Promise<Record<string, number>> {
	const [cargo, permiso, cargoPermiso, sansano, suspension, juego, ejemplar, solicitud, prestamo] =
		await Promise.all([
			sql`SELECT count(*)::int AS count FROM "Cargo" WHERE "idCargo" BETWEEN ${SEED_ID_START} AND ${SEED_ID_END}`,
			sql`SELECT count(*)::int AS count FROM "Permiso" WHERE "idPermiso" BETWEEN ${SEED_ID_START} AND ${SEED_ID_END}`,
			sql`SELECT count(*)::int AS count FROM "CargoPermiso" WHERE "idCargo" BETWEEN ${SEED_ID_START} AND ${SEED_ID_END}`,
			sql`SELECT count(*)::int AS count FROM "Sansano" WHERE "correoInstitucional" LIKE 'seed.sansano.%@alumnos.usm.cl'`,
			sql`SELECT count(*)::int AS count FROM "Suspension" WHERE "idSuspencion" BETWEEN ${SEED_ID_START} AND ${SEED_ID_END}`,
			sql`SELECT count(*)::int AS count FROM "Juego" WHERE "idJuego" BETWEEN ${SEED_ID_START} AND ${SEED_ID_END}`,
			sql`SELECT count(*)::int AS count FROM "Ejemplar" WHERE "idEjemplar" LIKE 'SEED-%'`,
			sql`SELECT count(*)::int AS count FROM "Solicitud" WHERE "idSolicitud" BETWEEN ${SEED_ID_START} AND ${SEED_ID_END}`,
			sql`SELECT count(*)::int AS count FROM "Prestamo" WHERE "idPrestamo" BETWEEN ${SEED_ID_START} AND ${SEED_ID_END}`
		]);

	return {
		Cargo: cargo[0].count,
		Permiso: permiso[0].count,
		CargoPermiso: cargoPermiso[0].count,
		Sansano: sansano[0].count,
		Suspension: suspension[0].count,
		Juego: juego[0].count,
		Ejemplar: ejemplar[0].count,
		Solicitud: solicitud[0].count,
		Prestamo: prestamo[0].count
	};
}

export function expectedPersistedCounts(dataset: SeedDataset): Record<string, number> {
	return datasetCounts(dataset);
}
