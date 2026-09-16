import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	if (!event.url.pathname.startsWith('/api/')) {
		return resolve(event);
	}

	const inicio = performance.now();
	let estado = 500;

	try {
		const response = await resolve(event);
		estado = response.status;

		return response;
	} finally {
		const duracion = Math.round(performance.now() - inicio);

		console.info(
			`[API] ${event.request.method} ${event.url.pathname} ${estado} ${duracion}ms`
		);
	}
};