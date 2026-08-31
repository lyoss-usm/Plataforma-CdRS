import { parseArgs } from 'node:util';
import { z } from 'zod';

export const DEFAULT_DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
export const DEFAULT_REFERENCE_DATE = '2026-08-30T12:00:00.000Z';
export const DEFAULT_RANDOM_SEED = 20260830;
export const SEED_ID_START = 1_000_000_000;
export const SEED_ID_END = 1_099_999_999;
export const MAX_ENTITY_COUNT = 100_000;

const countsSchema = z.object({
	cargos: z.number().int().min(0).max(MAX_ENTITY_COUNT),
	permisos: z.number().int().min(0).max(MAX_ENTITY_COUNT),
	cargoPermisos: z.number().int().min(0).max(MAX_ENTITY_COUNT),
	sansanos: z.number().int().min(0).max(MAX_ENTITY_COUNT),
	suspensiones: z.number().int().min(0).max(MAX_ENTITY_COUNT),
	juegosBase: z.number().int().min(0).max(MAX_ENTITY_COUNT),
	expansiones: z.number().int().min(0).max(MAX_ENTITY_COUNT),
	ejemplaresBase: z.number().int().min(0).max(MAX_ENTITY_COUNT),
	ejemplaresExpansion: z.number().int().min(0).max(MAX_ENTITY_COUNT),
	solicitudes: z.number().int().min(0).max(MAX_ENTITY_COUNT),
	prestamos: z.number().int().min(0).max(MAX_ENTITY_COUNT)
});

export type SeedCounts = z.infer<typeof countsSchema>;
export type SeedProfile = keyof typeof SEED_PROFILES;

export interface SeedOptions {
	profile: SeedProfile;
	seed: number;
	counts: SeedCounts;
	databaseUrl: string;
	dryRun: boolean;
}

type ParsedCliValues = Partial<Record<keyof SeedCounts, string>> & {
	profile: string;
	seed?: string;
	'database-url'?: string;
	'dry-run': boolean;
	help: boolean;
};

export const SEED_PROFILES = {
	small: {
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
	medium: {
		cargos: 4,
		permisos: 10,
		cargoPermisos: 25,
		sansanos: 100,
		suspensiones: 15,
		juegosBase: 35,
		expansiones: 15,
		ejemplaresBase: 55,
		ejemplaresExpansion: 20,
		solicitudes: 120,
		prestamos: 75
	},
	large: {
		cargos: 6,
		permisos: 18,
		cargoPermisos: 70,
		sansanos: 1_000,
		suspensiones: 120,
		juegosBase: 200,
		expansiones: 80,
		ejemplaresBase: 400,
		ejemplaresExpansion: 120,
		solicitudes: 1_500,
		prestamos: 900
	}
} as const satisfies Record<string, SeedCounts>;

const countOptionNames = Object.keys(SEED_PROFILES.small) as (keyof SeedCounts)[];

const cliOptions = {
	profile: { type: 'string' as const, default: 'small' },
	seed: { type: 'string' as const },
	'database-url': { type: 'string' as const },
	'dry-run': { type: 'boolean' as const, default: false },
	help: { type: 'boolean' as const, short: 'h', default: false },
	...Object.fromEntries(countOptionNames.map((name) => [name, { type: 'string' as const }]))
};

export function parseSeedOptions(
	args: string[],
	env: NodeJS.ProcessEnv = process.env
): SeedOptions {
	const { values: parsedValues } = parseArgs({
		args,
		options: cliOptions,
		strict: true,
		allowPositionals: false
	});
	const values = parsedValues as ParsedCliValues;
	const profile = values.profile;

	if (!isSeedProfile(profile)) {
		throw new Error(`Perfil desconocido: ${String(profile)}. Usa small, medium o large.`);
	}

	const overrides = Object.fromEntries(
		countOptionNames
			.filter((name) => values[name] !== undefined)
			.map((name) => [name, parseNonNegativeInteger(name, values[name])])
	);
	const counts = countsSchema.parse({ ...SEED_PROFILES[profile], ...overrides });
	const seed =
		values.seed === undefined ? DEFAULT_RANDOM_SEED : parseNonNegativeInteger('seed', values.seed);

	validateSeedCounts(counts);

	return {
		profile,
		seed,
		counts,
		databaseUrl: values['database-url'] ?? env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
		dryRun: values['dry-run']
	};
}

export function wantsHelp(args: string[]): boolean {
	return args.includes('--help') || args.includes('-h');
}

export function validateSeedCounts(counts: SeedCounts): void {
	if (counts.cargoPermisos > counts.cargos * counts.permisos) {
		throw new Error('cargoPermisos no puede superar cargos × permisos.');
	}
	if (counts.expansiones > 0 && counts.juegosBase === 0) {
		throw new Error('Para generar expansiones se necesita al menos un juego base.');
	}
	if (counts.ejemplaresBase > 0 && counts.juegosBase === 0) {
		throw new Error('Para generar ejemplares base se necesita al menos un juego base.');
	}
	if (counts.ejemplaresExpansion > 0 && counts.expansiones === 0) {
		throw new Error('Para generar ejemplares de expansión se necesita al menos una expansión.');
	}
	if (counts.solicitudes > 0 && (counts.sansanos === 0 || counts.ejemplaresBase === 0)) {
		throw new Error('Para generar solicitudes se necesitan sansanos y ejemplares base.');
	}
	if (counts.prestamos > counts.solicitudes) {
		throw new Error(
			'prestamos no puede superar solicitudes: cada préstamo usa una solicitud distinta.'
		);
	}
	if ((counts.prestamos > 0 || counts.suspensiones > 0) && counts.cargos === 0) {
		throw new Error('Préstamos y suspensiones necesitan al menos un cargo para identificar staff.');
	}
	if (counts.prestamos > 0 && counts.sansanos === 0) {
		throw new Error('Para generar préstamos se necesita al menos un sansano del staff.');
	}
	if (counts.suspensiones > 0 && counts.sansanos < 2) {
		throw new Error('Para generar suspensiones se necesitan al menos dos sansanos distintos.');
	}
}

export function assertLocalDatabaseUrl(databaseUrl: string): URL {
	let parsed: URL;
	try {
		parsed = new URL(databaseUrl);
	} catch {
		throw new Error('DATABASE_URL no es una URL PostgreSQL válida.');
	}

	const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
	const validProtocol = parsed.protocol === 'postgresql:' || parsed.protocol === 'postgres:';
	if (!validProtocol || !localHosts.has(parsed.hostname) || parsed.port !== '54322') {
		throw new Error('El seed solo puede conectarse a Supabase local en localhost:54322.');
	}
	if (parsed.pathname !== '/postgres') {
		throw new Error('El seed solo puede usar la base local "postgres".');
	}

	return parsed;
}

export function seedHelp(): string {
	return `Uso: pnpm db:seed [opciones]

Opciones:
  --profile <small|medium|large>  Perfil base (default: small)
  --seed <entero>                 Semilla aleatoria reproducible
  --database-url <url>            Conexión Supabase local (o DATABASE_URL)
  --dry-run                       Genera y valida sin conectarse a PostgreSQL
  --<entidad> <cantidad>          Sobrescribe una cantidad del perfil
  -h, --help                      Muestra esta ayuda

Entidades configurables:
  ${countOptionNames.join(', ')}`;
}

function isSeedProfile(value: unknown): value is SeedProfile {
	return typeof value === 'string' && Object.hasOwn(SEED_PROFILES, value);
}

function parseNonNegativeInteger(name: string, value: unknown): number {
	if (typeof value !== 'string' || !/^\d+$/.test(value)) {
		throw new Error(`${name} debe ser un entero no negativo.`);
	}
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed) || parsed > MAX_ENTITY_COUNT) {
		throw new Error(`${name} debe estar entre 0 y ${MAX_ENTITY_COUNT}.`);
	}
	return parsed;
}
