import { z } from 'zod';
import {
	dateSchema,
	ejemplarIdSchema,
	integerIdSchema,
	rutSchema,
	timestampSchema
} from './common.ts';
import { estadoSolicitudSchema } from './enums.ts';
import { correoInstitucionalSchema } from './sansano.ts';

const solicitudShape = {
	idSolicitud: integerIdSchema,
	rutSansano: rutSchema,
	idEjemplar: ejemplarIdSchema,
	idExpansion: ejemplarIdSchema.nullable(),
	fechaSolicitud: timestampSchema,
	fechaSeleccionada: dateSchema,
	estadoSolicitud: estadoSolicitudSchema
};

export const solicitudSchema = z.object(solicitudShape);
export type Solicitud = z.infer<typeof solicitudSchema>;

export const createSolicitudSchema = z.object(solicitudShape).omit({ idSolicitud: true });
export type CreateSolicitudDto = z.infer<typeof createSolicitudSchema>;

interface IdentificadorNormalizado {
	numero: number;
	numeroTexto: string;
	digitoVerificador: number;
	digitoVerificadorTexto: string;
}

const MAX_RUT_DATABASE = 2_147_483_647;

export const MENSAJE_DIGITO_VERIFICADOR_DISTINTO =
	'El RUT y el ROL deben tener el mismo dígito verificador';

export function calcularDigitoVerificador(numero: string): string {
	let suma = 0;
	let multiplicador = 2;

	for (let indice = numero.length - 1; indice >= 0; indice -= 1) {
		suma += Number(numero[indice]) * multiplicador;
		multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
	}

	const resto = suma % 11;

	if (resto === 0) {
		return '0';
	}

	if (resto === 1) {
		return 'K';
	}

	return String(11 - resto);
}

function descomponerIdentificador(valor: string, maximo: number): IdentificadorNormalizado | null {
	const limpio = valor
		.trim()
		.toUpperCase()
		.replace(/[.\s-]/g, '');

	if (!/^\d+[0-9K]$/.test(limpio)) {
		return null;
	}

	const numeroTexto = limpio.slice(0, -1);
	const digitoVerificadorTexto = limpio.at(-1)!;
	const numero = Number(numeroTexto);

	if (!Number.isSafeInteger(numero) || numero <= 0 || numero > maximo) {
		return null;
	}

	return {
		numero,
		numeroTexto,
		digitoVerificador: digitoVerificadorTexto === 'K' ? 10 : Number(digitoVerificadorTexto),
		digitoVerificadorTexto
	};
}

export function formatearIdentificador(valor: string): string {
	const limpio = valor.toUpperCase().replace(/[^0-9K]/g, '');

	if (limpio.length <= 1) {
		return limpio;
	}

	const digitoVerificador = limpio.at(-1)!;
	const numero = limpio.slice(0, -1).replaceAll('K', '');

	return `${numero}-${digitoVerificador}`;
}

export function digitosVerificadoresCoinciden(rutIngresado: string, rolIngresado: string) {
	const rut = descomponerIdentificador(rutIngresado, MAX_RUT_DATABASE);
	const rol = descomponerIdentificador(rolIngresado, Number.MAX_SAFE_INTEGER);

	if (
		rut === null ||
		rol === null ||
		calcularDigitoVerificador(rut.numeroTexto) !== rut.digitoVerificadorTexto
	) {
		return null;
	}

	return rut.digitoVerificador === rol.digitoVerificador;
}

const rutFormularioSchema = z.string().transform((valor, contexto) => {
	const rut = descomponerIdentificador(valor, MAX_RUT_DATABASE);

	if (rut === null || calcularDigitoVerificador(rut.numeroTexto) !== rut.digitoVerificadorTexto) {
		contexto.addIssue({
			code: 'custom',
			message: 'Ingresa un RUT válido'
		});

		return z.NEVER;
	}

	return rut;
});

const rolFormularioSchema = z.string().transform((valor, contexto) => {
	const rol = descomponerIdentificador(valor, Number.MAX_SAFE_INTEGER);

	if (rol === null) {
		contexto.addIssue({
			code: 'custom',
			message: 'Ingresa un ROL válido'
		});

		return z.NEVER;
	}

	return rol;
});

const nombreFormularioSchema = z
	.string()
	.transform((nombre) => nombre.trim().replace(/\s+/g, ' '))
	.pipe(
		z.string().min(1, 'Ingresa tu nombre').max(120, 'El nombre no puede superar los 120 caracteres')
	);

const telefonoFormularioSchema = z.string().transform((valor, contexto) => {
	const telefonoNormalizado = valor.replace(/\s/g, '');

	if (!/^\d{8}$/.test(telefonoNormalizado)) {
		contexto.addIssue({
			code: 'custom',
			message: 'Ingresa los 8 dígitos posteriores a +569'
		});

		return z.NEVER;
	}

	return Number(telefonoNormalizado);
});

const idExpansionFormularioSchema = z.preprocess(
	(valor) => (valor === '' || valor === undefined ? null : valor),
	z.coerce.number().int().positive().nullable()
);

const aceptaTerminosSchema = z
	.string()
	.optional()
	.refine((valor) => valor === 'on', {
		message: 'Debes aceptar los Términos y Condiciones'
	})
	.transform(() => true as const);

export const BLOQUES_RETIRO = [
	{
		valor: 'martes',
		etiqueta: 'Martes Bloque Libre (12:30 - 13:40)'
	},
	{
		valor: 'jueves',
		etiqueta: 'Jueves Bloque Libre (12:30 - 13:40)'
	}
] as const;

export const bloqueRetiroSchema = z.enum(['martes', 'jueves'], {
	error: 'Selecciona uno de los bloques de retiro disponibles'
});
export type BloqueRetiro = z.infer<typeof bloqueRetiroSchema>;

export function crearSolicitudWebSchema() {
	return z
		.object({
			idJuego: z.coerce.number().int().positive(),
			idJuegoExpansion: idExpansionFormularioSchema,
			nombreSansano: nombreFormularioSchema,
			rut: rutFormularioSchema,
			rol: rolFormularioSchema,
			telefono: telefonoFormularioSchema,
			correoInstitucional: correoInstitucionalSchema,
			bloqueRetiro: bloqueRetiroSchema,
			aceptaTerminos: aceptaTerminosSchema
		})
		.superRefine((datos, contexto) => {
			if (datos.rut.digitoVerificador !== datos.rol.digitoVerificador) {
				contexto.addIssue({
					code: 'custom',
					path: ['rol'],
					message: MENSAJE_DIGITO_VERIFICADOR_DISTINTO
				});
			}
		})
		.transform(({ rut, rol, ...datos }) => ({
			...datos,
			rutSansano: rut.numero,
			rolSansano: rol.numero,
			digitoVerificador: rut.digitoVerificador
		}));
}

export type SolicitudWebInput = z.input<ReturnType<typeof crearSolicitudWebSchema>>;
export type SolicitudWebData = z.output<ReturnType<typeof crearSolicitudWebSchema>>;

export const fechaRetiroDisponibleSchema = z.object({
	fechaSeleccionada: dateSchema,
	etiqueta: z.string().min(1)
});
export type FechaRetiroDisponible = z.infer<typeof fechaRetiroDisponibleSchema>;

export const expansionSolicitudSchema = z.object({
	idJuego: integerIdSchema,
	nombreJuego: z.string().min(1)
});
export type ExpansionSolicitud = z.infer<typeof expansionSolicitudSchema>;

export const opcionesSolicitudWebSchema = z.object({
	expansiones: z.array(expansionSolicitudSchema)
});
export type OpcionesSolicitudWeb = z.infer<typeof opcionesSolicitudWebSchema>;

export const solicitudWebCreadaSchema = z.object({
	idSolicitud: integerIdSchema
});
export type SolicitudWebCreada = z.infer<typeof solicitudWebCreadaSchema>;

export const respuestaErrorSolicitudWebSchema = z.object({
	message: z.string().min(1),
	field: z.string().optional(),
	issues: z
		.array(
			z.object({
				path: z.array(z.union([z.string(), z.number()])),
				message: z.string().min(1)
			})
		)
		.optional()
});
export type RespuestaErrorSolicitudWeb = z.infer<typeof respuestaErrorSolicitudWebSchema>;
