import { json, redirect, type Handle, type ServerInit } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { building, dev } from '$app/environment';
import { flags } from '$lib/flags';
import { paginasConFlag, rutaApagada } from '$lib/schemas/flags';
import { esRutaAdmin, obtenerStaff } from '$lib/server/auth';
import { bggMockActivo } from '$lib/server/bgg';
import { crearClienteSupabase } from '$lib/server/supabase';

// Un mock (`*_MOCK`) reemplaza un servicio externo por datos de prueba. No se bloquea en producción
// porque los tests de auth corren sobre un build real (`vite preview`), pero se avisa en los logs.
export const init: ServerInit = () => {
	if (!dev && !building && bggMockActivo()) {
		console.warn(
			'[BGG] BGG_MOCK=1 en un build de producción: el proxy responde con fixtures, no con BGG.'
		);
	}
};

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

// Rutas de módulos apagados (#40): 404 como si no existieran. Las páginas (`paginasConFlag`) lo
// responden desde su load para usar src/routes/+error.svelte; un `error()` lanzado aquí mostraría la
// página genérica de SvelteKit.
const flagsApagados: Handle = async ({ event, resolve }) => {
	if (!paginasConFlag.has(event.url.pathname) && rutaApagada(event.url, flags)) {
		return json({ message: 'Not Found' }, { status: 404 });
	}

	return resolve(event);
};

export const handle = sequence(supabase, registroApi, flagsApagados, guardAdmin);
