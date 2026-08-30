import {
	cargoPermisoSchema,
	cargoSchema,
	createEjemplarSchema,
	createJuegoSchema,
	createPrestamoSchema,
	createSansanoSchema,
	createSolicitudSchema,
	juegoSchema,
	permisoSchema,
	suspensionSchema,
	updateJuegoSchema
} from '../../src/lib/schemas/index.ts';

const idEjemplar = 'QR-CATAN-001';
const idExpansion = 'QR-CATAN-EXP-001';
const authUserId = '550e8400-e29b-41d4-a716-446655440002';
const rutSansano = 12345678;
const rutStaff = 87654321;
const fechaRetiro = '2026-05-21T18:30:00-04:00';

const cases = [
	{
		name: 'Juego',
		schema: createJuegoSchema,
		value: {
			nombreJuego: 'Catan',
			tipo: 'Juego base',
			idJuegoBase: null,
			edadMinima: 10,
			jugadoresMin: 3,
			jugadoresMax: 4,
			duracion: 90,
			calificacion: 7.5,
			dificultad: 'Intermedio',
			pathImagen: null,
			manual: null,
			video: null
		}
	},
	{
		name: 'Ejemplar',
		schema: createEjemplarSchema,
		value: {
			idEjemplar,
			idJuego: 1,
			esExterno: false,
			estadoCompletitud: 'Completo',
			situacion: 'Caja en buen estado y cartas enfundadas',
			comentarios: null,
			componentes: 'Tablero, cartas, fichas y dados',
			estadoEjemplar: 'En bodega'
		}
	},
	{
		name: 'Sansano',
		schema: createSansanoSchema,
		value: {
			rutSansano,
			rolSansano: 202612345,
			digitoVerificador: 9,
			idCargo: 1,
			nombreSansano: 'Ada Lovelace',
			telefono: 12345678,
			correoInstitucional: 'ada.lovelace@sansano.usm.cl',
			authUserId
		}
	},
	{
		name: 'Solicitud',
		schema: createSolicitudSchema,
		value: {
			rutSansano,
			idEjemplar,
			idExpansion,
			fechaSolicitud: '2026-05-21T17:45:00-04:00',
			fechaSeleccionada: '2026-05-22',
			estadoSolicitud: 'Pendiente'
		}
	},
	{
		name: 'Prestamo',
		schema: createPrestamoSchema,
		value: {
			idSolicitud: 1,
			rutPrestador: rutStaff,
			rutReceptor: null,
			rutRevisor: null,
			fechaRetiro,
			fechaDevolucion: null,
			fechaRevision: null,
			tipoDocumento: 'TUI',
			comentarios: 'Préstamo registrado durante junta masiva',
			estadoPrestamo: 'Activo'
		}
	},
	{
		name: 'Suspension',
		schema: suspensionSchema,
		value: {
			idSuspencion: 1,
			rutSansano,
			rutModerador: rutStaff,
			fechaInicio: '2026-05-20T10:00:00-04:00',
			fechaTermino: null,
			razon: 'No devolvió un ejemplar en el plazo acordado'
		}
	},
	{
		name: 'Cargo',
		schema: cargoSchema,
		value: {
			idCargo: 1,
			nombreCargo: 'Staff Senior',
			descripcionCargo: 'Puede gestionar préstamos e inventario'
		}
	},
	{
		name: 'Permiso',
		schema: permisoSchema,
		value: {
			idPermiso: 1,
			nombrePermiso: 'inventario:editar',
			descripcionPermiso: 'Permite crear y actualizar juegos y ejemplares'
		}
	},
	{
		name: 'CargoPermiso',
		schema: cargoPermisoSchema,
		value: {
			idCargo: 1,
			idPermiso: 1
		}
	}
];

const invalidCases = [
	{
		name: 'Juego base con idJuegoBase',
		schema: createJuegoSchema,
		value: { ...cases[0].value, idJuegoBase: 2 }
	},
	{
		name: 'Expansión sin idJuegoBase',
		schema: createJuegoSchema,
		value: { ...cases[0].value, tipo: 'Expansión', idJuegoBase: null }
	},
	{
		name: 'Expansión autorreferenciada',
		schema: juegoSchema,
		value: { idJuego: 2, ...cases[0].value, tipo: 'Expansión', idJuegoBase: 2 }
	},
	{
		name: 'Actualización incompleta de clasificación',
		schema: updateJuegoSchema,
		value: { tipo: 'Expansión' }
	},
	{
		name: 'Identificador de ejemplar vacío',
		schema: createEjemplarSchema,
		value: { ...cases[1].value, idEjemplar: '   ' }
	}
];

let hasErrors = false;

for (const testCase of cases) {
	const result = testCase.schema.safeParse(testCase.value);

	if (!result.success) {
		hasErrors = true;
		console.error(`\n${testCase.name}: invalido`);
		console.dir(result.error.format(), { depth: null });
		continue;
	}

	console.log(`${testCase.name}: valido`);
}

for (const testCase of invalidCases) {
	const result = testCase.schema.safeParse(testCase.value);

	if (result.success) {
		hasErrors = true;
		console.error(`\n${testCase.name}: debió ser inválido`);
		continue;
	}

	console.log(`${testCase.name}: inválido según lo esperado`);
}

if (hasErrors) {
	process.exit(1);
}
