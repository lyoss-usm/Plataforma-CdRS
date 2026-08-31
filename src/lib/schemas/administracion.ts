import { z } from 'zod';
import {
	integerIdSchema,
	nonEmptyTextSchema,
	nullableTextSchema,
	rutSchema,
	timestampSchema
} from './common.ts';

const suspensionShape = {
	idSuspencion: integerIdSchema,
	rutSansano: rutSchema,
	rutModerador: rutSchema,
	fechaInicio: timestampSchema,
	fechaTermino: timestampSchema.nullable(),
	razon: nonEmptyTextSchema
};

export const suspensionSchema = z.object(suspensionShape);
export type Suspension = z.infer<typeof suspensionSchema>;

const cargoShape = {
	idCargo: integerIdSchema,
	nombreCargo: nonEmptyTextSchema,
	descripcionCargo: nullableTextSchema
};

export const cargoSchema = z.object(cargoShape);
export type Cargo = z.infer<typeof cargoSchema>;

const permisoShape = {
	idPermiso: integerIdSchema,
	nombrePermiso: nonEmptyTextSchema,
	descripcionPermiso: nullableTextSchema
};

export const permisoSchema = z.object(permisoShape);
export type Permiso = z.infer<typeof permisoSchema>;

export const cargoPermisoSchema = z.object({
	idCargo: integerIdSchema,
	idPermiso: integerIdSchema
});
export type CargoPermiso = z.infer<typeof cargoPermisoSchema>;
