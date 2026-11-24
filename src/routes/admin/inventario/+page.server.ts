import { error } from '@sveltejs/kit';
import { cargarInventario } from '$lib/server/inventario';
import type { PageServerLoad } from './$types';

export const prerender = false;

// El permiso `inventario:editar` lo exige admin/+layout.server.ts (permisoRequerido).
export const load: PageServerLoad = async ({ locals }) => {
	try {
		return { inventario: await cargarInventario(locals.supabase) };
	} catch (e) {
		console.error('No se pudo cargar el inventario:', e);
		error(500, 'No se pudo cargar el inventario.');
	}
};
