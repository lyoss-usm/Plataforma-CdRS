import {
	DEFAULT_DATABASE_URL,
	DEFAULT_SUPABASE_URL,
	assertLocalDatabaseUrl
} from '../seed/config.ts';

export const DATABASE_URL = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
export const SUPABASE_URL = (process.env.SUPABASE_URL ?? DEFAULT_SUPABASE_URL).replace(/\/$/, '');
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? '';

export const PREVIEW_PORT = Number(process.env.AUTH_TEST_PORT ?? 4317);
export const PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}`;

export const PASSWORD_DEV = 'cdrs-dev';

export type RolStaff = 'junior' | 'senior' | 'directivo';

/** Cuentas de supabase/seed.sql. */
export const cuentasDev: Record<RolStaff | 'comun', { correo: string; cargo: string | null }> = {
	junior: { correo: 'dev.junior@usm.cl', cargo: 'Junior' },
	senior: { correo: 'dev.senior@usm.cl', cargo: 'Senior' },
	directivo: { correo: 'dev.directivo@usm.cl', cargo: 'Directivo' },
	comun: { correo: 'dev.comun@usm.cl', cargo: null }
};

export function asegurarEntornoLocal(): void {
	assertLocalDatabaseUrl(DATABASE_URL);

	if (!SUPABASE_ANON_KEY) {
		throw new Error(
			'Falta SUPABASE_ANON_KEY. Ejecuta con `--env-file=.env` (make init crea el .env).'
		);
	}
}
