import {
	cargoPermisoSchema,
	cargoSchema,
	catalogGameSchema,
	catalogPageSchema,
	catalogQuerySchema,
	calcularDigitoVerificador,
	crearSolicitudWebSchema,
	createEjemplarSchema,
	createJuegoSchema,
	createPrestamoSchema,
	createSansanoSchema,
	createSolicitudSchema,
	errorRol,
	formatearIdentificador,
	juegoSchema,
	opcionesSolicitudWebSchema,
	normalizarTelefono,
	parsearRol,
	permisoSchema,
	respuestaErrorSolicitudWebSchema,
	solicitudWebCreadaSchema,
	suspensionSchema,
	updateJuegoSchema
} from '../../src/lib/schemas/index.ts';

const idEjemplar = 'QR-CATAN-001';
const idExpansion = 'QR-CATAN-EXP-001';
const authUserId = '550e8400-e29b-41d4-a716-446655440002';
const rutSansano = 12345678;
const rutStaff = 87654321;
const fechaRetiro = '2026-05-21T18:30:00-04:00';

const solicitudWebSchema = crearSolicitudWebSchema();

const solicitudWebValida = {
	idJuego: '1',
	idJuegoExpansion: '2',
	nombreSansano: '  Ada   Lovelace  ',
	rut: '18585543-0',
	rol: '202612345-6',
	telefono: '1234 5678',
	correoInstitucional: 'ada.lovelace@alumnos.usm.cl',
	bloqueRetiro: 'martes',
	aceptaTerminos: 'on'
};

const catalogGame = {
	idJuego: 1,
	nombreJuego: 'Catan',
	tipo: 'Juego base' as const,
	idJuegoBase: null,
	edadMinima: 10,
	jugadoresMin: 3,
	jugadoresMax: 4,
	duracion: 90,
	calificacion: 7.5,
	dificultad: 'Intermedio' as const,
	pathImagen: '/ludoteca/catan.jpg',
	manual: null,
	video: null,
	disponible: true
};

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
	},
	{
		name: 'Juego del catálogo',
		schema: catalogGameSchema,
		value: catalogGame
	},
	{
		name: 'Consulta del catálogo',
		schema: catalogQuerySchema,
		value: {
			nombre: 'catan',
			jugadores: 4,
			duracionMax: 120,
			disponible: true,
			calificacionMin: 7
		}
	},
	{
		name: 'Página del catálogo',
		schema: catalogPageSchema,
		value: {
			juegos: [catalogGame],
			total: 1,
			hayMas: false
		}
	},
	{
		name: 'Formulario público de solicitud',
		schema: solicitudWebSchema,
		value: solicitudWebValida
	},
	{
		name: 'Opciones del formulario de solicitud',
		schema: opcionesSolicitudWebSchema,
		value: {
			expansiones: [{ idJuego: 2, nombreJuego: 'Navegantes de Catan' }]
		}
	},
	{
		name: 'Respuesta de solicitud creada',
		schema: solicitudWebCreadaSchema,
		value: { idSolicitud: 1 }
	},
	{
		name: 'Error del formulario de solicitud',
		schema: respuestaErrorSolicitudWebSchema,
		value: {
			message: 'Revisa los datos del formulario.',
			issues: [{ path: ['rut'], message: 'Ingresa un RUT válido' }]
		}
	}
];

const invalidCases = [
	{
		name: 'Rango de duración invertido',
		schema: catalogQuerySchema,
		value: {
			duracionMin: 120,
			duracionMax: 30
		}
	},
	{
		name: 'Página del catálogo demasiado grande',
		schema: catalogQuerySchema,
		value: {
			limit: 100
		}
	},
	{
		name: 'Disponibilidad ausente',
		schema: catalogGameSchema,
		value: {
			...catalogGame,
			disponible: undefined
		}
	},
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
	},
	{
		name: 'Formulario con RUT inválido',
		schema: solicitudWebSchema,
		value: {
			...solicitudWebValida,
			rut: '18585543-1'
		}
	},
	{
		name: 'Formulario con dígito verificador de ROL inválido',
		schema: solicitudWebSchema,
		value: {
			...solicitudWebValida,
			rol: '202612345-9'
		}
	},
	{
		name: 'Formulario con teléfono inválido',
		schema: solicitudWebSchema,
		value: {
			...solicitudWebValida,
			telefono: '1234567'
		}
	},
	{
		name: 'Formulario sin bloque de retiro',
		schema: solicitudWebSchema,
		value: {
			...solicitudWebValida,
			bloqueRetiro: ''
		}
	},
	{
		name: 'Formulario sin aceptación de términos',
		schema: solicitudWebSchema,
		value: {
			...solicitudWebValida,
			aceptaTerminos: undefined
		}
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

const formularioConCorreoInvalido = solicitudWebSchema.safeParse({
	...solicitudWebValida,
	correoInstitucional: 'correo-invalido'
});

if (
	formularioConCorreoInvalido.success ||
	!formularioConCorreoInvalido.error.issues.some(
		(issue) =>
			issue.path[0] === 'correoInstitucional' &&
			issue.message === 'Ingresa un correo electrónico válido'
	)
) {
	hasErrors = true;
	console.error('El correo inválido no produjo el mensaje esperado en español');
}

const formularioSinBloque = solicitudWebSchema.safeParse({
	...solicitudWebValida,
	bloqueRetiro: ''
});

if (
	formularioSinBloque.success ||
	!formularioSinBloque.error.issues.some(
		(issue) =>
			issue.path[0] === 'bloqueRetiro' &&
			issue.message === 'Selecciona uno de los bloques de retiro disponibles'
	)
) {
	hasErrors = true;
	console.error('El bloque vacío no produjo el mensaje esperado en español');
}

if (calcularDigitoVerificador('18585543') !== '0') {
	hasErrors = true;
	console.error('El cálculo del dígito verificador no produjo el resultado esperado');
}

if (formatearIdentificador('18.585.5430') !== '18585543-0') {
	hasErrors = true;
	console.error('El autoformato del identificador no produjo el resultado esperado');
}

if (parsearRol('202612345-6') !== 202612345 || parsearRol('2026123456') !== 202612345) {
	hasErrors = true;
	console.error('No se reconoció un ROL válido con y sin guion');
}

if (parsearRol('202612345-9') !== null || errorRol('202612345-9') === null) {
	hasErrors = true;
	console.error('No se rechazó un ROL con dígito verificador inválido');
}

if (parsearRol('12345-6') !== null || errorRol('12345-6') === null) {
	hasErrors = true;
	console.error('No se rechazó un ROL con menos de 9 dígitos');
}

if (formatearIdentificador('2026.12345-6', 10) !== '202612345-6') {
	hasErrors = true;
	console.error('El autoformato del ROL no produjo el resultado esperado');
}

if (normalizarTelefono('+56 9 1234 5678') !== '12345678') {
	hasErrors = true;
	console.error('La normalización del teléfono no dejó solo los 8 dígitos finales');
}

if (hasErrors) {
	process.exit(1);
}
