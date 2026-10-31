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

export const correoInstitucionalSchema = z
	.string()
	.trim()
	.email('Ingresa un correo electrónico válido')
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

/**
 * Rol USM: 9 dígitos + dígito verificador, con o sin guion (`202012345-6` o `2020123456`).
 * Devuelve el rol sin verificador, que es lo que guarda `Sansano.rolSansano`.
 * Se exigen los 9 dígitos para no confundir un rol sin verificador con uno que lo trae pegado.
 */
export function parsearRol(entrada: string): number | null {
	const coincidencia = /^(\d{9})-?[\dk]$/i.exec(entrada.trim());

	return coincidencia ? Number(coincidencia[1]) : null;
}

/** Alta rápida desde el cajero (§ 1.3): sansano común, sin cargo ni cuenta. */
export const altaSansanoSchema = createSansanoSchema.omit({ idCargo: true, authUserId: true });
export type AltaSansanoDto = z.infer<typeof altaSansanoSchema>;
