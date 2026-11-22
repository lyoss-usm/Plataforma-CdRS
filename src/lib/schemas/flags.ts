import { z } from 'zod';

/**
 * Módulos que se pueden apagar por despliegue (#40). Cada uno se controla con la variable
 * `PUBLIC_FLAG_<MODULO>` (`1` encendido, `0` apagado); si falta, queda encendido.
 */
export const modulos = [
	'catalogo',
	'formulario',
	'solicitudes',
	'inventario',
	'moderacion',
	'bgg'
] as const;

export type Modulo = (typeof modulos)[number];

export const variableDeModulo = (modulo: Modulo) => `PUBLIC_FLAG_${modulo.toUpperCase()}` as const;

const flagSchema = z
	.enum(['0', '1'], { error: 'Debe ser 1 (encendido) o 0 (apagado)' })
	.default('1')
	.transform((valor) => valor === '1');

export const flagsSchema = z
	.object(
		Object.fromEntries(modulos.map((modulo) => [variableDeModulo(modulo), flagSchema])) as Record<
			ReturnType<typeof variableDeModulo>,
			typeof flagSchema
		>
	)
	.transform(
		(variables) =>
			Object.fromEntries(
				modulos.map((modulo) => [modulo, variables[variableDeModulo(modulo)]])
			) as Record<Modulo, boolean>
	);

export type Flags = z.output<typeof flagsSchema>;

/**
 * Módulo al que pertenece una ruta (páginas y endpoints). `null` = no depende de ningún flag.
 * Formulario de solicitud: también vive dentro del catálogo (`onPedir` de `GameCard`).
 */
export function moduloDeRuta(url: Pick<URL, 'pathname' | 'searchParams'>): Modulo | null {
	const { pathname, searchParams } = url;
	const bajo = (prefijo: string) => pathname === prefijo || pathname.startsWith(`${prefijo}/`);

	if (bajo('/catalogo') || bajo('/api/catalogo')) return 'catalogo';
	if (bajo('/api/solicitudes')) return 'formulario';
	if (bajo('/admin/solicitudes')) return 'solicitudes';
	if (bajo('/admin/inventario')) return 'inventario';
	if (bajo('/admin/bgg')) return 'bgg';
	if (bajo('/admin/miembros') && searchParams.get('tab') === 'moderacion') return 'moderacion';

	return null;
}

/** Una ruta está apagada si su módulo lo está (el formulario además depende del catálogo). */
export function rutaApagada(url: Pick<URL, 'pathname' | 'searchParams'>, flags: Flags): boolean {
	const modulo = moduloDeRuta(url);
	if (modulo === null) return false;
	if (modulo === 'formulario') return !flags.formulario || !flags.catalogo;

	return !flags[modulo];
}
