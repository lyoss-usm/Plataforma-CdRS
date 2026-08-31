import { Faker, en, es } from '@faker-js/faker';
import type { z } from 'zod';
import {
	cargoPermisoSchema,
	cargoSchema,
	ejemplarSchema,
	juegoSchema,
	permisoSchema,
	prestamoSchema,
	sansanoSchema,
	solicitudSchema,
	suspensionSchema
} from '../../src/lib/schemas/index.ts';
import { DEFAULT_REFERENCE_DATE, SEED_ID_START, type SeedCounts } from './config.ts';

type Cargo = z.infer<typeof cargoSchema>;
type Permiso = z.infer<typeof permisoSchema>;
type CargoPermiso = z.infer<typeof cargoPermisoSchema>;
type Sansano = z.infer<typeof sansanoSchema>;
type Juego = z.infer<typeof juegoSchema>;
type Ejemplar = z.infer<typeof ejemplarSchema>;
type Solicitud = z.infer<typeof solicitudSchema>;
type Prestamo = z.infer<typeof prestamoSchema>;
type Suspension = z.infer<typeof suspensionSchema>;

export interface SeedDataset {
	cargos: Cargo[];
	permisos: Permiso[];
	cargoPermisos: CargoPermiso[];
	sansanos: Sansano[];
	juegos: Juego[];
	ejemplares: Ejemplar[];
	solicitudes: Solicitud[];
	prestamos: Prestamo[];
	suspensiones: Suspension[];
}

const difficulty = ['Fácil', 'Intermedio', 'Difícil'] as const;
const documents = ['Carnet', 'TNE', 'TUI', 'Otro'] as const;
const referenceDate = new Date(DEFAULT_REFERENCE_DATE);

export function generateSeedDataset(counts: SeedCounts, randomSeed: number): SeedDataset {
	const faker = new Faker({ locale: [es, en] });
	faker.seed(randomSeed);
	faker.setDefaultRefDate(referenceDate);

	const cargos = Array.from({ length: counts.cargos }, (_, index) =>
		cargoSchema.parse({
			idCargo: seedId(index),
			nombreCargo: `[SEED] Cargo ${pad(index + 1)} ${faker.word.adjective()}`,
			descripcionCargo: `Cargo ficticio para pruebas: ${faker.lorem.sentence()}`
		})
	);
	const permisos = Array.from({ length: counts.permisos }, (_, index) =>
		permisoSchema.parse({
			idPermiso: seedId(index),
			nombrePermiso: `[SEED] recurso-${pad(index + 1)}:gestionar`,
			descripcionPermiso: `Permiso ficticio para ${faker.word.noun()}`
		})
	);
	const cargoPermisos = createCargoPermisos(cargos, permisos, counts.cargoPermisos);
	const staffCount =
		cargos.length === 0 || counts.sansanos === 0
			? 0
			: Math.max(1, Math.min(counts.sansanos, Math.ceil(counts.sansanos * 0.2)));
	const sansanos = Array.from({ length: counts.sansanos }, (_, index) => {
		const sex = index % 2 === 0 ? 'female' : 'male';
		const firstName = faker.person.firstName(sex);
		const lastName = faker.person.lastName();
		return sansanoSchema.parse({
			rutSansano: 70_000_000 + index,
			rolSansano: 202_600_000 + index,
			digitoVerificador: calculateRutDigit(70_000_000 + index),
			idCargo: index < staffCount ? cargos[index % cargos.length]?.idCargo : null,
			nombreSansano: `${firstName} ${lastName}`,
			telefono: 10_000_000 + index,
			correoInstitucional: `seed.sansano.${pad(index + 1)}@alumnos.usm.cl`,
			authUserId: null
		});
	});

	const baseGames = Array.from({ length: counts.juegosBase }, (_, index) =>
		juegoSchema.parse({
			...gameDetails(faker, index, 'Base'),
			idJuego: seedId(index),
			tipo: 'Juego base',
			idJuegoBase: null
		})
	);
	const expansions = Array.from({ length: counts.expansiones }, (_, index) =>
		juegoSchema.parse({
			...gameDetails(faker, index, 'Expansión'),
			idJuego: seedId(baseGames.length + index),
			tipo: 'Expansión',
			idJuegoBase: baseGames[index % baseGames.length].idJuego
		})
	);

	const baseCopies = Array.from({ length: counts.ejemplaresBase }, (_, index) =>
		createCopy(`SEED-BASE-${pad(index + 1, 6)}`, baseGames[index % baseGames.length].idJuego, index)
	);
	const expansionCopies = Array.from({ length: counts.ejemplaresExpansion }, (_, index) =>
		createCopy(
			`SEED-EXP-${pad(index + 1, 6)}`,
			expansions[index % expansions.length].idJuego,
			index
		)
	);
	const ejemplares = [...baseCopies, ...expansionCopies];
	const loanableBaseCopies = baseCopies.filter(
		(copy) => copy.estadoCompletitud === 'Completo' && copy.estadoEjemplar === 'En bodega'
	);
	const solicitudes = createRequests(
		counts.solicitudes,
		counts.prestamos,
		sansanos,
		loanableBaseCopies,
		expansionCopies,
		expansions
	);
	const prestamos = createLoans(counts.prestamos, solicitudes, sansanos, ejemplares);
	const suspensiones = createSuspensions(counts.suspensiones, sansanos, staffCount, faker);

	return {
		cargos,
		permisos,
		cargoPermisos,
		sansanos,
		juegos: [...baseGames, ...expansions],
		ejemplares,
		solicitudes,
		prestamos,
		suspensiones
	};
}

export function datasetCounts(dataset: SeedDataset): Record<string, number> {
	return {
		Cargo: dataset.cargos.length,
		Permiso: dataset.permisos.length,
		CargoPermiso: dataset.cargoPermisos.length,
		Sansano: dataset.sansanos.length,
		Suspension: dataset.suspensiones.length,
		Juego: dataset.juegos.length,
		Ejemplar: dataset.ejemplares.length,
		Solicitud: dataset.solicitudes.length,
		Prestamo: dataset.prestamos.length
	};
}

function createCargoPermisos(cargos: Cargo[], permisos: Permiso[], count: number): CargoPermiso[] {
	const combinations = cargos.flatMap((cargo) =>
		permisos.map((permiso) => ({ idCargo: cargo.idCargo, idPermiso: permiso.idPermiso }))
	);
	return combinations.slice(0, count).map((value) => cargoPermisoSchema.parse(value));
}

function gameDetails(faker: Faker, index: number, label: string) {
	const playersMin = 1 + (index % 3);
	return {
		nombreJuego: `[SEED] ${label} ${pad(index + 1)}: ${faker.word.adjective()} ${faker.word.noun()}`,
		edadMinima: 8 + (index % 7),
		jugadoresMin: playersMin,
		jugadoresMax: playersMin + 1 + (index % 4),
		duracion: 30 + (index % 8) * 15,
		calificacion: Number((5 + (index % 50) / 10).toFixed(1)),
		dificultad: difficulty[index % difficulty.length],
		pathImagen: `/images/seed/juego-${pad(index + 1)}.webp`,
		manual: `https://example.test/manuales/seed-${index + 1}.pdf`,
		video: `https://example.test/videos/seed-${index + 1}`
	};
}

function createCopy(idEjemplar: string, idJuego: number, index: number): Ejemplar {
	const complete = index % 5 !== 4;
	return ejemplarSchema.parse({
		idEjemplar,
		idJuego,
		esExterno: index % 7 === 6,
		estadoCompletitud: complete ? 'Completo' : 'Incompleto',
		situacion: complete
			? 'Ejemplar ficticio en condiciones de préstamo'
			: 'Ejemplar ficticio por revisar',
		comentarios: complete ? null : 'Falta una pieza ficticia para probar inventario incompleto',
		componentes: 'Caja, manual, cartas, fichas y dados ficticios',
		estadoEjemplar: complete ? 'En bodega' : 'Para revisar'
	});
}

function createRequests(
	count: number,
	loanCount: number,
	sansanos: Sansano[],
	baseCopies: Ejemplar[],
	expansionCopies: Ejemplar[],
	expansions: Juego[]
): Solicitud[] {
	const expansionBaseByGame = new Map(
		expansions
			.filter((game) => game.tipo === 'Expansión')
			.map((game) => [game.idJuego, game.idJuegoBase])
	);
	const compatibleCopiesByBase = new Map<number, Ejemplar[]>();
	for (const copy of expansionCopies) {
		if (copy.estadoCompletitud !== 'Completo' || copy.estadoEjemplar !== 'En bodega') continue;
		const baseId = expansionBaseByGame.get(copy.idJuego);
		if (baseId === undefined) continue;
		const compatible = compatibleCopiesByBase.get(baseId) ?? [];
		compatible.push(copy);
		compatibleCopiesByBase.set(baseId, compatible);
	}

	return Array.from({ length: count }, (_, index) => {
		const baseCopy = baseCopies[index % baseCopies.length];
		const compatibleCopies = compatibleCopiesByBase.get(baseCopy.idJuego) ?? [];
		const compatibleExpansion = compatibleCopies[index % Math.max(compatibleCopies.length, 1)];
		const hasLoan = index < loanCount;
		const nonLoanState = ['Pendiente', 'Rechazada', 'Vencida'] as const;
		const estadoSolicitud = hasLoan
			? 'Aprobada'
			: nonLoanState[(index - loanCount) % nonLoanState.length];
		const selectedOffset = estadoSolicitud === 'Pendiente' ? 2 + (index % 10) : -(2 + (index % 30));
		const selectedDate = addDays(referenceDate, selectedOffset);
		return solicitudSchema.parse({
			idSolicitud: seedId(index),
			rutSansano: sansanos[index % sansanos.length].rutSansano,
			idEjemplar: baseCopy.idEjemplar,
			idExpansion: index % 3 === 0 && compatibleExpansion ? compatibleExpansion.idEjemplar : null,
			fechaSolicitud: addDays(selectedDate, -(1 + (index % 7))).toISOString(),
			fechaSeleccionada: selectedDate.toISOString().slice(0, 10),
			estadoSolicitud
		});
	});
}

function createLoans(
	count: number,
	requests: Solicitud[],
	sansanos: Sansano[],
	copies: Ejemplar[]
): Prestamo[] {
	const staff = sansanos.filter((sansano) => sansano.idCargo !== null);
	const activeCopies = new Set<string>();
	const copyById = new Map(copies.map((copy) => [copy.idEjemplar, copy]));
	return Array.from({ length: count }, (_, index) => {
		const request = requests[index];
		const preferredState = ['Activo', 'Devuelto', 'Cerrado'] as const;
		let estadoPrestamo = preferredState[index % preferredState.length];
		const requestedCopyIds = [request.idEjemplar, request.idExpansion].filter(
			(copyId): copyId is string => copyId !== null
		);
		if (
			estadoPrestamo === 'Activo' &&
			requestedCopyIds.some((copyId) => activeCopies.has(copyId))
		) {
			estadoPrestamo = 'Cerrado';
		}
		if (estadoPrestamo === 'Activo') {
			for (const copyId of requestedCopyIds) {
				activeCopies.add(copyId);
				const copy = copyById.get(copyId);
				if (copy) copy.estadoEjemplar = 'Prestado';
			}
		}

		const withdrawal = new Date(`${request.fechaSeleccionada}T15:00:00.000Z`);
		const returned = addDays(withdrawal, 3 + (index % 5));
		const reviewed = addHours(returned, 2 + (index % 6));
		return prestamoSchema.parse({
			idPrestamo: seedId(index),
			idSolicitud: request.idSolicitud,
			rutPrestador: staff[index % staff.length].rutSansano,
			rutReceptor:
				estadoPrestamo === 'Activo' ? null : staff[(index + 1) % staff.length].rutSansano,
			rutRevisor:
				estadoPrestamo === 'Cerrado' ? staff[(index + 2) % staff.length].rutSansano : null,
			fechaRetiro: withdrawal.toISOString(),
			fechaDevolucion: estadoPrestamo === 'Activo' ? null : returned.toISOString(),
			fechaRevision: estadoPrestamo === 'Cerrado' ? reviewed.toISOString() : null,
			tipoDocumento: index % 4 === 3 ? null : documents[index % documents.length],
			comentarios: index % 4 === 0 ? 'Préstamo ficticio generado automáticamente' : null,
			estadoPrestamo
		});
	});
}

function createSuspensions(
	count: number,
	sansanos: Sansano[],
	staffCount: number,
	faker: Faker
): Suspension[] {
	const staff = sansanos.slice(0, staffCount);
	return Array.from({ length: count }, (_, index) => {
		const moderator = staff[index % staff.length];
		let suspended = sansanos[(staffCount + index) % sansanos.length];
		if (suspended.rutSansano === moderator.rutSansano) {
			suspended = sansanos[(sansanos.indexOf(suspended) + 1) % sansanos.length];
		}
		const start = addDays(referenceDate, -(10 + index));
		return suspensionSchema.parse({
			idSuspencion: seedId(index),
			rutSansano: suspended.rutSansano,
			rutModerador: moderator.rutSansano,
			fechaInicio: start.toISOString(),
			fechaTermino: index % 3 === 0 ? null : addDays(start, 7 + (index % 30)).toISOString(),
			razon: `Suspensión ficticia: ${faker.lorem.sentence()}`
		});
	});
}

function calculateRutDigit(rut: number): number {
	let sum = 0;
	let multiplier = 2;
	for (const digit of String(rut).split('').reverse()) {
		sum += Number(digit) * multiplier;
		multiplier = multiplier === 7 ? 2 : multiplier + 1;
	}
	const result = 11 - (sum % 11);
	if (result === 11) return 0;
	if (result === 10) return 10;
	return result;
}

function seedId(index: number): number {
	return SEED_ID_START + index;
}

function pad(value: number, length = 4): string {
	return String(value).padStart(length, '0');
}

function addDays(date: Date, days: number): Date {
	return new Date(date.getTime() + days * 24 * 60 * 60 * 1_000);
}

function addHours(date: Date, hours: number): Date {
	return new Date(date.getTime() + hours * 60 * 60 * 1_000);
}
