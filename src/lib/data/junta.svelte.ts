import type {
	Documento,
	Ejemplar,
	Juego,
	Prestamo,
	Sansano,
	Solicitud,
	Suspension
} from '$lib/schemas';

export interface FichaBusqueda {
	ejemplar: Ejemplar;
	juego: Juego;
}

export interface PrestamoEnCurso {
	prestamo: Prestamo;
	solicitud: Solicitud;
	ejemplar: Ejemplar;
	juego: Juego;
	sansano: Sansano;
}

export interface DatosAltaSansano {
	nombre: string;
	rut: number;
	digitoVerificador: number;
	rol: number;
	telefono: number;
	correo: string;
}

export type ResultadoPrestar =
	| { ok: true; prestamo: Prestamo; solicitud: Solicitud }
	| {
			ok: false;
			codigo: 'no_existe' | 'no_disponible' | 'suspendido' | 'duplicado' | 'ya_activo';
			motivo: string;
	  };

export const RUT_STAFF = 20554433;

export const QR_DEMO_IDS = ['CAT-001', 'CAT-002', 'EXP-C01', 'DIX-003', 'COD-001'] as const;

const ahora = () => new Date().toISOString();
const hoy = () => new Date().toISOString().slice(0, 10);

export function parsearRut(entrada: string): { rut: number; digitoVerificador: number } | null {
	const sinPuntos = entrada.trim().toLowerCase().replaceAll('.', '');

	if (!/^\d{1,8}-[0-9k]$/.test(sinPuntos)) {
		return null;
	}

	const [cuerpo, dvTexto] = sinPuntos.split('-');

	return {
		rut: Number(cuerpo),
		digitoVerificador: dvTexto === 'k' ? 10 : Number(dvTexto)
	};
}

export function esRutValido(entrada: string): boolean {
	return parsearRut(entrada) !== null;
}

export function formatearRut(rut: number, digitoVerificador: number): string {
	const cuerpo = rut.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
	const digito = digitoVerificador === 10 ? 'K' : `${digitoVerificador}`;

	return `${cuerpo}-${digito}`;
}

const juegos: Juego[] = [
	{
		idJuego: 1,
		tipo: 'Juego base',
		idJuegoBase: null,
		nombreJuego: 'Catan',
		edadMinima: 10,
		jugadoresMin: 3,
		jugadoresMax: 4,
		duracion: 90,
		calificacion: 8.2,
		dificultad: 'Intermedio',
		pathImagen: '/ludoteca/catan.jpg',
		manual: null,
		video: null
	},
	{
		idJuego: 2,
		tipo: 'Expansión',
		idJuegoBase: 1,
		nombreJuego: 'Catan: 5–6 Jugadores',
		edadMinima: 10,
		jugadoresMin: 5,
		jugadoresMax: 6,
		duracion: 120,
		calificacion: 8.0,
		dificultad: 'Intermedio',
		pathImagen: null,
		manual: null,
		video: null
	},
	{
		idJuego: 3,
		tipo: 'Juego base',
		idJuegoBase: null,
		nombreJuego: 'Dixit',
		edadMinima: 8,
		jugadoresMin: 3,
		jugadoresMax: 6,
		duracion: 30,
		calificacion: 7.9,
		dificultad: 'Fácil',
		pathImagen: '/ludoteca/dixit.jpg',
		manual: null,
		video: null
	},
	{
		idJuego: 4,
		tipo: 'Juego base',
		idJuegoBase: null,
		nombreJuego: 'Codenames',
		edadMinima: 14,
		jugadoresMin: 4,
		jugadoresMax: 8,
		duracion: 15,
		calificacion: 7.5,
		dificultad: 'Fácil',
		pathImagen: '/ludoteca/codenames.jpg',
		manual: null,
		video: null
	},
	{
		idJuego: 5,
		tipo: 'Juego base',
		idJuegoBase: null,
		nombreJuego: 'Scythe',
		edadMinima: 14,
		jugadoresMin: 1,
		jugadoresMax: 5,
		duracion: 115,
		calificacion: 9.1,
		dificultad: 'Difícil',
		pathImagen: '/ludoteca/scythe.png',
		manual: null,
		video: null
	},
	{
		idJuego: 6,
		tipo: 'Juego base',
		idJuegoBase: null,
		nombreJuego: 'Ticket to Ride',
		edadMinima: 8,
		jugadoresMin: 2,
		jugadoresMax: 5,
		duracion: 60,
		calificacion: 7.4,
		dificultad: 'Fácil',
		pathImagen: '/ludoteca/ticket-to-ride.jpg',
		manual: null,
		video: null
	},
	{
		idJuego: 7,
		tipo: 'Juego base',
		idJuegoBase: null,
		nombreJuego: 'Pandemic',
		edadMinima: 10,
		jugadoresMin: 2,
		jugadoresMax: 4,
		duracion: 45,
		calificacion: 7.6,
		dificultad: 'Intermedio',
		pathImagen: '/ludoteca/pandemic.jpg',
		manual: null,
		video: null
	},
	{
		idJuego: 8,
		tipo: 'Juego base',
		idJuegoBase: null,
		nombreJuego: 'Gloomhaven',
		edadMinima: 12,
		jugadoresMin: 1,
		jugadoresMax: 4,
		duracion: 120,
		calificacion: 8.8,
		dificultad: 'Difícil',
		pathImagen: '/ludoteca/gloomhaven.jpg',
		manual: null,
		video: null
	}
];

const ejemplaresIniciales: Ejemplar[] = [
	{
		idEjemplar: 'CAT-001',
		idJuego: 1,
		esExterno: false,
		estadoCompletitud: 'Completo',
		situacion: null,
		comentarios: null,
		componentes: null,
		estadoEjemplar: 'En bodega'
	},
	{
		idEjemplar: 'CAT-002',
		idJuego: 1,
		esExterno: false,
		estadoCompletitud: 'Completo',
		situacion: null,
		comentarios: null,
		componentes: null,
		estadoEjemplar: 'En bodega'
	},
	{
		idEjemplar: 'EXP-C01',
		idJuego: 2,
		esExterno: false,
		estadoCompletitud: 'Completo',
		situacion: null,
		comentarios: null,
		componentes: null,
		estadoEjemplar: 'En bodega'
	},
	{
		idEjemplar: 'DIX-003',
		idJuego: 3,
		esExterno: false,
		estadoCompletitud: 'Incompleto',
		situacion: null,
		comentarios: 'Faltan 2 losetas de las fábulas.',
		componentes: null,
		estadoEjemplar: 'En bodega'
	},
	{
		idEjemplar: 'COD-001',
		idJuego: 4,
		esExterno: false,
		estadoCompletitud: 'Completo',
		situacion: null,
		comentarios: null,
		componentes: null,
		estadoEjemplar: 'Prestado'
	},
	{
		idEjemplar: 'SCH-001',
		idJuego: 5,
		esExterno: false,
		estadoCompletitud: 'Completo',
		situacion: null,
		comentarios: null,
		componentes: null,
		estadoEjemplar: 'En bodega'
	},
	{
		idEjemplar: 'PYR-008',
		idJuego: 7,
		esExterno: false,
		estadoCompletitud: 'Completo',
		situacion: null,
		comentarios: null,
		componentes: null,
		estadoEjemplar: 'Para revisar'
	},
	{
		idEjemplar: 'TKT-EXT-01',
		idJuego: 6,
		esExterno: true,
		estadoCompletitud: 'Completo',
		situacion: 'Copia del propietario.',
		comentarios: null,
		componentes: null,
		estadoEjemplar: 'Con su dueño'
	},
	{
		idEjemplar: 'GLO-001',
		idJuego: 8,
		esExterno: false,
		estadoCompletitud: 'Completo',
		situacion: null,
		comentarios: 'Se dio por perdido tras la junta de septiembre.',
		componentes: null,
		estadoEjemplar: 'Perdido'
	}
];

const sofia: Sansano = {
	rutSansano: 12345678,
	rolSansano: 1234567,
	digitoVerificador: 9,
	idCargo: null,
	nombreSansano: 'Sofía Muñoz',
	telefono: 912345678,
	correoInstitucional: 'sofia.munoz@alumnos.usm.cl',
	authUserId: null
};

const tomas: Sansano = {
	rutSansano: 98765432,
	rolSansano: 7654321,
	digitoVerificador: 1,
	idCargo: null,
	nombreSansano: 'Tomás Herrera',
	telefono: 987654321,
	correoInstitucional: 'tomas.herrera@usm.cl',
	authUserId: null
};

const suspensionTomas: Suspension = {
	idSuspencion: 1,
	rutSansano: 98765432,
	rutModerador: 11111111,
	fechaInicio: '2026-09-10T00:00:00.000Z',
	fechaTermino: '2026-12-31T23:59:59.000Z',
	razon: 'No devolvió el préstamo anterior y no respondió los avisos del club.'
};

class Meson {
	sansanos = $state<Sansano[]>([sofia, tomas]);
	suspensiones = $state<Suspension[]>([suspensionTomas]);
	ejemplares = $state<Ejemplar[]>([...ejemplaresIniciales]);
	prestamos = $state<Prestamo[]>([]);
	solicitudes = $state<Solicitud[]>([]);

	sansanoPorRut(rutSansano: number): Sansano | null {
		return this.sansanos.find((s) => s.rutSansano === rutSansano) ?? null;
	}

	ejemplarConJuego(idEjemplar: string): FichaBusqueda | null {
		const ejemplar = this.ejemplares.find((e) => e.idEjemplar === idEjemplar);

		if (!ejemplar) {
			return null;
		}

		const juego = juegos.find((j) => j.idJuego === ejemplar.idJuego);

		return juego ? { ejemplar, juego } : null;
	}

	suspensionActiva(rutSansano: number): Suspension | null {
		const hoyIso = hoy();

		return (
			this.suspensiones.find(
				(s) =>
					s.rutSansano === rutSansano &&
					s.fechaInicio <= hoyIso &&
					(s.fechaTermino === null || s.fechaTermino >= hoyIso)
			) ?? null
		);
	}

	private contextoDe(prestamo: Prestamo): PrestamoEnCurso | null {
		const solicitud = this.solicitudes.find((s) => s.idSolicitud === prestamo.idSolicitud);

		if (!solicitud) {
			return null;
		}

		const ficha = this.ejemplarConJuego(solicitud.idEjemplar);
		const sansano = this.sansanoPorRut(solicitud.rutSansano);

		if (!ficha || !sansano) {
			return null;
		}

		return { prestamo, solicitud, ejemplar: ficha.ejemplar, juego: ficha.juego, sansano };
	}

	prestamoActivoDePersona(rutSansano: number): PrestamoEnCurso | null {
		for (const prestamo of this.prestamos) {
			if (prestamo.estadoPrestamo !== 'Activo') {
				continue;
			}

			const solicitud = this.solicitudes.find((s) => s.idSolicitud === prestamo.idSolicitud);

			if (solicitud && solicitud.rutSansano === rutSansano) {
				return this.contextoDe(prestamo);
			}
		}

		return null;
	}

	prestamoActivoPorEjemplar(idEjemplar: string): PrestamoEnCurso | null {
		for (const prestamo of this.prestamos) {
			if (prestamo.estadoPrestamo !== 'Activo') {
				continue;
			}

			const solicitud = this.solicitudes.find((s) => s.idSolicitud === prestamo.idSolicitud);

			if (solicitud && solicitud.idEjemplar === idEjemplar) {
				return this.contextoDe(prestamo);
			}
		}

		return null;
	}

	crearSansano(datos: DatosAltaSansano): Sansano {
		const nuevo: Sansano = {
			rutSansano: datos.rut,
			rolSansano: datos.rol,
			digitoVerificador: datos.digitoVerificador,
			idCargo: null,
			nombreSansano: datos.nombre,
			telefono: datos.telefono,
			correoInstitucional: datos.correo,
			authUserId: null
		};

		this.sansanos.push(nuevo);

		return nuevo;
	}

	crearPrestamoJunta(opts: {
		idEjemplar: string;
		rutSansano: number;
		documento: Documento;
		rutPrestador?: number;
	}): ResultadoPrestar {
		const ficha = this.ejemplarConJuego(opts.idEjemplar);

		if (!ficha) {
			return { ok: false, codigo: 'no_existe', motivo: 'El código no existe en el catálogo.' };
		}

		if (ficha.ejemplar.estadoEjemplar !== 'En bodega') {
			return {
				ok: false,
				codigo: 'no_disponible',
				motivo: `El ejemplar está «${ficha.ejemplar.estadoEjemplar}» y no puede prestarse.`
			};
		}

		const suspension = this.suspensionActiva(opts.rutSansano);

		if (suspension) {
			return {
				ok: false,
				codigo: 'suspendido',
				motivo: `Sansano suspendido: ${suspension.razon}`
			};
		}

		const solicitudPrevia = this.solicitudes.find((s) => s.idEjemplar === opts.idEjemplar);

		if (
			solicitudPrevia &&
			this.prestamos.some(
				(p) => p.estadoPrestamo === 'Activo' && p.idSolicitud === solicitudPrevia.idSolicitud
			)
		) {
			return {
				ok: false,
				codigo: 'duplicado',
				motivo: 'El ejemplar ya tiene un préstamo activo.'
			};
		}

		const activoPersona = this.prestamoActivoDePersona(opts.rutSansano);

		if (activoPersona) {
			return {
				ok: false,
				codigo: 'ya_activo',
				motivo: `${activoPersona.sansano.nombreSansano} ya tiene un préstamo activo: ${activoPersona.juego.nombreJuego} (${activoPersona.ejemplar.idEjemplar}).`
			};
		}

		const idSolicitud = this.solicitudes.length + 10000;
		const solicitud: Solicitud = {
			idSolicitud,
			rutSansano: opts.rutSansano,
			idEjemplar: opts.idEjemplar,
			idExpansion: null,
			fechaSolicitud: ahora(),
			fechaSeleccionada: hoy(),
			estadoSolicitud: 'Aprobada'
		};

		const idPrestamo = this.prestamos.length + 10000;
		const prestamo: Prestamo = {
			idPrestamo,
			idSolicitud,
			rutPrestador: opts.rutPrestador ?? RUT_STAFF,
			rutReceptor: null,
			rutRevisor: null,
			fechaRetiro: ahora(),
			fechaDevolucion: null,
			fechaRevision: null,
			tipoDocumento: opts.documento,
			comentarios: null,
			estadoPrestamo: 'Activo'
		};

		ficha.ejemplar.estadoEjemplar = 'Prestado';
		this.solicitudes.push(solicitud);
		this.prestamos.push(prestamo);

		return { ok: true, solicitud, prestamo };
	}

	terminarPrestamo(idPrestamo: number, rutReceptor: number): Prestamo | null {
		const prestamo = this.prestamos.find(
			(p) => p.idPrestamo === idPrestamo && p.estadoPrestamo === 'Activo'
		);

		if (!prestamo) {
			return null;
		}

		prestamo.estadoPrestamo = 'Devuelto';
		prestamo.fechaDevolucion = ahora();
		prestamo.rutReceptor = rutReceptor;

		const solicitud = this.solicitudes.find((s) => s.idSolicitud === prestamo.idSolicitud);

		if (solicitud) {
			const ejemplar = this.ejemplares.find((e) => e.idEjemplar === solicitud.idEjemplar);

			if (ejemplar) {
				ejemplar.estadoEjemplar = 'Para revisar';
			}
		}

		return prestamo;
	}
}

export const meson = new Meson();
