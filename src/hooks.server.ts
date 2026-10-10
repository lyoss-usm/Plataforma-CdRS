import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/environment';
import { esRutaAdmin, obtenerStaff } from '$lib/server/auth';
import { crearClienteSupabase } from '$lib/server/supabase';

const supabase: Handle = async ({ event, resolve }) => {
	// Al prerenderizar no hay sesión ni cookies (y puede faltar el .env en CI).
	if (building) {
		return resolve(event);
	}

	event.locals.supabase = crearClienteSupabase(event);
	event.locals.staff = null;

	return resolve(event, {
		filterSerializedResponseHeaders: (name) =>
			name === 'content-range' || name === 'x-supabase-api-version'
	});
};

// Autenticación de /admin/*: valida el JWT contra Supabase Auth (getUser, no getSession) y
// resuelve el staff. La autorización por ruta (403) vive en src/routes/admin/+layout.server.ts.
const guardAdmin: Handle = async ({ event, resolve }) => {
	if (!esRutaAdmin(event.url.pathname)) {
		return resolve(event);
	}

	const {
		data: { user }
	} = await event.locals.supabase.auth.getUser();

	if (!user) {
		const destino = `${event.url.pathname}${event.url.search}`;
		redirect(303, `/login?redirectTo=${encodeURIComponent(destino)}`);
	}

	event.locals.staff = await obtenerStaff(event.locals.supabase);

	return resolve(event);
};

const registroApi: Handle = async ({ event, resolve }) => {
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

		console.info(`[API] ${event.request.method} ${event.url.pathname} ${estado} ${duracion}ms`);
	}
};

export const handle = sequence(supabase, guardAdmin, registroApi);
