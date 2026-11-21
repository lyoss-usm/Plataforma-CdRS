import { z } from 'zod';
import {
	integerIdSchema,
	nonEmptyTextSchema,
	nonNegativeIntegerSchema,
	positiveIntegerSchema,
	rolSchema,
	rutSchema,
	telefonoSchema
} from './common.ts';
import { correoInstitucionalSchema, sansanoSchema } from './sansano.ts';

export const STAFF_PAGE_SIZE = 10;

/** Filtros de la nómina, leídos de la URL de `/admin/miembros`. */
export const staffQuerySchema = z.object({
	busqueda: z.string().trim().max(100).default(''),
	idCargo: integerIdSchema.nullable().default(null),
	pagina: positiveIntegerSchema.default(1)
});
export type StaffQuery = z.infer<typeof staffQuerySchema>;

/** Fila de `buscar_staff()`: el sansano, su cargo y el historial que impide eliminarlo. */
export const staffFilaSchema = sansanoSchema.extend({
	nombreCargo: z.string(),
	solicitudes: nonNegativeIntegerSchema,
	prestamos: nonNegativeIntegerSchema,
	suspensiones: nonNegativeIntegerSchema,
	suspendido: z.boolean()
});
export type StaffFila = z.infer<typeof staffFilaSchema>;

export const staffPageSchema = z.object({
	filas: z.array(staffFilaSchema),
	total: nonNegativeIntegerSchema
});
export type StaffPage = z.infer<typeof staffPageSchema>;

/** `rutSansano`/`rolSansano` son inmutables (PK e identidad): no se editan. */
export const editarStaffSchema = z.object({
	rutSansano: rutSchema,
	nombreSansano: nonEmptyTextSchema,
	telefono: telefonoSchema,
	correoInstitucional: correoInstitucionalSchema,
	idCargo: integerIdSchema
});
export type EditarStaffDto = z.infer<typeof editarStaffSchema>;

export const datosAltaStaffSchema = z.object({
	rutSansano: rutSchema,
	digitoVerificador: z.number().int().min(0).max(10),
	rolSansano: rolSchema,
	nombreSansano: nonEmptyTextSchema,
	telefono: telefonoSchema
});

/** Los datos del sansano solo se exigen cuando el correo aún no existe (wiki § 3.2). */
export const invitarStaffSchema = z.object({
	correoInstitucional: correoInstitucionalSchema,
	idCargo: integerIdSchema,
	datos: datosAltaStaffSchema.optional()
});
export type InvitarStaffDto = z.infer<typeof invitarStaffSchema>;

export const rutStaffSchema = z.object({ rutSansano: rutSchema });
