import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';

// Guía de estados (#24): herramienta de desarrollo, como Swagger; en producción la ruta no existe.
export function load() {
	if (!dev) {
		error(404, 'Not Found');
	}
}
