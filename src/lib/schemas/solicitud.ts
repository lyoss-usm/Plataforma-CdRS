import { z } from 'zod';
import {
	dateSchema,
	ejemplarIdSchema,
	integerIdSchema,
	rutSchema,
	timestampSchema
} from './common.ts';
import { estadoSolicitudSchema } from './enums.ts';
import { calcularDigitoVerificador, errorRol, parsearRol } from './identificador.ts';
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
	const mensaje = errorRol(valor);

	if (mensaje !== null) {
		contexto.addIssue({ code: 'custom', message: mensaje });

		return z.NEVER;
	}

	return parsearRol(valor)!;
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
			message: 'Ingresa los 8 dígitos posteriores a +56 9'
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
		.transform(({ rut, rol, ...datos }) => ({
			...datos,
			rutSansano: rut.numero,
			rolSansano: rol,
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
