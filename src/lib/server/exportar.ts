import { env } from '$env/dynamic/private';
import { z } from 'zod';
import {
	cargoSchema,
	ejemplarSchema,
	exportDatasetSchema,
	juegoSchema,
	prestamoSchema,
	sansanoSchema,
	solicitudSchema,
	type ExportDataset
} from '$lib/schemas';

type FetchFunction = typeof globalThis.fetch;
type Fila = Record<string, unknown>;
type Resultado = { columnas: string[]; filas: Fila[] };

const MS_DIA = 86_400_000;
const PAGINA = 1000;

// Constante de las tablas de la base de datos
const TABLAS = {
	prestamo: { nombre: 'Prestamo', orden: 'idPrestamo' },
	solicitud: { nombre: 'Solicitud', orden: 'idSolicitud' },
	ejemplar: { nombre: 'Ejemplar', orden: 'idEjemplar' },
	juego: { nombre: 'Juego', orden: 'idJuego' },
	sansano: { nombre: 'Sansano', orden: 'rutSansano' },
	cargo: { nombre: 'Cargo', orden: 'idCargo' }
} as const;

type Tabla = (typeof TABLAS)[keyof typeof TABLAS];

// Obtiene la configuracion de la SUPABASE
function getSupabaseConfig() {
	const url = env.SUPABASE_URL;
	const anonKey = env.SUPABASE_ANON_KEY;

	if (!url || !anonKey) {
		throw new Error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY.');
	}

	return { url: url.replace(/\/$/, ''), anonKey };
}



// Transforma a snake_Case
const aSnakeCase = (nombre: string) => nombre.replace(/([A-Z])/g, '_$1').toLowerCase();

// Transforma las fechas al ISO requerido
const iso = (valor: string | null) => (valor ? new Date(valor).toISOString() : null);


async function leerTabla<S extends z.ZodType>(
	tabla: Tabla,
	schema: S,
	fetchFunction: FetchFunction
): Promise<z.output<S>[]> {
	const { url, anonKey } = getSupabaseConfig();
	const resultado: z.output<S>[] = [];

	for (let offset = 0; ; offset += PAGINA) {
		const response = await fetchFunction(
			`${url}/rest/v1/${tabla.nombre}?select=*&order=${tabla.orden}.asc&limit=${PAGINA}&offset=${offset}`,
			{ headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } }
		);

		if (!response.ok) {
			throw new Error(`Supabase rechazó la exportación de ${tabla.nombre}: HTTP ${response.status}.`);
		}

		const lote = z.array(z.record(z.string(), z.unknown())).parse(await response.json());
		resultado.push(...lote.map((fila) => schema.parse(fila)));

		if (lote.length < PAGINA) break;
	}

	return resultado;
}

// Dataset de los prestamos 
async function prestamos(f: FetchFunction): Promise<Resultado> {
	const datos = await leerTabla(TABLAS.prestamo, prestamoSchema, f);

	return {
		columnas: [...Object.keys(prestamoSchema.shape), 'duracionPrestamoDias'],
		filas: datos.map((p) => {
			const inicio = new Date(p.fechaRetiro).getTime();
			const fin = p.fechaDevolucion ? new Date(p.fechaDevolucion).getTime() : null;

			return {
				...p,
				fechaRetiro: iso(p.fechaRetiro),
				fechaDevolucion: iso(p.fechaDevolucion),
				fechaRevision: iso(p.fechaRevision),
				// null mientras el préstamo siga activo (sin devolución)
				duracionPrestamoDias: fin === null ? null : Math.round(((fin - inicio) / MS_DIA) * 100) / 100
			};
		})
	};
}

// Dataset de las solicitudes
async function solicitudes(f: FetchFunction): Promise<Resultado> {
	const datos = await leerTabla(TABLAS.solicitud, solicitudSchema, f);

	return {
		columnas: Object.keys(solicitudSchema.shape),
		filas: datos.map((s) => ({ ...s, fechaSolicitud: iso(s.fechaSolicitud) }))
	};
}

// Dataset del inventario
async function inventario(f: FetchFunction): Promise<Resultado> {
	const [ejemplares, juegos] = await Promise.all([
		leerTabla(TABLAS.ejemplar, ejemplarSchema, f),
		leerTabla(TABLAS.juego, juegoSchema, f)
	]);
	const juegoPorId = new Map(juegos.map((j) => [j.idJuego, j]));

	return {
		columnas: [
			'idEjemplar',
			'idJuego',
			'nombreJuego',
			'tipo',
			'dificultad',
			'calificacion',
			'duracionJuego',
			'esExterno',
			'estadoCompletitud',
			'estadoEjemplar'
		],
		filas: ejemplares.map((e) => {
			const j = juegoPorId.get(e.idJuego);
			return {
				...e,
				nombreJuego: j?.nombreJuego ?? null,
				tipo: j?.tipo ?? null,
				dificultad: j?.dificultad ?? null,
				calificacion: j?.calificacion ?? null,
				duracionJuego: j?.duracion ?? null
			};
		})
	};
}

// Dataset de la nomina (Excluye datos personales)
async function nomina(f: FetchFunction): Promise<Resultado> {
	const [sansanos, cargos] = await Promise.all([
		leerTabla(TABLAS.sansano, sansanoSchema, f),
		leerTabla(TABLAS.cargo, cargoSchema, f)
	]);
	const cargoPorId = new Map(cargos.map((c) => [c.idCargo, c]));

	return {
		columnas: [
			'rutSansano',
			'digitoVerificador',
			'rolSansano',
			'nombreSansano',
			'correoInstitucional',
			'idCargo',
			'nombreCargo'
		],
		filas: sansanos
			.filter((s) => s.idCargo !== null)
			.map((s) => ({
				...s,
				nombreCargo: s.idCargo === null ? null : (cargoPorId.get(s.idCargo)?.nombreCargo ?? null)
			}))
	};
}

// Mapa que conecta el nombre con su dataset especifico
const GENERADORES: Record<ExportDataset, (f: FetchFunction) => Promise<Resultado>> = {
	prestamos,
	solicitudes,
	inventario,
	nomina
};

// Convierte el texto al formato de las celdas del csv y evita inyecciones
function escapar(valor: unknown): string {
	if (valor === null || valor === undefined) return '';
	if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor);

	let s = String(valor);
	if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // anti inyección de fórmulas (solo texto)

	return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

// Genera un CSV: UTF-8 sin BOM, header snake_case, fechas ISO-8601
export async function generarCSV(
	datasetInput: string,
	fetchFunction: FetchFunction = globalThis.fetch): Promise<{ csv: string; filas: number; dataset: ExportDataset }> {
	const dataset = exportDatasetSchema.parse(datasetInput);
	const { columnas, filas } = await GENERADORES[dataset](fetchFunction);

	const encabezado = columnas.map(aSnakeCase).join(',');
	const cuerpo = filas.map((fila) => columnas.map((c) => escapar(fila[c])).join(','));

	return { csv: [encabezado, ...cuerpo].join('\n') + '\n', filas: filas.length, dataset };
}