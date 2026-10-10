import { z } from 'zod';
import { nonEmptyTextSchema, rutSchema } from './common.ts';

// Matriz de permisos de la wiki (Flujos del Sistema § 3.3); la autoridad real es la RLS.
export const nombrePermisoSchema = z.enum([
	'prestamos:junta',
	'prestamos:general',
	'prestamos:devolver',
	'solicitudes:atender',
	'inventario:editar',
	'inventario:eliminar',
	'usuarios:gestionar',
	'moderacion:suspender',
	'catalogo:leer'
]);
export type NombrePermiso = z.infer<typeof nombrePermisoSchema>;

export const cargoStaffSchema = z.enum(['Junior', 'Senior', 'Directivo']);
export type CargoStaff = z.infer<typeof cargoStaffSchema>;

/** Fila devuelta por la función `perfil_staff()` de la DB. */
export const perfilStaffSchema = z.object({
	rutSansano: rutSchema,
	nombreSansano: nonEmptyTextSchema,
	correoInstitucional: z.string(),
	nombreCargo: cargoStaffSchema,
	// Permisos fuera de la matriz conocida se ignoran en vez de romper el guard.
	permisos: z
		.array(z.string())
		.transform((permisos) =>
			permisos.filter(
				(permiso): permiso is NombrePermiso => nombrePermisoSchema.safeParse(permiso).success
			)
		)
});
export type PerfilStaff = z.infer<typeof perfilStaffSchema>;

export const loginSchema = z.object({
	correo: z.string().trim().min(1, 'Ingresa tu correo').email('Ingresa un correo válido'),
	password: z.string().min(1, 'Ingresa tu contraseña')
});
export type Login = z.infer<typeof loginSchema>;
