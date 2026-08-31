import { assertLocalDatabaseUrl, parseSeedOptions, seedHelp, wantsHelp } from './config.ts';
import { expectedPersistedCounts, replaceSeedData } from './database.ts';
import { datasetCounts, generateSeedDataset } from './factories.ts';

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	if (wantsHelp(args)) {
		console.log(seedHelp());
		return;
	}

	const options = parseSeedOptions(args);
	const dataset = generateSeedDataset(options.counts, options.seed);
	const generatedCounts = datasetCounts(dataset);

	console.log(
		`Seed local: perfil=${options.profile}, seed=${options.seed}, dryRun=${options.dryRun}`
	);
	console.table(options.counts);
	console.table(generatedCounts);

	if (options.dryRun) {
		console.log('Dry run completado: los datos son válidos y no se abrió una conexión.');
		return;
	}

	assertLocalDatabaseUrl(options.databaseUrl);
	const persistedCounts = await replaceSeedData(options.databaseUrl, dataset);
	assertCounts(expectedPersistedCounts(dataset), persistedCounts);
	console.table(persistedCounts);
	console.log('Seed local reemplazado correctamente.');
}

function assertCounts(expected: Record<string, number>, actual: Record<string, number>): void {
	for (const [entity, expectedCount] of Object.entries(expected)) {
		if (actual[entity] !== expectedCount) {
			throw new Error(
				`${entity}: se esperaban ${expectedCount} filas seed y se encontraron ${actual[entity]}.`
			);
		}
	}
}

main().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`No se pudo generar el seed: ${message}`);
	process.exitCode = 1;
});
