import { z } from 'zod';
import {
	integerIdSchema,
	nonEmptyTextSchema,
	rolSchema,
	rutSchema,
	telefonoSchema,
	uuidSchema
} from './common.ts';

export const dominiosCorreoInstitucional = [
	'usm.cl',
	'alumnos.usm.cl',
	'sansano.usm.cl',
	'titulados.usm.cl',
	'postgrado.usm.cl',
	'externos.usm.cl'
] as const;

const correoInstitucionalSchema = z
	.string()
	.trim()
	.email()
	.refine(
		(correo) => {
			const dominio = correo.split('@').at(-1)?.toLowerCase();

			return dominiosCorreoInstitucional.some((dominioPermitido) => dominio === dominioPermitido);
		},
		{ message: 'El correo debe pertenecer a un dominio institucional USM permitido' }
	);

const sansanoShape = {
	rutSansano: rutSchema,
	rolSansano: rolSchema,
	digitoVerificador: z.number().int().min(0).max(10),
	idCargo: integerIdSchema.nullable(),
	nombreSansano: nonEmptyTextSchema,
	telefono: telefonoSchema,
	correoInstitucional: correoInstitucionalSchema,
	authUserId: uuidSchema.nullable()
};

export const sansanoSchema = z.object(sansanoShape);
export type Sansano = z.infer<typeof sansanoSchema>;

export const createSansanoSchema = z.object(sansanoShape);
export type CreateSansanoDto = z.infer<typeof createSansanoSchema>;
