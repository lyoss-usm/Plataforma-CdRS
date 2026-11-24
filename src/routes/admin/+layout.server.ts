import { error } from '@sveltejs/kit';
import { flags } from '$lib/flags';
import { rutaApagada } from '$lib/schemas/flags';
import { permisoRequerido } from '$lib/server/auth';
import type { LayoutServerLoad } from './$types';

export const prerender = false;

// Autorización de /admin/* (la autenticación la hace hooks.server.ts). Se lanza aquí y no en el
// hook para que el 403 se muestre con src/routes/+error.svelte.
export const load: LayoutServerLoad = async ({ locals, url }) => {
	const { staff } = locals;

	if (!staff) {
		error(403, 'Tu cuenta no pertenece al staff del Club de Rol Sansano.');
	}

	const permiso = permisoRequerido(url);
	if (permiso && !staff.permisos.includes(permiso)) {
		error(403, 'Tu cargo no tiene acceso a esta sección del panel.');
	}

	// Módulo apagado en este despliegue (#40): la ruta no existe, sin importar el cargo.
	if (rutaApagada(url, flags)) {
		error(404, 'Not Found');
	}

	return { staff };
};
