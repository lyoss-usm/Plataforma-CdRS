import { DEFAULT_DATABASE_URL } from './config.ts';
import { clearSeedData } from './database.ts';

async function main(): Promise<void> {
	const databaseUrl = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
	const deletedCounts = await clearSeedData(databaseUrl);

	console.table(deletedCounts);
	console.log('Datos generados por el seed eliminados correctamente.');
}

main().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`No se pudieron limpiar los datos seed: ${message}`);
	process.exitCode = 1;
});
