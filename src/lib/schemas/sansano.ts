import { z } from 'zod';
import {
	integerIdSchema,
	nonEmptyTextSchema,
	rolSchema,
	rutSchema,
	telefonoSchema,
	uuidSchema
} from './common.ts';

const sansanoShape = {
	rutSansano: rutSchema,
	rolSansano: rolSchema,
	digitoVerificador: z.number().int().min(0).max(10),
	idCargo: integerIdSchema.nullable(),
	nombreSansano: nonEmptyTextSchema,
	telefono: telefonoSchema,
	correoInstitucional: z.string().trim().email(),
	authUserId: uuidSchema.nullable()
};

export const sansanoSchema = z.object(sansanoShape);
export type Sansano = z.infer<typeof sansanoSchema>;

export const createSansanoSchema = z.object(sansanoShape);
export type CreateSansanoDto = z.infer<typeof createSansanoSchema>;
