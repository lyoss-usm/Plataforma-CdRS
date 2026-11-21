import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// Swagger UI solo existe con `pnpm dev`; en un build de producción la ruta responde 404.
export const load: PageLoad = () => {
	if (!dev) {
		error(404, 'Not found');
	}
};
