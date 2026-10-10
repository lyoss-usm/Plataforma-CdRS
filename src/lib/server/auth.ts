import { perfilStaffSchema, type CargoStaff, type NombrePermiso } from '$lib/schemas';
import type { AdminRole } from '$lib/stores/adminSession.svelte';
import type { ClienteSupabase } from './supabase';

export interface StaffSesion {
	rut: number;
	nombre: string;
	correo: string;
	rol: AdminRole;
	permisos: NombrePermiso[];
}

const rolPorCargo: Record<CargoStaff, AdminRole> = {
	Junior: 'junior',
	Senior: 'senior',
	Directivo: 'directivo'
};

export function esRutaAdmin(pathname: string): boolean {
	return pathname === '/admin' || pathname.startsWith('/admin/');
}

/**
 * Enlaza la cuenta en su primer ingreso (wiki § 3.2) y resuelve el perfil del staff.
 * Devuelve `null` si el usuario autenticado no pertenece al staff.
 */
export async function obtenerStaff(supabase: ClienteSupabase): Promise<StaffSesion | null> {
	const vinculo = await supabase.rpc('vincular_cuenta_staff');
	if (vinculo.error) {
		throw new Error(`No se pudo vincular la cuenta de staff: ${vinculo.error.message}`);
	}

	const { data, error } = await supabase.rpc('perfil_staff');
	if (error) {
		throw new Error(`No se pudo obtener el perfil de staff: ${error.message}`);
	}

	const fila = Array.isArray(data) ? data[0] : null;
	if (!fila) return null;

	const perfil = perfilStaffSchema.parse(fila);

	return {
		rut: perfil.rutSansano,
		nombre: perfil.nombreSansano,
		correo: perfil.correoInstitucional,
		rol: rolPorCargo[perfil.nombreCargo],
		permisos: perfil.permisos
	};
}

/**
 * Permiso necesario para ver una ruta de `/admin` (espejo de la visibilidad de `admin.ts`).
 * `null` = basta con ser staff. La RLS sigue validando cada operación contra la DB.
 */
export function permisoRequerido(url: URL): NombrePermiso | null {
	const { pathname, searchParams } = url;

	if (pathname.startsWith('/admin/prestamos')) {
		const tipo = searchParams.get('tipo');
		if (tipo === 'general') return 'prestamos:general';
		if (tipo === 'junta') return 'prestamos:junta';
		return null;
	}
	if (pathname.startsWith('/admin/solicitudes')) return 'solicitudes:atender';
	if (pathname.startsWith('/admin/inventario')) return 'inventario:editar';
	if (pathname.startsWith('/admin/miembros') && searchParams.get('tab') === 'moderacion') {
		return 'moderacion:suspender';
	}

	return null;
}

/** Solo rutas internas relativas, para no convertir `/login` en un open redirect. */
export function destinoSeguro(destino: string | null, porDefecto = '/admin'): string {
	if (!destino || !destino.startsWith('/') || destino.startsWith('//') || destino.includes('\\')) {
		return porDefecto;
	}

	return destino;
}
