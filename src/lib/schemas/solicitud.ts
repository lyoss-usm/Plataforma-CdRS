import { z } from 'zod';
import {
	dateSchema,
	ejemplarIdSchema,
	integerIdSchema,
	rutSchema,
	timestampSchema
} from './common.ts';
import { estadoSolicitudSchema } from './enums.ts';

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
