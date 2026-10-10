import { error } from '@sveltejs/kit';
import { permisoRequerido } from '$lib/server/auth';
import type { LayoutServerLoad } from './$types';

export const prerender = false;

export const load: LayoutServerLoad = async ({ locals, url }) => {
    const { staff } = locals;

    if (!staff) {
        error(403, 'Tu cuenta no pertenece al staff del Club de Rol Sansano.');
    }

    const permiso = permisoRequerido(url);
    if (permiso && !staff.permisos.includes(permiso)) {
        error(403, 'Tu cargo no tiene acceso a esta sección del panel.');
    }

    return { staff };
};