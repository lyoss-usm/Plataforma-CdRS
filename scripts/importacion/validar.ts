import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ZodType } from 'zod';
import { ejemplarSchema } from '../../src/lib/schemas/ejemplar.ts';
import { juegoSchema, type Juego } from '../../src/lib/schemas/juego.ts';

type Issue = { code: string; path: PropertyKey[]; message: string };
type Entidad = 'Juego' | 'Ejemplar';

/** Solo restricciones de almacenamiento: el dominio sigue definido por los schemas Zod. */
function storageIssues(juego: Juego): Issue[] {
	const issues: Issue[] = [];
	for (const campo of ['edadMinima', 'jugadoresMin', 'jugadoresMax', 'duracion'] as const) {
		const valor = juego[campo];
		if (valor !== null && valor > 32_767) {
			issues.push({
				code: 'unrepresentable_sql',
				path: [campo],
				message: 'El valor excede SMALLINT de PostgreSQL (32767)'
			});
		}
	}
	for (const campo of ['idJuego', 'idJuegoBase', 'idBgg'] as const) {
		const valor = juego[campo];
		if (valor !== null && valor > 2_147_483_647) {
			issues.push({
				code: 'unrepresentable_sql',
				path: [campo],
				message: 'El valor excede INTEGER de PostgreSQL (2147483647)'
			});
		}
	}
	if (
		juego.calificacion !== null &&
		Math.round(juego.calificacion * 10) / 10 !== juego.calificacion
	) {
		issues.push({
			code: 'unrepresentable_sql',
			path: ['calificacion'],
			message: 'NUMERIC(3,1) requiere como máximo un decimal, sin redondeo implícito'
		});
	}
	return issues;
}

/** Los índices de errores son base cero y corresponden al lote original. */
export function validatePayload(payload: unknown) {
	if (
		typeof payload !== 'object' ||
		payload === null ||
		!('juegos' in payload) ||
		!('ejemplares' in payload) ||
		!Array.isArray(payload.juegos) ||
		!Array.isArray(payload.ejemplares)
	) {
		throw new Error('La entrada debe contener arrays juegos y ejemplares');
	}
	const errores: { entidad: Entidad; indice: number; issues: Issue[] }[] = [];
	function validate<T>(
		schema: ZodType<T>,
		rows: unknown[],
		entidad: Entidad,
		checkStorage: (value: T) => Issue[]
	): T[] {
		const normalizados: T[] = [];
		rows.forEach((row, indice) => {
			const result = schema.safeParse(row);
			const issues = result.success
				? checkStorage(result.data)
				: result.error.issues.map(({ code, path, message }) => ({ code, path, message }));
			if (issues.length > 0) {
				errores.push({ entidad, indice, issues });
			} else if (result.success) {
				normalizados.push(result.data);
			}
		});
		return normalizados;
	}
	const juegos = validate(juegoSchema, payload.juegos, 'Juego', storageIssues);
	const ejemplares = validate(ejemplarSchema, payload.ejemplares, 'Ejemplar', (ejemplar) =>
		ejemplar.idJuego > 2_147_483_647
			? [
					{
						code: 'unrepresentable_sql',
						path: ['idJuego'],
						message: 'El valor excede INTEGER de PostgreSQL (2147483647)'
					}
				]
			: []
	);
	return { ok: errores.length === 0, juegos, ejemplares, errores };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		const payload: unknown = JSON.parse(readFileSync(0, 'utf8'));
		process.stdout.write(JSON.stringify(validatePayload(payload)));
	} catch {
		process.stderr.write('No se pudo validar el lote: revise JSON y arrays juegos/ejemplares.\n');
		process.exitCode = 1;
	}
}
