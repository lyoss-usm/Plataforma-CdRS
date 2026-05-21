import { z } from 'zod';

export const tipoSchema = z.enum(['Juego Base', 'Expansión']);
export type Tipo = z.infer<typeof tipoSchema>;

export const dificultadSchema = z.enum(['Fácil', 'Intermedio', 'Difícil']);
export type Dificultad = z.infer<typeof dificultadSchema>;

export const completitudSchema = z.enum(['Completo', 'Incompleto']);
export type Completitud = z.infer<typeof completitudSchema>;

export const estadoEjemplarSchema = z.enum([
	'En bodega',
	'Prestado',
	'Perdido',
	'Para revisar',
	'Con su dueño'
]);
export type EstadoEjemplar = z.infer<typeof estadoEjemplarSchema>;

export const estadoSolicitudSchema = z.enum(['Pendiente', 'Aprobada', 'Rechazada', 'Vencida']);
export type EstadoSolicitud = z.infer<typeof estadoSolicitudSchema>;

export const documentoSchema = z.enum(['Carnet', 'TNE', 'TUI', 'Otro']);
export type Documento = z.infer<typeof documentoSchema>;

export const estadoPrestamoSchema = z.enum(['Activo', 'Devuelto', 'Cerrado']);
export type EstadoPrestamo = z.infer<typeof estadoPrestamoSchema>;
