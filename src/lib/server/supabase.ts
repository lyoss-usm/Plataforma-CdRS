import { env } from '$env/dynamic/private';
import { createServerClient } from '@supabase/ssr';
import type { RequestEvent } from '@sveltejs/kit';

function getSupabaseConfig() {
	const url = env.SUPABASE_URL;
	const anonKey = env.SUPABASE_ANON_KEY;

	if (!url || !anonKey) {
		throw new Error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY.');
	}

	return { url, anonKey };
}

/**
 * Cliente de Supabase por request con la sesión del usuario en cookies. Usa la anon key: todo lo
 * que haga queda sujeto a las políticas RLS del usuario autenticado (o de anon).
 */
export function crearClienteSupabase(event: RequestEvent) {
	const { url, anonKey } = getSupabaseConfig();

	return createServerClient(url, anonKey, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookies, headers) => {
				for (const { name, value, options } of cookies) {
					event.cookies.set(name, value, { ...options, path: '/' });
				}

				// Evita que un CDN cachee una respuesta con tokens de sesión.
				try {
					event.setHeaders(headers);
				} catch {
					// La cabecera ya fue fijada en esta respuesta.
				}
			}
		}
	});
}

export type ClienteSupabase = ReturnType<typeof crearClienteSupabase>;
